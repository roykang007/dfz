import crypto from 'crypto';
import { asc, desc, eq, inArray, or } from 'drizzle-orm';
import type {
  AnalyticsSummary,
  DeliveryMethod,
  Language,
  LocalizedText,
  Member,
  MemberRole,
  MemberTier,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductCategory,
  ShipmentEvent,
  SiteConfig,
} from '../types.ts';
import { DEFAULT_SITE_CONFIG } from '../lib/defaultSiteConfig.ts';
import { db } from './index.ts';
import {
  members,
  orderItems,
  orders,
  products,
  shipmentEvents,
  siteSettings,
  users,
} from './schema.ts';
import { SEED_MEMBERS, SEED_ORDERS, SEED_PRODUCTS } from './seedData.ts';
import { isBootstrapAdminEmail } from './users.ts';

const SITE_CONFIG_KEY = 'storefront';

let seedPromise: Promise<void> | null = null;

const LEGACY_SKINCARE_SKUS = new Set([
  'DF-SRM-001',
  'DF-CRM-002',
  'DF-MST-003',
  'DF-WLN-004',
  'DF-CRM-005',
  'DF-RTL-006',
]);

const LEGACY_CATEGORY_LABELS = new Set([
  'Cryo Serums',
  'Barrier Creams',
  'Botanical Mists',
  'Inner Wellness',
  'Curated Rituals',
  '冰感精華',
  '屏障修護霜',
  '植萃噴霧',
  '內在美學',
  '限定禮盒',
  '크라이오 세럼',
  '장벽 리페어 크림',
  '보태니컬 미스트',
  '이너 뷰티',
  '리추얼 세트',
]);

function isLegacySeedProductRow(row: typeof products.$inferSelect): boolean {
  if (LEGACY_SKINCARE_SKUS.has(row.sku)) return true;
  if (row.id === 'prod-barrier-cream' && row.imageUrl.includes('product_barrier_cream_')) return true;
  if (row.id === 'prod-botanical-mist' && row.imageUrl.includes('product_botanical_mist_')) return true;
  if (row.id === 'prod-marine-collagen' && row.imageUrl.includes('product_cryo_serum_')) return true;
  if (row.id === 'prod-night-recovery' && row.imageUrl.includes('product_barrier_cream_')) return true;
  if (row.id === 'prod-hk-ritual-set' && row.imageUrl.includes('hero_dufreez_campaign_')) return true;
  return false;
}

async function migrateLegacyCatalogIfNeeded(): Promise<void> {
  const seedIds = SEED_PRODUCTS.map((p) => p.id);
  const existingSeedRows = await db
    .select()
    .from(products)
    .where(inArray(products.id, seedIds));

  const legacyRows = existingSeedRows.filter(isLegacySeedProductRow);
  if (legacyRows.length > 0) {
    const seedById = new Map(SEED_PRODUCTS.map((p) => [p.id, p]));
    await db.transaction(async (tx) => {
      for (const row of legacyRows) {
        const updated = seedById.get(row.id);
        if (!updated) continue;
        await tx
          .update(products)
          .set({
            sku: updated.sku,
            category: updated.category,
            name: updated.name,
            subtitle: updated.subtitle,
            description: updated.description,
            ingredients: updated.ingredients,
            volume: updated.volume,
            priceHkd: updated.priceHkd,
            compareAtHkd: updated.compareAtHkd ?? null,
            stock: updated.stock,
            tag: updated.tag ?? null,
            imageUrl: updated.imageUrl,
            updatedAt: new Date(),
          })
          .where(eq(products.id, updated.id));

        await tx
          .update(orderItems)
          .set({
            sku: updated.sku,
            name: updated.name,
            imageUrl: updated.imageUrl,
          })
          .where(eq(orderItems.productId, updated.id));
      }
    });
  }

  // Upgrade legacy skincare category labels in site_settings (only if legacy labels still exist)
  const configRows = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, SITE_CONFIG_KEY))
    .limit(1);

  if (configRows.length > 0) {
    const stored = configRows[0].value;
    if (Array.isArray(stored?.categories) && stored.categories.length > 0) {
      const defaultBySlug = new Map(DEFAULT_SITE_CONFIG.categories.map((c) => [c.slug, c]));
      let changed = false;
      const nextCategories = stored.categories.map((cat) => {
        const replacement = defaultBySlug.get(cat.slug);
        if (!replacement || !cat.label) return cat;
        const hasLegacy =
          LEGACY_CATEGORY_LABELS.has(cat.label.zh) ||
          LEGACY_CATEGORY_LABELS.has(cat.label.en) ||
          LEGACY_CATEGORY_LABELS.has(cat.label.ko);
        if (!hasLegacy) return cat;
        changed = true;
        return {
          ...cat,
          label: {
            zh: LEGACY_CATEGORY_LABELS.has(cat.label.zh) ? replacement.label.zh : cat.label.zh,
            en: LEGACY_CATEGORY_LABELS.has(cat.label.en) ? replacement.label.en : cat.label.en,
            ko: LEGACY_CATEGORY_LABELS.has(cat.label.ko) ? replacement.label.ko : cat.label.ko,
          },
        };
      });

      if (changed) {
        await db
          .update(siteSettings)
          .set({
            value: { ...stored, categories: nextCategories },
            updatedAt: new Date(),
          })
          .where(eq(siteSettings.key, SITE_CONFIG_KEY));
      }
    }
  }
}

