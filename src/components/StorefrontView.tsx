import { ArrowRight, Check, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatHkd, getCategoryLabel, t, UI_TEXT } from '../i18n/translations';
import type { Language, Product, SiteConfig } from '../types';
import { ResilientImage } from './BrandMark';

interface StorefrontViewProps {
  lang: Language;
  products: Product[];
  siteConfig: SiteConfig;
  activeCategory: string;
  onChangeCategory: (category: string) => void;
  loading: boolean;
  onAddToCart: (product: Product, quantity?: number) => void;
  onSelectProduct: (product: Product) => void;
  onOpenTracking: () => void;
}

export function StorefrontView({
  lang,
  products,
  siteConfig,
  activeCategory,
  onChangeCategory,
  loading,
  onAddToCart,
  onSelectProduct,
  onOpenTracking,
}: StorefrontViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const categoryTabs = useMemo(
    () => ['all', ...siteConfig.categories.map((c) => c.slug)],
    [siteConfig.categories]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCategory !== 'all' && p.category !== activeCategory) return false;
      if (!q) return true;
      return (
        p.sku.toLowerCase().includes(q) ||
        p.name.zh.toLowerCase().includes(q) ||
        p.name.en.toLowerCase().includes(q) ||
        p.name.ko.toLowerCase().includes(q) ||
        p.ingredients.zh.toLowerCase().includes(q) ||
        p.ingredients.en.toLowerCase().includes(q) ||
        p.ingredients.ko.toLowerCase().includes(q)
      );
    });
  }, [products, activeCategory, searchQuery]);

  const handleQuickAdd = (product: Product) => {
    if (product.stock <= 0 || product.status === 'OUT_OF_STOCK') return;
    onAddToCart(product, 1);
    setJustAddedId(product.id);
    window.setTimeout(() => {
      setJustAddedId((curr) => (curr === product.id ? null : curr));
    }, 1400);
  };

  const heroImageLeft = siteConfig.hero.imagePosition === 'left';
  const storyImageRight = siteConfig.story.imagePosition === 'right';

  return (
    <div id="top">
      {/* SECTION 1: HERO SPLIT + FULL-WIDTH PROOF STRIP */}
      <section className="border-b border-[#E2E8F0] bg-white">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div
              className={`lg:col-span-5 flex flex-col justify-center py-2 lg:py-6 ${
                heroImageLeft ? 'lg:order-2' : 'lg:order-1'
              }`}
            >
              <p className="text-xs font-medium text-[#1E4E79] tracking-wide">
                {t(siteConfig.hero.kicker, lang)}
              </p>
              <h1 className="mt-4 font-display text-[clamp(2.35rem,4vw,3.65rem)] font-medium leading-[1.08] tracking-tight text-[#0D1B2A]">
                {t(siteConfig.hero.headline, lang)}
              </h1>
              <p className="mt-5 text-sm sm:text-base text-[#4A607A] leading-relaxed max-w-[56ch]">
                {t(siteConfig.hero.subhead, lang)}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#catalog"
                  className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-[#1E4E79] hover:bg-[#163B5C] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{t(siteConfig.hero.ctaPrimary, lang)}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={onOpenTracking}
                  className="inline-flex items-center justify-center h-11 px-5 border border-[#CBD5E1] text-[#0D1B2A] hover:bg-[#F2F5F8] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  {t(siteConfig.hero.ctaSecondary, lang)}
                </button>
              </div>
            </div>

            <div
              className={`lg:col-span-7 bg-[#F2F5F8] overflow-hidden min-h-[280px] sm:min-h-[380px] lg:min-h-[460px] ${
                heroImageLeft ? 'lg:order-1' : 'lg:order-2'
              }`}
            >
              <ResilientImage
                src={siteConfig.hero.imageUrl}
                alt={t(siteConfig.hero.headline, lang)}
                fallbackTitle="DUFREEZ Hong Kong"
                className="w-full h-full lg:h-full object-cover"
              />
            </div>
          </div>

          {/* Full-width Proof Strip */}
          {siteConfig.hero.proofItems.length > 0 && (
            <div className="mt-10 lg:mt-12 pt-8 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {siteConfig.hero.proofItems.map((item, idx) => (
                <div key={idx}>
                  <div className="text-xs text-[#4A607A]">{t(item.label, lang)}</div>
                  <div className="mt-1 text-sm font-semibold text-[#0D1B2A] tabular-nums">
                    {t(item.value, lang)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: SIGNATURE FORMULATIONS & DYNAMIC CATEGORY FILTER */}
      <section id="catalog" className="max-w-[1440px] mx-auto px-6 lg:px-12 py-16 lg:py-20">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#E2E8F0]">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#0D1B2A] tracking-tight">
              {t(siteConfig.catalogSection.title, lang)}
            </h2>
            <p className="mt-2.5 text-sm text-[#4A607A] leading-relaxed">
              {t(siteConfig.catalogSection.description, lang)}
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-[#7B8FA6] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(UI_TEXT.catalog.searchPlaceholder, lang)}
              className="w-full h-10 pl-10 pr-4 bg-white border border-[#CBD5E1] text-sm text-[#0D1B2A] placeholder:text-[#7B8FA6] focus:border-[#1E4E79] focus:outline-none"
            />
          </div>
        </div>

        {/* Dynamic Category Filter Controls ('all' pinned first) */}
        <div
          id="collections"
          className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-2"
          role="tablist"
          aria-label="Product categories"
        >
          {categoryTabs.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChangeCategory(cat)}
                className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#0D1B2A] text-white'
                    : 'bg-[#F2F5F8] text-[#4A607A] hover:text-[#0D1B2A]'
                }`}
              >
                {getCategoryLabel(cat, siteConfig.categories, lang)}
              </button>
            );
          })}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-[#E2E8F0] animate-pulse">
                <div className="aspect-[4/3] bg-[#F2F5F8]" />
                <div className="p-6 space-y-3">
                  <div className="h-3 bg-[#E2E8F0] w-1/3" />
                  <div className="h-5 bg-[#E2E8F0] w-3/4" />
                  <div className="h-4 bg-[#F2F5F8] w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-10 bg-white border border-[#E2E8F0] p-12 text-center">
            <p className="text-sm text-[#4A607A]">{t(UI_TEXT.catalog.noResults, lang)}</p>
            <button
              type="button"
              onClick={() => {
                onChangeCategory('all');
                setSearchQuery('');
              }}
              className="mt-4 px-5 py-2 border border-[#CBD5E1] text-xs font-medium text-[#0D1B2A] hover:bg-[#F2F5F8] transition-colors"
            >
              {t(UI_TEXT.catalog.resetFilters, lang)}
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => {
              const soldOut = product.stock <= 0 || product.status === 'OUT_OF_STOCK';
              const lowStock = !soldOut && product.stock <= 10;
              const added = justAddedId === product.id;

              return (
                <article
                  key={product.id}
                  className="group bg-white border border-[#E2E8F0] flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <button
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    className="block w-full aspect-[4/3] bg-[#F2F5F8] overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-[#1E4E79]"
                  >
                    <ResilientImage
                      src={product.imageUrl}
                      alt={t(product.name, lang)}
                      fallbackTitle={t(product.name, lang)}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </button>

                  <div className="p-6 flex-1 flex flex-col justify-between gap-5">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#4A607A]">
                        <span>{getCategoryLabel(product.category, siteConfig.categories, lang)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{product.volume}</span>
                        {product.tag && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#1E4E79] font-medium">
                              {t(product.tag, lang)}
                            </span>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectProduct(product)}
                        className="mt-2 block text-left"
                      >
                        <h3 className="text-base font-semibold text-[#0D1B2A] group-hover:text-[#1E4E79] transition-colors">
                          {t(product.name, lang)}
                        </h3>
                      </button>

                      <p className="mt-1.5 text-xs text-[#4A607A] line-clamp-2 leading-relaxed">
                        {t(product.subtitle, lang)}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[15px] font-semibold text-[#0D1B2A] tabular-nums">
                            {formatHkd(product.priceHkd)}
                          </span>
                          {product.compareAtHkd && product.compareAtHkd > product.priceHkd && (
                            <span className="text-xs text-[#7B8FA6] line-through tabular-nums">
                              {formatHkd(product.compareAtHkd)}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#4A607A] mt-0.5">
                          {soldOut
                            ? t(UI_TEXT.catalog.outOfStock, lang)
                            : lowStock
                              ? `${t(UI_TEXT.catalog.lowStock, lang)} (${product.stock})`
                              : t(UI_TEXT.catalog.inStock, lang)}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={soldOut}
                        onClick={() => handleQuickAdd(product)}
                        className={`h-10 px-4 text-xs font-medium transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                          soldOut
                            ? 'bg-[#E2E8F0] text-[#7B8FA6] cursor-not-allowed'
                            : added
                              ? 'bg-[#16A34A] text-white'
                              : 'bg-[#0D1B2A] hover:bg-[#1E4E79] text-white'
                        }`}
                      >
                        {added && <Check className="w-3.5 h-3.5" />}
                        <span>
                          {soldOut
                            ? t(UI_TEXT.catalog.outOfStock, lang)
                            : added
                              ? t(UI_TEXT.catalog.added, lang)
                              : t(UI_TEXT.catalog.addToBag, lang)}
                        </span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 3: DYNAMIC BOTTOM BRAND STORY / ATELIER */}
      {siteConfig.story.visible && (
        <section id="story" className="border-t border-[#E2E8F0] bg-white">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-16 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div
                className={`lg:col-span-6 bg-[#F2F5F8] overflow-hidden min-h-[300px] ${
                  storyImageRight ? 'lg:order-2' : 'lg:order-1'
                }`}
              >
                <ResilientImage
                  src={siteConfig.story.imageUrl}
                  alt={t(siteConfig.story.title, lang)}
                  fallbackTitle="DUFREEZ Central Atelier"
                  className="w-full h-full lg:h-full object-cover"
                />
              </div>

              <div
                className={`lg:col-span-6 flex flex-col justify-center ${
                  storyImageRight ? 'lg:order-1' : 'lg:order-2'
                }`}
              >
                <p className="text-xs font-medium text-[#1E4E79] tracking-wide">
                  {t(siteConfig.story.kicker, lang)}
                </p>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl font-medium text-[#0D1B2A] leading-tight">
                  {t(siteConfig.story.title, lang)}
                </h2>
                <p className="mt-4 text-sm sm:text-base text-[#2C3E50] leading-relaxed">
                  {t(siteConfig.story.body1, lang)}
                </p>
                {siteConfig.story.body2[lang] && (
                  <p className="mt-3 text-sm text-[#4A607A] leading-relaxed">
                    {t(siteConfig.story.body2, lang)}
                  </p>
                )}

                {siteConfig.story.metrics.length > 0 && (
                  <dl className="mt-8 pt-6 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {siteConfig.story.metrics.map((metric, idx) => (
                      <div key={idx}>
                        <dt className="text-sm font-semibold text-[#0D1B2A]">
                          {t(metric.title, lang)}
                        </dt>
                        <dd className="mt-1 text-xs text-[#4A607A] leading-relaxed">
                          {t(metric.description, lang)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
