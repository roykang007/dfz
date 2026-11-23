import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { LogOut, Shield, ShoppingBag, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchCurrentUser,
  fetchProducts,
  fetchSiteConfig,
  type AuthenticatedUserProfile,
} from './api/client';
import { AdminAuthGate } from './components/AdminAuthGate';
import { AdminConsole } from './components/AdminConsole';
import { DufreezLogoMark } from './components/BrandMark';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { MemberAuthModal } from './components/MemberAuthModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { StorefrontView } from './components/StorefrontView';
import { TrackingView } from './components/TrackingView';
import { t, UI_TEXT } from './i18n/translations';
import { DEFAULT_SITE_CONFIG } from './lib/defaultSiteConfig';
import { auth } from './lib/firebase';
import type {
  CartItem,
  HeaderMenuActionType,
  Language,
  Product,
  SiteConfig,
} from './types';

type RouteView = 'storefront' | 'tracking' | 'admin';

export default function App() {
  const [lang, setLang] = useState<Language>('ko');
  const [view, setView] = useState<RouteView>('storefront');
  const [trackingQuery, setTrackingQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Unified session token & profile held strictly in React state memory (never localStorage)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const isAdmin = currentUser?.role === 'ADMIN' && Boolean(authToken);

  const loadCatalog = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [list, config] = await Promise.all([
        fetchProducts(),
        fetchSiteConfig().catch(() => DEFAULT_SITE_CONFIG),
      ]);
      setProducts(list);
      setSiteConfig(config);
    } catch {
      // Preserve UI stability if a transient error occurs
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // Keep member-session token intact if user logged in via Email+Phone
        setCheckingAuth(false);
        return;
      }
      try {
        const idToken = await firebaseUser.getIdToken();
        const profile = await fetchCurrentUser(idToken);
        setAuthToken(idToken);
        setCurrentUser(profile);
      } catch {
        setAuthToken(null);
        setCurrentUser(null);
      } finally {
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleNavAction = (actionType: HeaderMenuActionType, target: string) => {
    if (actionType === 'view') {
      if (target === 'admin' && !isAdmin) {
        setAuthModalMode('login');
        setAuthModalOpen(true);
        return;
      }
      const nextView: RouteView =
        target === 'tracking' ? 'tracking' : target === 'admin' ? 'admin' : 'storefront';
      setView(nextView);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (actionType === 'category') {
      setActiveCategory(target || 'all');
      setView('storefront');
      window.setTimeout(() => {
        const el = document.getElementById('catalog');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
      return;
    }

    if (actionType === 'section') {
      setView('storefront');
      const sectionId = target.replace(/^#/, '');
      if (!sectionId || sectionId === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      window.setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  };

  const handleAddToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(product.stock, item.quantity + quantity) }
            : item
        );
      }
      return [...prev, { product, quantity: Math.min(product.stock, quantity) }];
    });
  };

  const handleUpdateQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleTrackOrder = (orderNumber: string) => {
    setTrackingQuery(orderNumber);
    setView('tracking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    await firebaseSignOut(auth).catch(() => undefined);
    setAuthToken(null);
    setCurrentUser(null);
    setView('storefront');
  };

  const totalBagCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Only show Admin menu links when the logged-in member has ADMIN role
  const visibleHeaderMenu = siteConfig.headerMenu.filter((item) => {
    if (!item.visible) return false;
    if (item.actionType === 'view' && item.target === 'admin') {
      return isAdmin;
    }
    return true;
  });

  const headerAlreadyShowsAdmin = visibleHeaderMenu.some(
    (item) => item.actionType === 'view' && item.target === 'admin'
  );

  const visibleFooterLinks = siteConfig.footer.links.filter((link) => {
    if (link.actionType === 'view' && link.target === 'admin') {
      return isAdmin;
    }
    return true;
  });

  // Dedicated Admin Route
  if (view === 'admin') {
    if (!isAdmin || !authToken) {
      return (
        <AdminAuthGate
          lang={lang}
          checkingSession={checkingAuth}
          nonAdminProfile={currentUser && currentUser.role !== 'ADMIN' ? currentUser : null}
          onAuthenticated={(token, profile) => {
            setAuthToken(token);
            setCurrentUser(profile);
          }}
          onReturnStorefront={() => setView('storefront')}
          onSwitchAccount={() => {
            setAuthToken(null);
            setCurrentUser(null);
          }}
        />
      );
    }
    return (
      <AdminConsole
        token={authToken}
        lang={lang}
        siteConfig={siteConfig}
        onChangeLang={setLang}
        onSignOut={() => void handleSignOut()}
        onReturnStorefront={() => setView('storefront')}
        onCatalogMutated={() => void loadCatalog()}
        onSiteConfigUpdated={(next) => {
          setSiteConfig(next);
          if (
            activeCategory !== 'all' &&
            !next.categories.some((c) => c.slug === activeCategory)
          ) {
            setActiveCategory('all');
          }
        }}
        onTrackOrder={handleTrackOrder}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD] text-[#0D1B2A]">
      {/* Slim Non-Sticky Hong Kong Utility & Language Bar (36px) */}
      <div className="bg-[#0D1B2A] text-[#E2E8F0] text-[11px] sm:text-xs">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 h-9 flex items-center justify-between gap-4">
          <p className="truncate">{t(siteConfig.utilityStrip, lang)}</p>
          <div className="flex items-center gap-3 shrink-0">
            {(['zh', 'en', 'ko'] as Language[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  lang === code
                    ? 'text-white font-semibold underline underline-offset-4'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {code === 'zh' ? '繁體中文' : code === 'en' ? 'English' : '한국어'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Strict 3-Zone Top Bar Contract (Sticky, 64px height) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              setView('storefront');
              setActiveCategory('all');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2.5 text-[#0D1B2A] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#1E4E79]"
          >
            <DufreezLogoMark className="w-6 h-6 text-[#1E4E79]" />
            <span className="font-display text-2xl font-semibold tracking-tight">DUFREEZ</span>
          </button>

          {/* Zone 2: Dynamic Single-Line Header Navigation (Admin item visible only to designated ADMIN) */}
          <nav
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#4A607A] overflow-x-auto"
            aria-label="Primary navigation"
          >
            {visibleHeaderMenu.map((item) => {
              if (item.actionType === 'url' && item.target.startsWith('https://')) {
                return (
                  <a
                    key={item.id}
                    href={item.target}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#0D1B2A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
                  >
                    {t(item.label, lang)}
                  </a>
                );
              }
              const isActive =
                (item.actionType === 'view' && item.target === view) ||
                (item.actionType === 'category' &&
                  view === 'storefront' &&
                  activeCategory === item.target);
              const isAdminNav = item.actionType === 'view' && item.target === 'admin';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavAction(item.actionType, item.target)}
                  className={`inline-flex items-center gap-1.5 hover:text-[#0D1B2A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-[#1E4E79] underline'
                      : isAdminNav
                        ? 'text-[#1E4E79] font-semibold'
                        : ''
                  }`}
                >
                  {isAdminNav && <Shield className="w-3.5 h-3.5" />}
                  <span>{t(item.label, lang)}</span>
                </button>
              );
            })}
            {isAdmin && !headerAlreadyShowsAdmin && (
              <button
                type="button"
                onClick={() => {
                  setView('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 text-[#1E4E79] font-semibold hover:underline underline-offset-4 whitespace-nowrap shrink-0"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{t(UI_TEXT.nav.admin, lang)}</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Member Auth + Shopping Bag */}
          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2.5 text-xs text-[#4A607A]">
                <span className="hidden sm:inline-flex items-center gap-1.5 font-medium text-[#0D1B2A] max-w-[140px] truncate">
                  <User className="w-3.5 h-3.5 text-[#1E4E79] shrink-0" />
                  <span className="truncate">{currentUser.name || currentUser.email}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="inline-flex items-center gap-1 text-xs text-[#4A607A] hover:text-[#0D1B2A] transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t(UI_TEXT.nav.logout, lang)}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('login');
                  setAuthModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 h-10 px-3 text-xs font-medium text-[#0D1B2A] hover:text-[#1E4E79] transition-colors whitespace-nowrap shrink-0"
              >
                <User className="w-3.5 h-3.5" />
                <span>{t(UI_TEXT.nav.loginSignup, lang)}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex items-center gap-2 h-10 px-4 bg-[#0D1B2A] hover:bg-[#1E4E79] text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E4E79]"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{t(UI_TEXT.nav.bag, lang)}</span>
              <span className="font-mono tabular-nums">({totalBagCount})</span>
            </button>
          </div>
        </div>

        {/* Mobile Quick Nav Row */}
        <div className="md:hidden border-t border-[#E2E8F0] px-6 py-2 flex items-center gap-5 overflow-x-auto text-xs font-medium text-[#4A607A]">
          {visibleHeaderMenu.map((item) =>
            item.actionType === 'url' && item.target.startsWith('https://') ? (
              <a
                key={item.id}
                href={item.target}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap shrink-0 hover:text-[#0D1B2A]"
              >
                {t(item.label, lang)}
              </a>
            ) : (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavAction(item.actionType, item.target)}
                className="whitespace-nowrap shrink-0 hover:text-[#0D1B2A]"
              >
                {t(item.label, lang)}
              </button>
            )
          )}
          {isAdmin && !headerAlreadyShowsAdmin && (
            <button
              type="button"
              onClick={() => setView('admin')}
              className="whitespace-nowrap shrink-0 text-[#1E4E79] font-semibold"
            >
              {t(UI_TEXT.nav.admin, lang)}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {view === 'storefront' && (
          <StorefrontView
            lang={lang}
            products={products}
            siteConfig={siteConfig}
            activeCategory={activeCategory}
            onChangeCategory={setActiveCategory}
            loading={loadingProducts}
            onAddToCart={handleAddToCart}
            onSelectProduct={setSelectedProduct}
            onOpenTracking={() => {
              setView('tracking');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
        {view === 'tracking' && <TrackingView lang={lang} initialQuery={trackingQuery} />}
      </main>

      {/* Dynamic Editorial Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-[#0D1B2A]">
              <DufreezLogoMark className="w-5 h-5 text-[#1E4E79]" />
              <span className="font-display text-lg font-semibold tracking-tight">
                {siteConfig.footer.brandTitle}
              </span>
            </div>
            <p className="mt-2 text-xs text-[#4A607A]">
              {t(siteConfig.footer.tagline, lang)}
              {siteConfig.footer.contactEmail ? ` · ${siteConfig.footer.contactEmail}` : ''}
              {siteConfig.footer.contactPhone ? ` · ${siteConfig.footer.contactPhone}` : ''}
            </p>
            {siteConfig.footer.businessHours[lang] && (
              <p className="mt-1 text-xs text-[#4A607A]">
                {t(siteConfig.footer.businessHours, lang)}
              </p>
            )}
            <p className="mt-1 text-xs text-[#7B8FA6]">{t(siteConfig.footer.rights, lang)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#4A607A]">
            {siteConfig.footer.paymentNotice && <span>{siteConfig.footer.paymentNotice}</span>}
            {visibleFooterLinks.map((link) =>
              link.actionType === 'url' && link.target.startsWith('https://') ? (
                <a
                  key={link.id}
                  href={link.target}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1E4E79] hover:underline underline-offset-4 whitespace-nowrap"
                >
                  {t(link.label, lang)}
                </a>
              ) : (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleNavAction(link.actionType, link.target)}
                  className="text-[#1E4E79] hover:underline underline-offset-4 whitespace-nowrap"
                >
                  {t(link.label, lang)}
                </button>
              )
            )}
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <MemberAuthModal
        open={authModalOpen}
        lang={lang}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(token, profile) => {
          setAuthToken(token);
          setCurrentUser(profile);
        }}
      />

      <ProductDetailModal
        product={selectedProduct}
        lang={lang}
        categories={siteConfig.categories}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <CartCheckoutDrawer
        open={cartOpen}
        lang={lang}
        items={cart}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onOrderSuccess={() => {
          setCart([]);
          void loadCatalog();
        }}
        onTrackOrder={handleTrackOrder}
      />
    </div>
  );
}