async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const existing = await db.select({ id: products.id }).from(products).limit(1);
      if (existing.length > 0) {
        await migrateLegacyCatalogIfNeeded();
        return;
      }

      await db.transaction(async (tx) => {
        const recheck = await tx.select({ id: products.id }).from(products).limit(1);
        if (recheck.length > 0) return;

        for (const p of SEED_PRODUCTS) {
          await tx
            .insert(products)
            .values({
              id: p.id,
              sku: p.sku,
              category: p.category,
              name: p.name,
              subtitle: p.subtitle,
              description: p.description,
              ingredients: p.ingredients,
              volume: p.volume,
              priceHkd: p.priceHkd,
              compareAtHkd: p.compareAtHkd ?? null,
              stock: p.stock,
              status: p.status,
              featured: p.featured,
              tag: p.tag ?? null,
              imageUrl: p.imageUrl,
              createdAt: new Date(p.createdAt),
              updatedAt: new Date(p.updatedAt),
            })
            .onConflictDoNothing();
        }

        for (const m of SEED_MEMBERS) {
          await tx
            .insert(members)
            .values({
              id: m.id,
              name: m.name,
              email: m.email,
              phone: m.phone,
              district: m.district,
              tier: m.tier,
              role: m.role,
              preferredLang: m.preferredLang,
              totalOrders: m.totalOrders,
              totalSpentHkd: m.totalSpentHkd,
              status: m.status,
              joinedAt: new Date(m.joinedAt),
              lastOrderAt: new Date(m.lastOrderAt),
            })
            .onConflictDoNothing();
        }

        for (const o of SEED_ORDERS) {
          await tx
            .insert(orders)
            .values({
              id: o.id,
              orderNumber: o.orderNumber,
              trackingNumber: o.trackingNumber,
              courier: o.courier,
              memberId: o.memberId,
              customerName: o.customerName,
              customerEmail: o.customerEmail,
              customerPhone: o.customerPhone,
              district: o.district,
              address: o.address,
              deliveryMethod: o.deliveryMethod,
              paymentMethod: o.paymentMethod,
              paymentReference: o.paymentReference,
              paymentStatus: o.paymentStatus,
              orderStatus: o.orderStatus,
              subtotalHkd: o.subtotalHkd,
              shippingHkd: o.shippingHkd,
              totalHkd: o.totalHkd,
              preferredLang: o.preferredLang,
              createdAt: new Date(o.createdAt),
              updatedAt: new Date(o.updatedAt),
            })
            .onConflictDoNothing();

          for (const item of o.items) {
            await tx.insert(orderItems).values({
              orderId: o.id,
              productId: item.productId,
              sku: item.sku,
              name: item.name,
              quantity: item.quantity,
              unitPriceHkd: item.unitPriceHkd,
              lineTotalHkd: item.lineTotalHkd,
              imageUrl: item.imageUrl,
            });
          }

          for (const ev of o.shipmentEvents) {
            await tx
              .insert(shipmentEvents)
              .values({
                id: ev.id,
                orderId: o.id,
                status: ev.status,
                location: ev.location,
                note: ev.note,
                timestamp: new Date(ev.timestamp),
              })
              .onConflictDoNothing();
          }
        }
      });

      await migrateLegacyCatalogIfNeeded();
    })().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  await seedPromise;
}

export async function ensureDatabaseReady(): Promise<void> {
  await ensureSeeded();
}

function mapProductRow(row: typeof products.$inferSelect): Product {
  return {
    id: row.id,
    sku: row.sku,
    category: row.category as ProductCategory,
    name: row.name,
    subtitle: row.subtitle,
    description: row.description,
    ingredients: row.ingredients,
    volume: row.volume,
    priceHkd: row.priceHkd,
    compareAtHkd: row.compareAtHkd ?? undefined,
    stock: row.stock,
    status: row.status as Product['status'],
    featured: row.featured,
    tag: row.tag ?? undefined,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapMemberRow(row: typeof members.$inferSelect): Member {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    district: row.district,
    tier: row.tier as MemberTier,
    role: (row.role === 'ADMIN' || isBootstrapAdminEmail(row.email) ? 'ADMIN' : 'MEMBER') as MemberRole,
    preferredLang: row.preferredLang as Language,
    totalOrders: row.totalOrders,
    totalSpentHkd: row.totalSpentHkd,
    status: row.status as Member['status'],
    joinedAt: row.joinedAt.toISOString(),
    lastOrderAt: row.lastOrderAt.toISOString(),
  };
}

async function hydrateOrders(orderRows: (typeof orders.$inferSelect)[]): Promise<Order[]> {
  if (orderRows.length === 0) return [];
  const orderIds = orderRows.map((o) => o.id);

  const [itemRows, eventRows] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
    db
      .select()
      .from(shipmentEvents)
      .where(inArray(shipmentEvents.orderId, orderIds))
      .orderBy(asc(shipmentEvents.timestamp)),
  ]);

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const row of itemRows) {
    const list = itemsByOrder.get(row.orderId) || [];
    list.push({
      productId: row.productId,
      sku: row.sku,
      name: row.name,
      quantity: row.quantity,
      unitPriceHkd: row.unitPriceHkd,
      lineTotalHkd: row.lineTotalHkd,
      imageUrl: row.imageUrl,
    });
    itemsByOrder.set(row.orderId, list);
  }

  const eventsByOrder = new Map<string, ShipmentEvent[]>();
  for (const row of eventRows) {
    const list = eventsByOrder.get(row.orderId) || [];
    list.push({
      id: row.id,
      status: row.status as OrderStatus,
      location: row.location,
      note: row.note,
      timestamp: row.timestamp.toISOString(),
    });
    eventsByOrder.set(row.orderId, list);
  }

  return orderRows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    trackingNumber: o.trackingNumber,
    courier: o.courier,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    district: o.district,
    address: o.address,
    deliveryMethod: o.deliveryMethod as DeliveryMethod,
    paymentMethod: o.paymentMethod as PaymentMethod,
    paymentReference: o.paymentReference,
    paymentStatus: o.paymentStatus as Order['paymentStatus'],
    orderStatus: o.orderStatus as OrderStatus,
    subtotalHkd: o.subtotalHkd,
    shippingHkd: o.shippingHkd,
    totalHkd: o.totalHkd,
    items: itemsByOrder.get(o.id) || [],
    shipmentEvents: eventsByOrder.get(o.id) || [],
    preferredLang: o.preferredLang as Language,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));
}

