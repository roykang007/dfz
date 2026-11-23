import crypto from 'crypto';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  buildMembersWorkbookBuffer,
  buildProductsWorkbookBuffer,
  parseMembersWorkbookBuffer,
  parseProductsWorkbookBuffer,
} from './server/excelHelper.ts';
import { SPRING_BOOT_BLUEPRINT_FILES } from './server/springBootBlueprint.ts';
import {
  appendShipmentEventRecord,
  bulkUpsertMembers,
  bulkUpsertProducts,
  computeAdminAnalytics,
  createMemberRecord,
  createProductRecord,
  deleteMemberRecord,
  deleteProductRecord,
  findMemberByEmail,
  findOrderForTracking,
  getPublicProductById,
  getSiteConfig,
  isOrderStatus,
  listAdminMembers,
  listAdminOrders,
  listAdminProducts,
  listPublicProducts,
  OrderValidationError,
  placeOrderTransactional,
  registerPublicMember,
  saveSiteConfig,
  updateMemberRecord,
  updateProductRecord,
} from './src/db/repository.ts';
import { GENERATED_IMAGES } from './src/db/seedData.ts';
import { isBootstrapAdminEmail } from './src/db/users.ts';
import { DEFAULT_SITE_CONFIG } from './src/lib/defaultSiteConfig.ts';
import {
  normalizePhoneDigits,
  phonesMatchTimingSafe,
  signMemberSessionToken,
} from './src/lib/memberSession.ts';
import {
  optionalAuth,
  requireAdmin,
  requireAuth,
  type AuthRequest,
} from './src/middleware/auth.ts';
import type {
  CategoryItem,
  DeliveryMethod,
  FooterLinkItem,
  HeaderMenuActionType,
  HeaderMenuItem,
  Language,
  LocalizedText,
  MemberRole,
  MemberTier,
  PaymentMethod,
  Product,
  ProductCategory,
  ProofStripItem,
  SiteConfig,
  StoryMetricItem,
} from './src/types.ts';

const PORT = 3000;
const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploads');
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB
const MAX_EXCEL_BYTES = 3 * 1024 * 1024; // 3 MB

const CATEGORY_SLUG_RE = /^[a-z0-9_-]{2,32}$/;
const VALID_ACTION_TYPES: HeaderMenuActionType[] = ['section', 'view', 'category', 'url'];
const VALID_VIEWS = ['storefront', 'tracking', 'admin'];
const VALID_PAYMENTS: PaymentMethod[] = [
  'FPS',
  'OCTOPUS',
  'PAYME',
  'ALIPAY_HK',
  'WECHAT_PAY_HK',
  'CARD',
];
const VALID_DELIVERY: DeliveryMethod[] = ['SF_DOOR', 'SF_LOCKER', 'CENTRAL_PICKUP'];
const VALID_LANGS: Language[] = ['zh', 'en', 'ko'];
const VALID_TIERS: MemberTier[] = ['SILVER', 'GLACIER_GOLD', 'CRYO_VIP'];
const VALID_MEMBER_ROLES: MemberRole[] = ['MEMBER', 'ADMIN'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lightweight sliding-window rate limiter for public auth routes
const authAttempts = new Map<string, number[]>();
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 25;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (authAttempts.get(key) || []).filter((ts) => now - ts < AUTH_WINDOW_MS);
  if (timestamps.length >= AUTH_MAX_ATTEMPTS) {
    authAttempts.set(key, timestamps);
    return true;
  }
  timestamps.push(now);
  authAttempts.set(key, timestamps);
  return false;
}

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function sanitizeLocalized(input: unknown, fallback = '', maxLen = 600): LocalizedText {
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const zh = sanitizeText(obj.zh, maxLen);
    const en = sanitizeText(obj.en, maxLen);
    const ko = sanitizeText(obj.ko, maxLen);
    const first = zh || en || ko || fallback;
    return {
      zh: zh || first,
      en: en || first,
      ko: ko || first,
    };
  }
  const str = sanitizeText(input, maxLen) || fallback;
  return { zh: str, en: str, ko: str };
}

function isValidCategorySlug(slug: string): boolean {
  return slug !== 'all' && CATEGORY_SLUG_RE.test(slug);
}

function sanitizeNavigationTarget(actionType: HeaderMenuActionType, rawTarget: unknown): string | null {
  const target = sanitizeText(rawTarget, 240);
  if (!target) return null;
  if (actionType === 'section') {
    const normalized = target.startsWith('#') ? target : `#${target}`;
    return /^#[a-zA-Z0-9_-]{1,40}$/.test(normalized) ? normalized : null;
  }
  if (actionType === 'view') {
    return VALID_VIEWS.includes(target) ? target : null;
  }
  if (actionType === 'category') {
    const slug = target.toLowerCase();
    return slug === 'all' || CATEGORY_SLUG_RE.test(slug) ? slug : null;
  }
  if (actionType === 'url') {
    try {
      const parsed = new URL(target);
      return parsed.protocol === 'https:' ? parsed.toString() : null;
    } catch {
      return null;
    }
  }
  return null;
}

function isSafeImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/src/assets/images/') && !url.includes('..')) {
    return true;
  }
  if (/^\/uploads\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(url)) {
    return true;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeSiteConfigPayload(body: Record<string, unknown>, current: SiteConfig): SiteConfig {
  const utilityStrip = body.utilityStrip
    ? sanitizeLocalized(body.utilityStrip, current.utilityStrip.en, 240)
    : current.utilityStrip;

  // 1. Categories (1..20 unique valid slugs, 'all' reserved)
  let categories: CategoryItem[] = current.categories;
  if (Array.isArray(body.categories)) {
    const seen = new Set<string>();
    const parsed: CategoryItem[] = [];
    for (const raw of body.categories.slice(0, 20)) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      const slug = sanitizeText(item.slug, 32).toLowerCase();
      if (!isValidCategorySlug(slug) || seen.has(slug)) continue;
      const label = sanitizeLocalized(item.label, slug, 60);
      if (!label.en) continue;
      seen.add(slug);
      parsed.push({ slug, label });
    }
    if (parsed.length > 0) {
      categories = parsed;
    }
  }

  // 2. Header Menu (1..10 items)
  let headerMenu: HeaderMenuItem[] = current.headerMenu;
  if (Array.isArray(body.headerMenu)) {
    const parsed: HeaderMenuItem[] = [];
    const seenIds = new Set<string>();
    for (const raw of body.headerMenu.slice(0, 10)) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      const actionType = VALID_ACTION_TYPES.includes(item.actionType as HeaderMenuActionType)
        ? (item.actionType as HeaderMenuActionType)
        : 'section';
      const target = sanitizeNavigationTarget(actionType, item.target);
      if (!target) continue;
      const label = sanitizeLocalized(item.label, '', 48);
      if (!label.en) continue;
      let id = sanitizeText(item.id, 48).replace(/[^a-zA-Z0-9_-]/g, '') || `nav-${crypto.randomBytes(3).toString('hex')}`;
      if (seenIds.has(id)) id = `${id}-${crypto.randomBytes(2).toString('hex')}`;
      seenIds.add(id);
      parsed.push({
        id,
        label,
        actionType,
        target,
        visible: item.visible !== false,
      });
    }
    if (parsed.length > 0) {
      headerMenu = parsed;
    }
  }

  // 3. Hero Section
  const rawHero = body.hero && typeof body.hero === 'object' ? (body.hero as Record<string, unknown>) : null;
  let proofItems: ProofStripItem[] = current.hero.proofItems;
  if (rawHero && Array.isArray(rawHero.proofItems)) {
    const parsedProof: ProofStripItem[] = [];
    for (const raw of rawHero.proofItems.slice(0, 6)) {
      if (!raw || typeof raw !== 'object') continue;
      const p = raw as Record<string, unknown>;
      const label = sanitizeLocalized(p.label, '', 80);
      const value = sanitizeLocalized(p.value, '', 80);
      if (label.en || value.en) {
        parsedProof.push({ label, value });
      }
    }
    if (parsedProof.length > 0) proofItems = parsedProof;
  }
  const heroImageCandidate = rawHero ? sanitizeText(rawHero.imageUrl, 512) : '';
  const hero: SiteConfig['hero'] = rawHero
    ? {
        kicker: sanitizeLocalized(rawHero.kicker, current.hero.kicker.en, 160),
        headline: sanitizeLocalized(rawHero.headline, current.hero.headline.en, 180),
        subhead: sanitizeLocalized(rawHero.subhead, current.hero.subhead.en, 600),
        ctaPrimary: sanitizeLocalized(rawHero.ctaPrimary, current.hero.ctaPrimary.en, 60),
        ctaSecondary: sanitizeLocalized(rawHero.ctaSecondary, current.hero.ctaSecondary.en, 60),
        imageUrl: isSafeImageUrl(heroImageCandidate) ? heroImageCandidate : current.hero.imageUrl,
        imagePosition: rawHero.imagePosition === 'left' ? 'left' : 'right',
        proofItems,
      }
    : current.hero;

  // 4. Catalog Section Header
  const rawCatSec =
    body.catalogSection && typeof body.catalogSection === 'object'
      ? (body.catalogSection as Record<string, unknown>)
      : null;
  const catalogSection: SiteConfig['catalogSection'] = rawCatSec
    ? {
        title: sanitizeLocalized(rawCatSec.title, current.catalogSection.title.en, 120),
        description: sanitizeLocalized(rawCatSec.description, current.catalogSection.description.en, 400),
      }
    : current.catalogSection;

  // 5. Bottom Story / Atelier Section
  const rawStory = body.story && typeof body.story === 'object' ? (body.story as Record<string, unknown>) : null;
  let storyMetrics: StoryMetricItem[] = current.story.metrics;
  if (rawStory && Array.isArray(rawStory.metrics)) {
    const parsedMetrics: StoryMetricItem[] = [];
    for (const raw of rawStory.metrics.slice(0, 4)) {
      if (!raw || typeof raw !== 'object') continue;
      const m = raw as Record<string, unknown>;
      const title = sanitizeLocalized(m.title, '', 80);
      const description = sanitizeLocalized(m.description, '', 220);
      if (title.en || description.en) {
        parsedMetrics.push({ title, description });
      }
    }
    storyMetrics = parsedMetrics;
  }
  const storyImageCandidate = rawStory ? sanitizeText(rawStory.imageUrl, 512) : '';
  const story: SiteConfig['story'] = rawStory
    ? {
        visible: rawStory.visible !== false,
        kicker: sanitizeLocalized(rawStory.kicker, current.story.kicker.en, 160),
        title: sanitizeLocalized(rawStory.title, current.story.title.en, 180),
        body1: sanitizeLocalized(rawStory.body1, current.story.body1.en, 800),
        body2: sanitizeLocalized(rawStory.body2, current.story.body2.en, 800),
        imageUrl: isSafeImageUrl(storyImageCandidate) ? storyImageCandidate : current.story.imageUrl,
        imagePosition: rawStory.imagePosition === 'right' ? 'right' : 'left',
        metrics: storyMetrics,
      }
    : current.story;

  // 6. Footer Section
  const rawFooter = body.footer && typeof body.footer === 'object' ? (body.footer as Record<string, unknown>) : null;
  let footerLinks: FooterLinkItem[] = current.footer.links;
  if (rawFooter && Array.isArray(rawFooter.links)) {
    const parsedLinks: FooterLinkItem[] = [];
    const seenIds = new Set<string>();
    for (const raw of rawFooter.links.slice(0, 10)) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      const actionType = VALID_ACTION_TYPES.includes(item.actionType as HeaderMenuActionType)
        ? (item.actionType as HeaderMenuActionType)
        : 'section';
      const target = sanitizeNavigationTarget(actionType, item.target);
      if (!target) continue;
      const label = sanitizeLocalized(item.label, '', 48);
      if (!label.en) continue;
      let id = sanitizeText(item.id, 48).replace(/[^a-zA-Z0-9_-]/g, '') || `ft-${crypto.randomBytes(3).toString('hex')}`;
      if (seenIds.has(id)) id = `${id}-${crypto.randomBytes(2).toString('hex')}`;
      seenIds.add(id);
      parsedLinks.push({ id, label, actionType, target });
    }
    footerLinks = parsedLinks;
  }
  const footer: SiteConfig['footer'] = rawFooter
    ? {
        brandTitle: sanitizeText(rawFooter.brandTitle, 80) || DEFAULT_SITE_CONFIG.footer.brandTitle,
        tagline: sanitizeLocalized(rawFooter.tagline, current.footer.tagline.en, 240),
        businessHours: sanitizeLocalized(rawFooter.businessHours, current.footer.businessHours.en, 120),
        contactEmail: sanitizeText(rawFooter.contactEmail, 120) || current.footer.contactEmail,
        contactPhone: sanitizeText(rawFooter.contactPhone, 48) || current.footer.contactPhone,
        paymentNotice: sanitizeText(rawFooter.paymentNotice, 180),
        rights: sanitizeLocalized(rawFooter.rights, current.footer.rights.en, 180),
        links: footerLinks,
      }
    : current.footer;

  return {
    utilityStrip,
    headerMenu,
    hero,
    catalogSection,
    categories,
    story,
    footer,
  };
}