export async function listPublicProducts(category?: string, q?: string): Promise<Product[]> {
  try {
    await ensureSeeded();
    const rows = await db.select().from(products).orderBy(desc(products.createdAt));
    let items = rows.map(mapProductRow).filter((p) => p.status !== 'DRAFT');
    if (category && category !== 'all') {
      items = items.filter((p) => p.category === category);
    }
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter(
        (p) =>
          p.sku.toLowerCase().includes(needle) ||
          p.name.zh.toLowerCase().includes(needle) ||
          p.name.en.toLowerCase().includes(needle) ||
          p.name.ko.toLowerCase().includes(needle) ||
          p.ingredients.zh.toLowerCase().includes(needle) ||
          p.ingredients.en.toLowerCase().includes(needle) ||
          p.ingredients.ko.toLowerCase().includes(needle)
      );
    }
    return items;
  } catch (error) {
    console.error('Database query failed in listPublicProducts:', error);
    throw new Error('Failed to load product catalog. Please try again later.', { cause: error });
  }
}

export async function getPublicProductById(id: string): Promise<Product | null> {
  try {
    await ensureSeeded();
    const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (rows.length === 0 || rows[0].status === 'DRAFT') return null;
    return mapProductRow(rows[0]);
  } catch (error) {
    console.error('Database query failed in getPublicProductById:', error);
    throw new Error('Failed to load product details.', { cause: error });
  }
}

export async function listAdminProducts(): Promise<Product[]> {
  try {
    await ensureSeeded();
    const rows = await db.select().from(products).orderBy(desc(products.createdAt));
    return rows.map(mapProductRow);
  } catch (error) {
    console.error('Database query failed in listAdminProducts:', error);
    throw new Error('Failed to load products.', { cause: error });
  }
}

export interface CreateProductInput {
  sku: string;
  category: ProductCategory;
  name: LocalizedText;
  subtitle: LocalizedText;
  description: LocalizedText;
  ingredients: LocalizedText;
  volume: string;
  priceHkd: number;
  compareAtHkd?: number;
  stock: number;
  status: Product['status'];
  featured: boolean;
  tag?: LocalizedText;
  imageUrl: string;
}

export async function createProductRecord(input: CreateProductInput): Promise<Product> {
  try {
    await ensureSeeded();
    const id = `prod-${crypto.randomBytes(5).toString('hex')}`;
    const now = new Date();
    const [inserted] = await db
      .insert(products)
      .values({
        id,
        sku: input.sku,
        category: input.category,
        name: input.name,
        subtitle: input.subtitle,
        description: input.description,
        ingredients: input.ingredients,
        volume: input.volume,
        priceHkd: input.priceHkd,
        compareAtHkd: input.compareAtHkd ?? null,
        stock: input.stock,
        status: input.status,
        featured: input.featured,
        tag: input.tag ?? null,
        imageUrl: input.imageUrl,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return mapProductRow(inserted);
  } catch (error) {
    console.error('Database query failed in createProductRecord:', error);
    throw new Error('Failed to create product. SKU may already exist.', { cause: error });
  }
}

export async function updateProductRecord(
  id: string,
  patch: Partial<CreateProductInput>
): Promise<Product | null> {
  try {
    await ensureSeeded();
    const existing = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (existing.length === 0) return null;

    const current = existing[0];
    const [updated] = await db
      .update(products)
      .set({
        sku: patch.sku ?? current.sku,
        category: patch.category ?? current.category,
        name: patch.name ?? current.name,
        subtitle: patch.subtitle ?? current.subtitle,
        description: patch.description ?? current.description,
        ingredients: patch.ingredients ?? current.ingredients,
        volume: patch.volume ?? current.volume,
        priceHkd: patch.priceHkd ?? current.priceHkd,
        compareAtHkd:
          patch.compareAtHkd !== undefined ? patch.compareAtHkd ?? null : current.compareAtHkd,
        stock: patch.stock ?? current.stock,
        status: patch.status ?? current.status,
        featured: patch.featured ?? current.featured,
        tag: patch.tag !== undefined ? patch.tag ?? null : current.tag,
        imageUrl: patch.imageUrl ?? current.imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    return mapProductRow(updated);
  } catch (error) {
    console.error('Database query failed in updateProductRecord:', error);
    throw new Error('Failed to update product.', { cause: error });
  }
}

export async function deleteProductRecord(id: string): Promise<boolean> {
  try {
    await ensureSeeded();
    const deleted = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });
    return deleted.length > 0;
  } catch (error) {
    console.error('Database query failed in deleteProductRecord:', error);
    throw new Error('Failed to delete product.', { cause: error });
  }
}

export interface PlaceOrderInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  district: string;
  address: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  preferredLang: Language;
  userUid?: string;
  items: { productId: string; quantity: number }[];
}

export class OrderValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function placeOrderTransactional(input: PlaceOrderInput): Promise<Order> {
  try {
    await ensureSeeded();

    return await db.transaction(async (tx) => {
      const verifiedItems: OrderItem[] = [];
      let subtotalHkd = 0;

      for (const reqItem of input.items) {
        const found = await tx
          .select()
          .from(products)
          .where(eq(products.id, reqItem.productId))
          .limit(1);

        if (found.length === 0 || found[0].status !== 'ACTIVE') {
          throw new OrderValidationError(`Product ${reqItem.productId} is unavailable.`, 400);
        }
        const product = found[0];
        if (product.stock < reqItem.quantity) {
          throw new OrderValidationError(
            `Insufficient HK stock for ${product.name.en}.`,
            409
          );
        }

        const lineTotalHkd = product.priceHkd * reqItem.quantity;
        subtotalHkd += lineTotalHkd;
        verifiedItems.push({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity: reqItem.quantity,
          unitPriceHkd: product.priceHkd,
          lineTotalHkd,
          imageUrl: product.imageUrl,
        });

        const nextStock = Math.max(0, product.stock - reqItem.quantity);
        await tx
          .update(products)
          .set({
            stock: nextStock,
            status: nextStock === 0 ? 'OUT_OF_STOCK' : product.status,
            updatedAt: new Date(),
          })
          .where(eq(products.id, product.id));
      }

      const baseShipping =
        input.deliveryMethod === 'CENTRAL_PICKUP'
          ? 0
          : input.deliveryMethod === 'SF_LOCKER'
            ? 25
            : 38;
      const shippingHkd = subtotalHkd >= 480 ? 0 : baseShipping;
      const totalHkd = subtotalHkd + shippingHkd;

      const existingOrdersCount = (await tx.select({ id: orders.id }).from(orders)).length;
      const nextSeq = 1043 + existingOrdersCount;
      const orderNumber = `DF-2026-${nextSeq}`;
      const trackingNumber =
        input.deliveryMethod === 'CENTRAL_PICKUP'
          ? `HKPK${crypto.randomInt(10000000, 99999999)}`
          : `SFHK${crypto.randomInt(88292000, 88999999)}`;
      const now = new Date();
      const orderId = `ord-${nextSeq}-${crypto.randomBytes(3).toString('hex')}`;

      // Upsert Hong Kong member profile inside the same transaction
      const normalizedEmail = input.customerEmail.toLowerCase();
      const existingMemberRows = await tx
        .select()
        .from(members)
        .where(eq(members.email, normalizedEmail))
        .limit(1);

      let memberId: string;
      if (existingMemberRows.length > 0) {
        const m = existingMemberRows[0];
        memberId = m.id;
        const newSpent = m.totalSpentHkd + totalHkd;
        const newTier: MemberTier =
          newSpent >= 5000 ? 'CRYO_VIP' : newSpent >= 2000 ? 'GLACIER_GOLD' : 'SILVER';
        await tx
          .update(members)
          .set({
            totalOrders: m.totalOrders + 1,
            totalSpentHkd: newSpent,
            district: input.district,
            tier: newTier,
            lastOrderAt: now,
            userUid: m.userUid ?? input.userUid ?? null,
          })
          .where(eq(members.id, m.id));
      } else {
        memberId = `mem-${crypto.randomBytes(4).toString('hex')}`;
        await tx.insert(members).values({
          id: memberId,
          userUid: input.userUid ?? null,
          name: input.customerName,
          email: normalizedEmail,
          phone: input.customerPhone,
          district: input.district,
          tier: totalHkd >= 2000 ? 'GLACIER_GOLD' : 'SILVER',
          preferredLang: input.preferredLang,
          totalOrders: 1,
          totalSpentHkd: totalHkd,
          status: 'ACTIVE',
          joinedAt: now,
          lastOrderAt: now,
        });
      }

      const courier =
        input.deliveryMethod === 'CENTRAL_PICKUP'
          ? 'Central Atelier Pickup'
          : 'SF Express Hong Kong';

      await tx.insert(orders).values({
        id: orderId,
        orderNumber,
        trackingNumber,
        courier,
        memberId,
        userUid: input.userUid ?? null,
        customerName: input.customerName,
        customerEmail: normalizedEmail,
        customerPhone: input.customerPhone,
        district: input.district,
        address: input.address,
        deliveryMethod: input.deliveryMethod,
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference,
        paymentStatus: 'PAID',
        orderStatus: 'CONFIRMED',
        subtotalHkd,
        shippingHkd,
        totalHkd,
        preferredLang: input.preferredLang,
        createdAt: now,
        updatedAt: now,
      });

      for (const line of verifiedItems) {
        await tx.insert(orderItems).values({
          orderId,
          productId: line.productId,
          sku: line.sku,
          name: line.name,
          quantity: line.quantity,
          unitPriceHkd: line.unitPriceHkd,
          lineTotalHkd: line.lineTotalHkd,
          imageUrl: line.imageUrl,
        });
      }

      const initialEvent: ShipmentEvent = {
        id: `ev-${crypto.randomBytes(4).toString('hex')}`,
        status: 'CONFIRMED',
        location: {
          zh: '香港線上商城 dufreez.com',
          en: 'dufreez.com Hong Kong',
          ko: 'dufreez.com 홍콩 스토어',
        },
        note: {
          zh: `已收到 ${input.paymentMethod} 港幣付款確認，正安排葵涌冷鏈倉備貨。`,
          en: `HKD payment via ${input.paymentMethod} verified. Queued for Kwai Chung cold-chain dispatch.`,
          ko: `${input.paymentMethod} HKD 결제가 확인되어 홍콩 콰이청 콜드체인 출고를 준비 중입니다.`,
        },
        timestamp: now.toISOString(),
      };

      await tx.insert(shipmentEvents).values({
        id: initialEvent.id,
        orderId,
        status: initialEvent.status,
        location: initialEvent.location,
        note: initialEvent.note,
        timestamp: now,
      });

      return {
        id: orderId,
        orderNumber,
        trackingNumber,
        courier,
        customerName: input.customerName,
        customerEmail: normalizedEmail,
        customerPhone: input.customerPhone,
        district: input.district,
        address: input.address,
        deliveryMethod: input.deliveryMethod,
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference,
        paymentStatus: 'PAID',
        orderStatus: 'CONFIRMED',
        subtotalHkd,
        shippingHkd,
        totalHkd,
        items: verifiedItems,
        shipmentEvents: [initialEvent],
        preferredLang: input.preferredLang,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      throw error;
    }
    console.error('Database transaction failed in placeOrderTransactional:', error);
    throw new Error('Failed to process order. Please try again later.', { cause: error });
  }
}

export async function findOrderForTracking(query: string): Promise<Order | null> {
  try {
    await ensureSeeded();
    const upper = query.trim().toUpperCase();
    const rows = await db
      .select()
      .from(orders)
      .where(or(eq(orders.orderNumber, upper), eq(orders.trackingNumber, upper)))
      .limit(1);

    if (rows.length === 0) return null;
    const hydrated = await hydrateOrders(rows);
    return hydrated[0] || null;
  } catch (error) {
    console.error('Database query failed in findOrderForTracking:', error);
    throw new Error('Failed to look up shipment tracking.', { cause: error });
  }
}

export async function listAdminOrders(): Promise<Order[]> {
  try {
    await ensureSeeded();
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
    return await hydrateOrders(rows);
  } catch (error) {
    console.error('Database query failed in listAdminOrders:', error);
    throw new Error('Failed to load orders.', { cause: error });
  }
}

export async function appendShipmentEventRecord(
  orderId: string,
  status: OrderStatus,
  location: LocalizedText,
  note: LocalizedText
): Promise<Order | null> {
  try {
    await ensureSeeded();
    const existing = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (existing.length === 0) return null;

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({ orderStatus: status, updatedAt: now })
        .where(eq(orders.id, orderId));

      await tx.insert(shipmentEvents).values({
        id: `ev-${crypto.randomBytes(4).toString('hex')}`,
        orderId,
        status,
        location,
        note,
        timestamp: now,
      });
    });

    const updatedRows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const hydrated = await hydrateOrders(updatedRows);
    return hydrated[0] || null;
  } catch (error) {
    console.error('Database query failed in appendShipmentEventRecord:', error);
    throw new Error('Failed to update shipment checkpoint.', { cause: error });
  }
}

export async function listAdminMembers(): Promise<Member[]> {
  try {
    await ensureSeeded();
    const rows = await db.select().from(members).orderBy(desc(members.totalSpentHkd));
    return rows.map(mapMemberRow);
  } catch (error) {
    console.error('Database query failed in listAdminMembers:', error);
    throw new Error('Failed to load members.', { cause: error });
  }
}

export interface UpsertMemberInput {
  name: string;
  email: string;
  phone: string;
  district: string;
  tier: MemberTier;
  role?: MemberRole;
  preferredLang: Language;
  status: 'ACTIVE' | 'SUSPENDED';
  totalOrders?: number;
  totalSpentHkd?: number;
}

async function syncUserRoleByEmail(email: string, role: MemberRole, status: 'ACTIVE' | 'SUSPENDED') {
  const normalizedEmail = email.trim().toLowerCase();
  const userRole =
    isBootstrapAdminEmail(normalizedEmail) || (role === 'ADMIN' && status === 'ACTIVE')
      ? 'ADMIN'
      : 'CUSTOMER';
  await db
    .update(users)
    .set({ role: userRole, updatedAt: new Date() })
    .where(eq(users.email, normalizedEmail));
}

export async function findMemberByEmail(email: string): Promise<Member | null> {
  try {
    await ensureSeeded();
    const normalized = email.trim().toLowerCase();
    const rows = await db
      .select()
      .from(members)
      .where(eq(members.email, normalized))
      .limit(1);
    return rows.length > 0 ? mapMemberRow(rows[0]) : null;
  } catch (error) {
    console.error('Database query failed in findMemberByEmail:', error);
    throw new Error('Failed to look up member account.', { cause: error });
  }
}

export async function registerPublicMember(input: {
  name: string;
  email: string;
  phone: string;
  preferredLang: Language;
}): Promise<Member> {
  try {
    await ensureSeeded();
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      throw new OrderValidationError('이미 가입된 이메일입니다. 로그인 탭에서 로그인해 주세요.', 409);
    }

    const id = `mem-${crypto.randomBytes(5).toString('hex')}`;
    const now = new Date();
    // Always enforce MEMBER role on public self-registration
    const initialRole: MemberRole = isBootstrapAdminEmail(normalizedEmail) ? 'ADMIN' : 'MEMBER';
    const [inserted] = await db
      .insert(members)
      .values({
        id,
        name: input.name,
        email: normalizedEmail,
        phone: input.phone,
        district: 'Central & Western',
        tier: 'SILVER',
        role: initialRole,
        preferredLang: input.preferredLang,
        totalOrders: 0,
        totalSpentHkd: 0,
        status: 'ACTIVE',
        joinedAt: now,
        lastOrderAt: now,
      })
      .returning();

    return mapMemberRow(inserted);
  } catch (error) {
    if (error instanceof OrderValidationError) throw error;
    console.error('Database query failed in registerPublicMember:', error);
    throw new Error('회원가입을 완료할 수 없습니다. 잠시 후 다시 시도해 주세요.', { cause: error });
  }
}