function detectImageTypeFromMagicBytes(buf: Buffer): { ext: 'jpg' | 'png' | 'webp'; mime: string } | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }
  // WebP: RIFF....WEBP
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

function generatePaymentRef(method: PaymentMethod): string {
  const rand = crypto.randomInt(1000, 9999);
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const prefixMap: Record<PaymentMethod, string> = {
    FPS: 'FPS-HK',
    OCTOPUS: 'OCT-HK',
    PAYME: 'PAYME-HSBC',
    ALIPAY_HK: 'ALIPAYHK',
    WECHAT_PAY_HK: 'WXPAYHK',
    CARD: 'CARD-3DS2',
  };
  return `${prefixMap[method]}-${datePart}-${rand}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Safe read-only static handler for uploaded product images
  app.get('/uploads/:filename', (req: Request, res: Response) => {
    const filename = sanitizeText(req.params.filename, 120);
    if (!/^[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(filename)) {
      res.status(400).json({ error: 'Invalid file name.' });
      return;
    }
    const resolved = path.resolve(UPLOAD_DIR, filename);
    if (!resolved.startsWith(UPLOAD_DIR + path.sep) || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }
    const ext = path.extname(filename).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(resolved);
  });

  // ---------------------------------------------------------------------------
  // PUBLIC STOREFRONT API (/api/v1/*)
  // ---------------------------------------------------------------------------

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', service: 'dufreez-hk-commerce', currency: 'HKD' });
  });

  app.get('/api/v1/site-config', async (_req: Request, res: Response) => {
    try {
      const config = await getSiteConfig();
      res.json({ config });
    } catch (error) {
      console.error('GET /api/v1/site-config error:', error);
      res.status(500).json({ error: 'Unable to load storefront configuration.' });
    }
  });

  app.get('/api/v1/products', async (req: Request, res: Response) => {
    try {
      const category = sanitizeText(req.query.category, 32).toLowerCase();
      const q = sanitizeText(req.query.q, 80);
      const safeCategory = category && isValidCategorySlug(category) ? category : undefined;
      const items = await listPublicProducts(safeCategory, q || undefined);
      res.json({ products: items });
    } catch (error) {
      console.error('GET /api/v1/products error:', error);
      res.status(500).json({ error: 'Unable to load products right now.' });
    }
  });

  app.get('/api/v1/products/:id', async (req: Request, res: Response) => {
    try {
      const product = await getPublicProductById(sanitizeText(req.params.id, 64));
      if (!product) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      res.json({ product });
    } catch (error) {
      console.error('GET /api/v1/products/:id error:', error);
      res.status(500).json({ error: 'Unable to load product details.' });
    }
  });

  // Public Order Checkout with PostgreSQL ACID Transaction
  app.post('/api/v1/orders', optionalAuth, async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      const customerName = sanitizeText(body.customerName, 80);
      const customerEmail = sanitizeText(body.customerEmail, 120);
      const customerPhone = sanitizeText(body.customerPhone, 32);
      const district = sanitizeText(body.district, 60);
      const address = sanitizeText(body.address, 240);
      const deliveryMethod = sanitizeText(body.deliveryMethod, 32) as DeliveryMethod;
      const paymentMethod = sanitizeText(body.paymentMethod, 32) as PaymentMethod;
      const preferredLang = (
        VALID_LANGS.includes(body.preferredLang as Language) ? body.preferredLang : 'zh'
      ) as Language;

      if (!customerName || !customerEmail.includes('@') || !customerPhone || !district || !address) {
        res.status(400).json({ error: 'Please complete all required Hong Kong delivery fields.' });
        return;
      }
      if (!VALID_DELIVERY.includes(deliveryMethod)) {
        res.status(400).json({ error: 'Invalid Hong Kong delivery method.' });
        return;
      }
      if (!VALID_PAYMENTS.includes(paymentMethod)) {
        res.status(400).json({ error: 'Invalid Hong Kong payment method.' });
        return;
      }
      if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 30) {
        res.status(400).json({ error: 'Order must contain at least one item.' });
        return;
      }

      const parsedItems: { productId: string; quantity: number }[] = [];
      for (const raw of body.items as Array<Record<string, unknown>>) {
        const productId = sanitizeText(raw.productId, 64);
        const qty = Number(raw.quantity);
        if (!productId || !Number.isInteger(qty) || qty < 1 || qty > 20) {
          res.status(400).json({ error: 'Invalid item quantity.' });
          return;
        }
        parsedItems.push({ productId, quantity: qty });
      }

      const order = await placeOrderTransactional({
        customerName,
        customerEmail,
        customerPhone,
        district,
        address,
        deliveryMethod,
        paymentMethod,
        paymentReference: generatePaymentRef(paymentMethod),
        preferredLang,
        userUid: req.user?.uid,
        items: parsedItems,
      });

      res.status(201).json({ order });
    } catch (error) {
      if (error instanceof OrderValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('POST /api/v1/orders error:', error);
      res.status(500).json({ error: 'Unable to complete order right now.' });
    }
  });

  // Public Shipment Tracking Lookup
  app.get('/api/v1/tracking/:query', async (req: Request, res: Response) => {
    try {
      const q = sanitizeText(req.params.query, 64);
      if (!q) {
        res.status(400).json({ error: 'Tracking query required.' });
        return;
      }
      const order = await findOrderForTracking(q);
      if (!order) {
        res.status(404).json({ error: 'Order or tracking number not found.' });
        return;
      }
      res.json({
        tracking: {
          orderNumber: order.orderNumber,
          trackingNumber: order.trackingNumber,
          courier: order.courier,
          district: order.district,
          deliveryMethod: order.deliveryMethod,
          paymentMethod: order.paymentMethod,
          orderStatus: order.orderStatus,
          totalHkd: order.totalHkd,
          items: order.items,
          shipmentEvents: order.shipmentEvents,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
      });
    } catch (error) {
      console.error('GET /api/v1/tracking/:query error:', error);
      res.status(500).json({ error: 'Unable to retrieve tracking details.' });
    }
  });

  // ---------------------------------------------------------------------------
  // MEMBER REGISTRATION, LOGIN & AUTH PROFILE (/api/v1/auth/*)
  // ---------------------------------------------------------------------------

  // Simple 3-field Member Sign-Up (Name, Phone, Email only — always starts as MEMBER)
  app.post('/api/v1/auth/register', async (req: Request, res: Response) => {
    try {
      const ipKey = `reg:${req.ip || 'unknown'}`;
      if (isRateLimited(ipKey)) {
        res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' });
        return;
      }

      const body = (req.body || {}) as Record<string, unknown>;
      const name = sanitizeText(body.name, 80);
      const email = sanitizeText(body.email, 120).toLowerCase();
      const phone = sanitizeText(body.phone, 32);
      const preferredLang = VALID_LANGS.includes(body.preferredLang as Language)
        ? (body.preferredLang as Language)
        : 'ko';

      if (!name || name.length < 2) {
        res.status(400).json({ error: '이름을 입력해 주세요.' });
        return;
      }
      if (!EMAIL_RE.test(email)) {
        res.status(400).json({ error: '올바른 이메일 주소를 입력해 주세요.' });
        return;
      }
      if (normalizePhoneDigits(phone).length < 6) {
        res.status(400).json({ error: '올바른 전화번호를 입력해 주세요.' });
        return;
      }

      const member = await registerPublicMember({ name, email, phone, preferredLang });
      const token = signMemberSessionToken(member.id, member.email);
      const effectiveRole =
        member.role === 'ADMIN' || isBootstrapAdminEmail(member.email) ? 'ADMIN' : 'CUSTOMER';

      res.status(201).json({
        token,
        user: {
          uid: member.id,
          email: member.email,
          name: member.name,
          role: effectiveRole,
        },
      });
    } catch (error) {
      if (error instanceof OrderValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('POST /api/v1/auth/register error:', error);
      res.status(500).json({ error: '회원가입 처리 중 오류가 발생했습니다.' });
    }
  });

  // Member Login (Email + Phone verification, live DB role lookup)
  app.post('/api/v1/auth/member-login', async (req: Request, res: Response) => {
    try {
      const ipKey = `login:${req.ip || 'unknown'}`;
      if (isRateLimited(ipKey)) {
        res.status(429).json({ error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' });
        return;
      }

      const body = (req.body || {}) as Record<string, unknown>;
      const email = sanitizeText(body.email, 120).toLowerCase();
      const phone = sanitizeText(body.phone, 32);

      if (!EMAIL_RE.test(email) || normalizePhoneDigits(phone).length < 6) {
        res.status(400).json({ error: '이메일과 전화번호를 정확히 입력해 주세요.' });
        return;
      }

      const member = await findMemberByEmail(email);
      if (!member || !phonesMatchTimingSafe(member.phone, phone)) {
        res.status(401).json({ error: '이메일 또는 전화번호가 일치하지 않습니다.' });
        return;
      }
      if (member.status !== 'ACTIVE') {
        res.status(403).json({ error: '정지된 회원 계정입니다. 관리자에게 문의해 주세요.' });
        return;
      }

      const token = signMemberSessionToken(member.id, member.email);
      const effectiveRole =
        member.role === 'ADMIN' || isBootstrapAdminEmail(member.email) ? 'ADMIN' : 'CUSTOMER';

      res.json({
        token,
        user: {
          uid: member.id,
          email: member.email,
          name: member.name,
          role: effectiveRole,
        },
      });
    } catch (error) {
      console.error('POST /api/v1/auth/member-login error:', error);
      res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
    }
  });

  app.get('/api/v1/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
    res.json({
      user: {
        uid: req.dbUser?.uid,
        email: req.dbUser?.email,
        name: req.dbUser?.name,
        role: req.dbUser?.role,
      },
    });
  });

  // ---------------------------------------------------------------------------
  // PROTECTED ADMIN MANAGEMENT API (/api/v1/admin/*)
  // ---------------------------------------------------------------------------

  // Verified Product Image Upload (JPG, PNG, WebP up to 3MB with magic-byte verification)
  app.post('/api/v1/admin/upload-image', requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      const dataBase64 = typeof body.dataBase64 === 'string' ? body.dataBase64.trim() : '';
      if (!dataBase64) {
        res.status(400).json({ error: 'Image data is required.' });
        return;
      }

      const rawBase64 = dataBase64.includes(',') ? dataBase64.split(',')[1] : dataBase64;
      const buffer = Buffer.from(rawBase64, 'base64');
      if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
        res.status(413).json({ error: 'Image exceeds the 3 MB maximum size limit.' });
        return;
      }

      const detected = detectImageTypeFromMagicBytes(buffer);
      if (!detected) {
        res.status(400).json({
          error: 'Unsupported image format. Please upload a valid JPG, PNG, or WebP file.',
        });
        return;
      }

      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      const filename = `prod_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${detected.ext}`;
      const destination = path.resolve(UPLOAD_DIR, filename);
      if (!destination.startsWith(UPLOAD_DIR + path.sep)) {
        res.status(400).json({ error: 'Invalid upload destination.' });
        return;
      }

      fs.writeFileSync(destination, buffer);
      res.status(201).json({
        imageUrl: `/uploads/${filename}`,
        mimeType: detected.mime,
        sizeBytes: buffer.length,
      });
    } catch (error) {
      console.error('POST /api/v1/admin/upload-image error:', error);
      res.status(500).json({ error: 'Failed to upload product image.' });
    }
  });

  app.get('/api/v1/admin/analytics', requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
      const analytics = await computeAdminAnalytics();
      res.json({ analytics });
    } catch (error) {
      console.error('GET /api/v1/admin/analytics error:', error);
      res.status(500).json({ error: 'Failed to load revenue analytics.' });
    }
  });

  app.get('/api/v1/admin/products', requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
      const list = await listAdminProducts();
      res.json({ products: list });
    } catch (error) {
      console.error('GET /api/v1/admin/products error:', error);
      res.status(500).json({ error: 'Failed to load products.' });
    }
  });

  app.put('/api/v1/admin/site-config', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const current = await getSiteConfig();
      const body = (req.body || {}) as Record<string, unknown>;
      const sanitized = sanitizeSiteConfigPayload(body, current);
      const saved = await saveSiteConfig(sanitized);
      res.json({ config: saved });
    } catch (error) {
      console.error('PUT /api/v1/admin/site-config error:', error);
      res.status(500).json({ error: 'Failed to save storefront configuration.' });
    }
  });

  app.get('/api/v1/admin/products/export', requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
      const [list, siteConfig] = await Promise.all([listAdminProducts(), getSiteConfig()]);
      const slugs = siteConfig.categories.map((c) => c.slug);
      const buffer = await buildProductsWorkbookBuffer(list, slugs);
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="dufreez-products-${stamp}.xlsx"`
      );
      res.send(buffer);
    } catch (error) {
      console.error('GET /api/v1/admin/products/export error:', error);
      res.status(500).json({ error: 'Failed to export products Excel file.' });
    }
  });

  app.post('/api/v1/admin/products/import', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      const fileBase64 = typeof body.fileBase64 === 'string' ? body.fileBase64.trim() : '';
      if (!fileBase64) {
        res.status(400).json({ error: 'Excel (.xlsx) file is required.' });
        return;
      }
      const rawBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
      const buffer = Buffer.from(rawBase64, 'base64');
      if (buffer.length === 0 || buffer.length > MAX_EXCEL_BYTES) {
        res.status(413).json({ error: 'Excel file exceeds 3 MB size limit.' });
        return;
      }
      // Verify ZIP/XLSX magic header (PK\x03\x04)
      if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
        res.status(400).json({ error: 'Please upload a valid .xlsx Excel workbook.' });
        return;
      }

      const siteConfig = await getSiteConfig();
      const allowedSlugs = siteConfig.categories.map((c) => c.slug);
      const { rows, errors } = await parseProductsWorkbookBuffer(buffer, allowedSlugs);
      if (rows.length === 0 && errors.length === 0) {
        res.status(400).json({ error: 'No product rows were found in the uploaded workbook.' });
        return;
      }

      const summary = await bulkUpsertProducts(rows, errors);
      res.json({ summary });
    } catch (error) {
      console.error('POST /api/v1/admin/products/import error:', error);
      res.status(400).json({ error: 'Unable to parse Excel file. Please use the exported .xlsx template.' });
    }
  });

  app.post('/api/v1/admin/products', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      const category = sanitizeText(body.category, 32).toLowerCase() as ProductCategory;
      if (!isValidCategorySlug(category)) {
        res.status(400).json({ error: 'Invalid product category.' });
        return;
      }
      const priceHkd = Number(body.priceHkd);
      const compareAtRaw =
        body.compareAtHkd !== undefined && body.compareAtHkd !== ''
          ? Number(body.compareAtHkd)
          : undefined;
      const stock = Number(body.stock);
      if (!Number.isFinite(priceHkd) || priceHkd <= 0 || priceHkd > 99999) {
        res.status(400).json({ error: 'Price (HKD) must be a valid positive number.' });
        return;
      }
      if (!Number.isInteger(stock) || stock < 0 || stock > 100000) {
        res.status(400).json({ error: 'Stock must be a non-negative integer.' });
        return;
      }

      const name = sanitizeLocalized(body.name, '', 120);
      if (!name.en) {
        res.status(400).json({ error: 'Product name is required.' });
        return;
      }

      const imageCandidate = sanitizeText(body.imageUrl, 512) || GENERATED_IMAGES.serum;
      const imageUrl = isSafeImageUrl(imageCandidate) ? imageCandidate : GENERATED_IMAGES.serum;
      const skuInput = sanitizeText(body.sku, 32).toUpperCase();
      const sku = skuInput || `DF-${category.slice(0, 3).toUpperCase()}-${crypto.randomInt(100, 999)}`;
      const statusRaw = sanitizeText(body.status, 24);
      const status: Product['status'] =
        statusRaw === 'DRAFT' ? 'DRAFT' : stock === 0 ? 'OUT_OF_STOCK' : 'ACTIVE';

      const product = await createProductRecord({
        sku,
        category,
        name,
        subtitle: sanitizeLocalized(body.subtitle, name.en, 180),
        description: sanitizeLocalized(body.description, name.en, 800),
        ingredients: sanitizeLocalized(body.ingredients, 'Cryo-Botanical Extract Complex', 400),
        volume: sanitizeText(body.volume, 48) || '50 ml',
        priceHkd: Math.round(priceHkd),
        compareAtHkd:
          compareAtRaw && Number.isFinite(compareAtRaw) && compareAtRaw > priceHkd
            ? Math.round(compareAtRaw)
            : undefined,
        stock,
        status,
        featured: Boolean(body.featured ?? true),
        tag: body.tag ? sanitizeLocalized(body.tag, '', 40) : undefined,
        imageUrl,
      });

      res.status(201).json({ product });
    } catch (error) {
      console.error('POST /api/v1/admin/products error:', error);
      res.status(500).json({ error: 'Failed to save product.' });
    }
  });

  app.put('/api/v1/admin/products/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const id = sanitizeText(req.params.id, 64);
      const body = req.body as Record<string, unknown>;
      const patch: Record<string, unknown> = {};

      if (typeof body.category === 'string') {
        const cat = sanitizeText(body.category, 32).toLowerCase();
        if (isValidCategorySlug(cat)) {
          patch.category = cat;
        }
      }
      if (body.sku) patch.sku = sanitizeText(body.sku, 32).toUpperCase();
      if (body.name) patch.name = sanitizeLocalized(body.name, '', 120);
      if (body.subtitle) patch.subtitle = sanitizeLocalized(body.subtitle, '', 180);
      if (body.description) patch.description = sanitizeLocalized(body.description, '', 800);
      if (body.ingredients) patch.ingredients = sanitizeLocalized(body.ingredients, '', 400);
      if (body.volume) patch.volume = sanitizeText(body.volume, 48);
      if (body.priceHkd !== undefined) {
        const priceHkd = Number(body.priceHkd);
        if (!Number.isFinite(priceHkd) || priceHkd <= 0) {
          res.status(400).json({ error: 'Invalid priceHkd.' });
          return;
        }
        patch.priceHkd = Math.round(priceHkd);
      }
      if (body.compareAtHkd !== undefined) {
        const cmp = Number(body.compareAtHkd);
        patch.compareAtHkd = Number.isFinite(cmp) && cmp > 0 ? Math.round(cmp) : undefined;
      }
      if (body.stock !== undefined) {
        const stock = Number(body.stock);
        if (!Number.isInteger(stock) || stock < 0) {
          res.status(400).json({ error: 'Invalid stock.' });
          return;
        }
        patch.stock = stock;
      }
      if (body.status && ['ACTIVE', 'DRAFT', 'OUT_OF_STOCK'].includes(String(body.status))) {
        patch.status = body.status;
      }
      if (typeof body.imageUrl === 'string' && isSafeImageUrl(body.imageUrl.trim())) {
        patch.imageUrl = body.imageUrl.trim();
      }

      const updated = await updateProductRecord(id, patch);
      if (!updated) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      res.json({ product: updated });
    } catch (error) {
      console.error('PUT /api/v1/admin/products/:id error:', error);
      res.status(500).json({ error: 'Failed to update product.' });
    }
  });

  app.delete('/api/v1/admin/products/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await deleteProductRecord(sanitizeText(req.params.id, 64));
      if (!deleted) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (error) {
      console.error('DELETE /api/v1/admin/products/:id error:', error);
      res.status(500).json({ error: 'Failed to delete product.' });
    }
  });

  app.get('/api/v1/admin/orders', requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
      const list = await listAdminOrders();
      res.json({ orders: list });
    } catch (error) {
      console.error('GET /api/v1/admin/orders error:', error);
      res.status(500).json({ error: 'Failed to load orders.' });
    }
  });

  app.patch(
    '/api/v1/admin/orders/:id/shipment',
    requireAdmin,
    async (req: AuthRequest, res: Response) => {
      try {
        const orderId = sanitizeText(req.params.id, 64);
        const body = req.body as Record<string, unknown>;
        if (!isOrderStatus(body.status)) {
          res.status(400).json({ error: 'Invalid shipment status.' });
          return;
        }
        const location = sanitizeLocalized(body.location, 'Hong Kong SF Express Hub', 140);
        const note = sanitizeLocalized(body.note, `Shipment updated to ${body.status}`, 300);

        const updated = await appendShipmentEventRecord(orderId, body.status, location, note);
        if (!updated) {
          res.status(404).json({ error: 'Order not found.' });
          return;
        }
        res.json({ order: updated });
      } catch (error) {
        console.error('PATCH /api/v1/admin/orders/:id/shipment error:', error);
        res.status(500).json({ error: 'Failed to update shipment status.' });
      }
    }
  );

  // ---------------------------------------------------------------------------
  // MEMBER CRUD + EXCEL EXPORT / IMPORT
  // ---------------------------------------------------------------------------

  app.get('/api/v1/admin/members', requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
      const list = await listAdminMembers();
      res.json({ members: list });
    } catch (error) {
      console.error('GET /api/v1/admin/members error:', error);
      res.status(500).json({ error: 'Failed to load members.' });
    }
  });

  app.get('/api/v1/admin/members/export', requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
      const list = await listAdminMembers();
      const buffer = await buildMembersWorkbookBuffer(list);
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="dufreez-members-${stamp}.xlsx"`
      );
      res.send(buffer);
    } catch (error) {
      console.error('GET /api/v1/admin/members/export error:', error);
      res.status(500).json({ error: 'Failed to export members Excel file.' });
    }
  });

  app.post('/api/v1/admin/members/import', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      const fileBase64 = typeof body.fileBase64 === 'string' ? body.fileBase64.trim() : '';
      if (!fileBase64) {
        res.status(400).json({ error: 'Excel (.xlsx) file is required.' });
        return;
      }
      const rawBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
      const buffer = Buffer.from(rawBase64, 'base64');
      if (buffer.length === 0 || buffer.length > MAX_EXCEL_BYTES) {
        res.status(413).json({ error: 'Excel file exceeds 3 MB size limit.' });
        return;
      }
      if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
        res.status(400).json({ error: 'Please upload a valid .xlsx Excel workbook.' });
        return;
      }

      const { rows, errors } = await parseMembersWorkbookBuffer(buffer);
      if (rows.length === 0 && errors.length === 0) {
        res.status(400).json({ error: 'No member rows were found in the uploaded workbook.' });
        return;
      }

      const summary = await bulkUpsertMembers(rows, errors);
      res.json({ summary });
    } catch (error) {
      console.error('POST /api/v1/admin/members/import error:', error);
      res.status(400).json({ error: 'Unable to parse Excel file. Please use the exported .xlsx template.' });
    }
  });

  app.post('/api/v1/admin/members', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      const name = sanitizeText(body.name, 80);
      const email = sanitizeText(body.email, 120).toLowerCase();
      const phone = sanitizeText(body.phone, 32);
      const district = sanitizeText(body.district, 60) || 'Central & Western';
      const tier = VALID_TIERS.includes(body.tier as MemberTier)
        ? (body.tier as MemberTier)
        : 'SILVER';
      const role = VALID_MEMBER_ROLES.includes(body.role as MemberRole)
        ? (body.role as MemberRole)
        : 'MEMBER';
      const preferredLang = VALID_LANGS.includes(body.preferredLang as Language)
        ? (body.preferredLang as Language)
        : 'zh';
      const status: 'ACTIVE' | 'SUSPENDED' =
        body.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';

      if (!name || !email.includes('@') || !phone) {
        res.status(400).json({ error: 'Name, valid email, and phone are required.' });
        return;
      }

      const member = await createMemberRecord({
        name,
        email,
        phone,
        district,
        tier,
        role,
        preferredLang,
        status,
      });
      res.status(201).json({ member });
    } catch (error) {
      console.error('POST /api/v1/admin/members error:', error);
      res.status(409).json({ error: 'Failed to create member. Email may already exist.' });
    }
  });

  app.put('/api/v1/admin/members/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const memberId = sanitizeText(req.params.id, 64);
      const body = req.body as Record<string, unknown>;
      const patch: Record<string, unknown> = {};

      if (typeof body.name === 'string' && body.name.trim()) {
        patch.name = sanitizeText(body.name, 80);
      }
      if (typeof body.email === 'string' && body.email.includes('@')) {
        patch.email = sanitizeText(body.email, 120).toLowerCase();
      }
      if (typeof body.phone === 'string' && body.phone.trim()) {
        patch.phone = sanitizeText(body.phone, 32);
      }
      if (typeof body.district === 'string' && body.district.trim()) {
        patch.district = sanitizeText(body.district, 60);
      }
      if (body.tier && VALID_TIERS.includes(body.tier as MemberTier)) {
        patch.tier = body.tier;
      }
      if (body.role && VALID_MEMBER_ROLES.includes(body.role as MemberRole)) {
        patch.role = body.role;
      }
      if (body.preferredLang && VALID_LANGS.includes(body.preferredLang as Language)) {
        patch.preferredLang = body.preferredLang;
      }
      if (body.status === 'ACTIVE' || body.status === 'SUSPENDED') {
        patch.status = body.status;
      }

      const updated = await updateMemberRecord(memberId, patch);
      if (!updated) {
        res.status(404).json({ error: 'Member not found.' });
        return;
      }
      res.json({ member: updated });
    } catch (error) {
      console.error('PUT /api/v1/admin/members/:id error:', error);
      res.status(500).json({ error: 'Failed to update member.' });
    }
  });

  app.patch('/api/v1/admin/members/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const memberId = sanitizeText(req.params.id, 64);
      const body = req.body as Record<string, unknown>;
      const patch: { tier?: MemberTier; role?: MemberRole; status?: 'ACTIVE' | 'SUSPENDED' } = {};

      if (body.tier && VALID_TIERS.includes(body.tier as MemberTier)) {
        patch.tier = body.tier as MemberTier;
      }
      if (body.role && VALID_MEMBER_ROLES.includes(body.role as MemberRole)) {
        patch.role = body.role as MemberRole;
      }
      if (body.status === 'ACTIVE' || body.status === 'SUSPENDED') {
        patch.status = body.status;
      }

      const updated = await updateMemberRecord(memberId, patch);
      if (!updated) {
        res.status(404).json({ error: 'Member not found.' });
        return;
      }
      res.json({ member: updated });
    } catch (error) {
      console.error('PATCH /api/v1/admin/members/:id error:', error);
      res.status(500).json({ error: 'Failed to update member.' });
    }
  });

  app.delete('/api/v1/admin/members/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await deleteMemberRecord(sanitizeText(req.params.id, 64));
      if (!deleted) {
        res.status(404).json({ error: 'Member not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (error) {
      if (error instanceof OrderValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('DELETE /api/v1/admin/members/:id error:', error);
      res.status(500).json({ error: 'Failed to delete member.' });
    }
  });

  app.get('/api/v1/admin/springboot-blueprint', requireAdmin, (_req: AuthRequest, res: Response) => {
    res.json({ files: SPRING_BOOT_BLUEPRINT_FILES });
  });

  // ---------------------------------------------------------------------------
  // VITE DEV MIDDLEWARE / PRODUCTION STATIC SERVING
  // ---------------------------------------------------------------------------

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found.' });
        return;
      }
      const indexFile = path.resolve(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        next();
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DUFREEZ Hong Kong Commerce Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start DUFREEZ server:', err);
  process.exit(1);
});