export async function createMemberRecord(input: UpsertMemberInput): Promise<Member> {
  try {
    await ensureSeeded();
    const id = `mem-${crypto.randomBytes(5).toString('hex')}`;
    const now = new Date();
    const normalizedEmail = input.email.toLowerCase();
    const role: MemberRole =
      isBootstrapAdminEmail(normalizedEmail) || input.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';

    const [inserted] = await db
      .insert(members)
      .values({
        id,
        name: input.name,
        email: normalizedEmail,
        phone: input.phone,
        district: input.district,
        tier: input.tier,
        role,
        preferredLang: input.preferredLang,
        totalOrders: input.totalOrders ?? 0,
        totalSpentHkd: input.totalSpentHkd ?? 0,
        status: input.status,
        joinedAt: now,
        lastOrderAt: now,
      })
      .returning();

    await syncUserRoleByEmail(normalizedEmail, role, input.status);
    return mapMemberRow(inserted);
  } catch (error) {
    console.error('Database query failed in createMemberRecord:', error);
    throw new Error('Failed to create member. Email may already be registered.', { cause: error });
  }
}

export async function updateMemberRecord(
  memberId: string,
  patch: Partial<UpsertMemberInput>
): Promise<Member | null> {
  try {
    await ensureSeeded();
    const existing = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
    if (existing.length === 0) return null;

    const current = existing[0];
    const nextEmail = patch.email ? patch.email.toLowerCase() : current.email;
    const isOwner = isBootstrapAdminEmail(current.email) || isBootstrapAdminEmail(nextEmail);
    const nextRole: MemberRole = isOwner
      ? 'ADMIN'
      : patch.role
        ? patch.role
        : (current.role as MemberRole);
    const nextStatus: 'ACTIVE' | 'SUSPENDED' = isOwner
      ? 'ACTIVE'
      : patch.status ?? (current.status as 'ACTIVE' | 'SUSPENDED');

    const [updated] = await db
      .update(members)
      .set({
        name: patch.name ?? current.name,
        email: nextEmail,
        phone: patch.phone ?? current.phone,
        district: patch.district ?? current.district,
        tier: patch.tier ?? current.tier,
        role: nextRole,
        preferredLang: patch.preferredLang ?? current.preferredLang,
        status: nextStatus,
        totalOrders:
          patch.totalOrders !== undefined ? patch.totalOrders : current.totalOrders,
        totalSpentHkd:
          patch.totalSpentHkd !== undefined ? patch.totalSpentHkd : current.totalSpentHkd,
      })
      .where(eq(members.id, memberId))
      .returning();

    await syncUserRoleByEmail(updated.email, nextRole, nextStatus);
    return mapMemberRow(updated);
  } catch (error) {
    console.error('Database query failed in updateMemberRecord:', error);
    throw new Error('Failed to update member profile.', { cause: error });
  }
}

export async function deleteMemberRecord(memberId: string): Promise<boolean> {
  try {
    await ensureSeeded();
    const existing = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
    if (existing.length === 0) return false;
    if (isBootstrapAdminEmail(existing[0].email)) {
      throw new OrderValidationError('기본 최고 관리자 계정은 삭제할 수 없습니다.', 400);
    }

    const deleted = await db
      .delete(members)
      .where(eq(members.id, memberId))
      .returning({ id: members.id });

    await syncUserRoleByEmail(existing[0].email, 'MEMBER', 'SUSPENDED');
    return deleted.length > 0;
  } catch (error) {
    if (error instanceof OrderValidationError) throw error;
    console.error('Database query failed in deleteMemberRecord:', error);
    throw new Error('Failed to delete member.', { cause: error });
  }
}

export interface BulkImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function bulkUpsertProducts(
  rows: CreateProductInput[],
  initialErrors: string[] = []
): Promise<BulkImportSummary> {
  try {
    await ensureSeeded();
    let created = 0;
    let updated = 0;
    const errors = [...initialErrors];

    await db.transaction(async (tx) => {
      for (const row of rows) {
        const existing = await tx
          .select()
          .from(products)
          .where(eq(products.sku, row.sku))
          .limit(1);

        const now = new Date();
        if (existing.length > 0) {
          await tx
            .update(products)
            .set({
              category: row.category,
              name: row.name,
              subtitle: row.subtitle,
              description: row.description,
              ingredients: row.ingredients,
              volume: row.volume,
              priceHkd: row.priceHkd,
              compareAtHkd: row.compareAtHkd ?? null,
              stock: row.stock,
              status: row.status,
              imageUrl: row.imageUrl || existing[0].imageUrl,
              updatedAt: now,
            })
            .where(eq(products.id, existing[0].id));
          updated += 1;
        } else {
          await tx.insert(products).values({
            id: `prod-${crypto.randomBytes(5).toString('hex')}`,
            sku: row.sku,
            category: row.category,
            name: row.name,
            subtitle: row.subtitle,
            description: row.description,
            ingredients: row.ingredients,
            volume: row.volume,
            priceHkd: row.priceHkd,
            compareAtHkd: row.compareAtHkd ?? null,
            stock: row.stock,
            status: row.status,
            featured: true,
            tag: null,
            imageUrl: row.imageUrl,
            createdAt: now,
            updatedAt: now,
          });
          created += 1;
        }
      }
    });

    return {
      created,
      updated,
      skipped: initialErrors.length,
      errors: errors.slice(0, 20),
    };
  } catch (error) {
    console.error('Database transaction failed in bulkUpsertProducts:', error);
    throw new Error('Failed to import products from Excel.', { cause: error });
  }
}

export async function bulkUpsertMembers(
  rows: UpsertMemberInput[],
  initialErrors: string[] = []
): Promise<BulkImportSummary> {
  try {
    await ensureSeeded();
    let created = 0;
    let updated = 0;
    const errors = [...initialErrors];

    await db.transaction(async (tx) => {
      for (const row of rows) {
        const normalizedEmail = row.email.toLowerCase();
        const existing = await tx
          .select()
          .from(members)
          .where(eq(members.email, normalizedEmail))
          .limit(1);

        const now = new Date();
        const isOwner = isBootstrapAdminEmail(normalizedEmail);
        if (existing.length > 0) {
          const nextRole: MemberRole = isOwner
            ? 'ADMIN'
            : row.role ?? (existing[0].role as MemberRole);
          const nextStatus = isOwner ? 'ACTIVE' : row.status;
          await tx
            .update(members)
            .set({
              name: row.name,
              phone: row.phone,
              district: row.district,
              tier: row.tier,
              role: nextRole,
              preferredLang: row.preferredLang,
              status: nextStatus,
              totalOrders:
                row.totalOrders !== undefined ? row.totalOrders : existing[0].totalOrders,
              totalSpentHkd:
                row.totalSpentHkd !== undefined ? row.totalSpentHkd : existing[0].totalSpentHkd,
            })
            .where(eq(members.id, existing[0].id));
          await tx
            .update(users)
            .set({
              role: nextRole === 'ADMIN' && nextStatus === 'ACTIVE' ? 'ADMIN' : 'CUSTOMER',
              updatedAt: now,
            })
            .where(eq(users.email, normalizedEmail));
          updated += 1;
        } else {
          const nextRole: MemberRole = isOwner || row.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
          await tx.insert(members).values({
            id: `mem-${crypto.randomBytes(5).toString('hex')}`,
            name: row.name,
            email: normalizedEmail,
            phone: row.phone,
            district: row.district,
            tier: row.tier,
            role: nextRole,
            preferredLang: row.preferredLang,
            totalOrders: row.totalOrders ?? 0,
            totalSpentHkd: row.totalSpentHkd ?? 0,
            status: row.status,
            joinedAt: now,
            lastOrderAt: now,
          });
          created += 1;
        }
      }
    });

    return {
      created,
      updated,
      skipped: initialErrors.length,
      errors: errors.slice(0, 20),
    };
  } catch (error) {
    console.error('Database transaction failed in bulkUpsertMembers:', error);
    throw new Error('Failed to import members from Excel.', { cause: error });
  }
}

export async function computeAdminAnalytics(): Promise<AnalyticsSummary> {
  try {
    await ensureSeeded();
    const [allProducts, allOrders, allMembers] = await Promise.all([
      listAdminProducts(),
      listAdminOrders(),
      listAdminMembers(),
    ]);

    const totalRevenueHkd = allOrders.reduce((sum, o) => sum + o.totalHkd, 0);
    const totalOrders = allOrders.length;
    const averageOrderValueHkd = totalOrders > 0 ? Math.round(totalRevenueHkd / totalOrders) : 0;
    const activeMembers = allMembers.filter((m) => m.status === 'ACTIVE').length;
    const lowStockCount = allProducts.filter((p) => p.stock <= 10).length;
    const pendingFulfillmentCount = allOrders.filter((o) => o.orderStatus !== 'DELIVERED').length;

    const dayMap = new Map<string, { revenueHkd: number; orders: number }>();
    const baseDates = [
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
    ];
    for (const d of baseDates) {
      dayMap.set(d, { revenueHkd: 0, orders: 0 });
    }
    for (const order of allOrders) {
      const day = order.createdAt.slice(0, 10);
      const existing = dayMap.get(day) || { revenueHkd: 0, orders: 0 };
      existing.revenueHkd += order.totalHkd;
      existing.orders += 1;
      dayMap.set(day, existing);
    }
    const dailyRevenue = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({
        date: date.slice(5),
        revenueHkd: val.revenueHkd,
        orders: val.orders,
      }));

    const payMap = new Map<PaymentMethod, { amountHkd: number; count: number }>();
    const methods: PaymentMethod[] = ['FPS', 'OCTOPUS', 'PAYME', 'ALIPAY_HK', 'WECHAT_PAY_HK', 'CARD'];
    for (const m of methods) {
      payMap.set(m, { amountHkd: 0, count: 0 });
    }
    for (const order of allOrders) {
      const entry = payMap.get(order.paymentMethod) || { amountHkd: 0, count: 0 };
      entry.amountHkd += order.totalHkd;
      entry.count += 1;
      payMap.set(order.paymentMethod, entry);
    }
    const paymentBreakdown = Array.from(payMap.entries())
      .filter(([, v]) => v.count > 0)
      .map(([method, v]) => ({
        method,
        amountHkd: v.amountHkd,
        count: v.count,
      }))
      .sort((a, b) => b.amountHkd - a.amountHkd);

    const prodCategoryLookup = new Map<string, ProductCategory>();
    for (const p of allProducts) {
      prodCategoryLookup.set(p.id, p.category);
    }
    const catMap = new Map<ProductCategory, { revenueHkd: number; units: number }>();
    for (const order of allOrders) {
      for (const item of order.items) {
        const cat = prodCategoryLookup.get(item.productId) || 'serum';
        const cur = catMap.get(cat) || { revenueHkd: 0, units: 0 };
        cur.revenueHkd += item.lineTotalHkd;
        cur.units += item.quantity;
        catMap.set(cat, cur);
      }
    }
    const categoryBreakdown = Array.from(catMap.entries())
      .map(([category, v]) => ({
        category,
        revenueHkd: v.revenueHkd,
        units: v.units,
      }))
      .sort((a, b) => b.revenueHkd - a.revenueHkd);

    return {
      totalRevenueHkd,
      totalOrders,
      averageOrderValueHkd,
      activeMembers,
      lowStockCount,
      pendingFulfillmentCount,
      dailyRevenue,
      paymentBreakdown,
      categoryBreakdown,
    };
  } catch (error) {
    console.error('Database query failed in computeAdminAnalytics:', error);
    throw new Error('Failed to load revenue analytics.', { cause: error });
  }
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === 'string' &&
    ['CONFIRMED', 'PACKING', 'DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(value)
  );
}

export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    await ensureSeeded();
    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, SITE_CONFIG_KEY))
      .limit(1);

    if (rows.length === 0) {
      await db
        .insert(siteSettings)
        .values({
          key: SITE_CONFIG_KEY,
          value: DEFAULT_SITE_CONFIG,
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
      return DEFAULT_SITE_CONFIG;
    }

    const stored = rows[0].value;
    return {
      utilityStrip: stored.utilityStrip || DEFAULT_SITE_CONFIG.utilityStrip,
      headerMenu:
        Array.isArray(stored.headerMenu) && stored.headerMenu.length > 0
          ? stored.headerMenu
          : DEFAULT_SITE_CONFIG.headerMenu,
      hero: {
        ...DEFAULT_SITE_CONFIG.hero,
        ...(stored.hero || {}),
        proofItems:
          Array.isArray(stored.hero?.proofItems) && stored.hero.proofItems.length > 0
            ? stored.hero.proofItems
            : DEFAULT_SITE_CONFIG.hero.proofItems,
      },
      catalogSection: {
        ...DEFAULT_SITE_CONFIG.catalogSection,
        ...(stored.catalogSection || {}),
      },
      categories:
        Array.isArray(stored.categories) && stored.categories.length > 0
          ? stored.categories
          : DEFAULT_SITE_CONFIG.categories,
      story: {
        ...DEFAULT_SITE_CONFIG.story,
        ...(stored.story || {}),
        metrics: Array.isArray(stored.story?.metrics)
          ? stored.story.metrics
          : DEFAULT_SITE_CONFIG.story.metrics,
      },
      footer: {
        ...DEFAULT_SITE_CONFIG.footer,
        ...(stored.footer || {}),
        links: Array.isArray(stored.footer?.links)
          ? stored.footer.links
          : DEFAULT_SITE_CONFIG.footer.links,
      },
    };
  } catch (error) {
    console.error('Database query failed in getSiteConfig:', error);
    return DEFAULT_SITE_CONFIG;
  }
}

export async function saveSiteConfig(config: SiteConfig): Promise<SiteConfig> {
  try {
    const now = new Date();
    const [saved] = await db
      .insert(siteSettings)
      .values({
        key: SITE_CONFIG_KEY,
        value: config,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: {
          value: config,
          updatedAt: now,
        },
      })
      .returning();
    return saved.value;
  } catch (error) {
    console.error('Database query failed in saveSiteConfig:', error);
    throw new Error('Failed to save storefront settings.', { cause: error });
  }
}
