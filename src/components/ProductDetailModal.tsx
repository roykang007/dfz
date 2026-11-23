import { Minus, Plus, ShieldCheck, Truck, X } from 'lucide-react';
import { useState } from 'react';
import { formatHkd, getCategoryLabel, t, UI_TEXT } from '../i18n/translations';
import type { CategoryItem, Language, Product } from '../types';
import { ResilientImage } from './BrandMark';

interface ProductDetailModalProps {
  product: Product | null;
  lang: Language;
  categories?: CategoryItem[];
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

export function ProductDetailModal({
  product,
  lang,
  categories,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const soldOut = product.stock <= 0 || product.status === 'OUT_OF_STOCK';

  const handleAdd = () => {
    if (soldOut) return;
    onAddToCart(product, quantity);
    setQuantity(1);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1B2A]/50 backdrop-blur-[2px] p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white border border-[#E2E8F0] shadow-xl overflow-hidden max-h-[92vh] flex flex-col lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product details"
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/90 text-[#0D1B2A] border border-[#E2E8F0] hover:bg-[#F2F5F8] transition-colors focus-visible:outline-2 focus-visible:outline-[#1E4E79]"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left: Studio Photography */}
        <div className="lg:w-1/2 bg-[#F2F5F8] flex items-center justify-center">
          <ResilientImage
            src={product.imageUrl}
            alt={t(product.name, lang)}
            fallbackTitle={t(product.name, lang)}
            className="w-full h-72 sm:h-88 lg:h-full object-cover"
          />
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:w-1/2 p-6 sm:p-8 overflow-y-auto flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-[#4A607A]">
              <span>{getCategoryLabel(product.category, categories, lang)}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{product.sku}</span>
              {product.tag && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#1E4E79] font-medium">{t(product.tag, lang)}</span>
                </>
              )}
            </div>

            <div>
              <h2
                id="pdp-title"
                className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-[#0D1B2A] leading-tight"
              >
                {t(product.name, lang)}
              </h2>
              <p className="mt-1.5 text-sm text-[#4A607A]">{t(product.subtitle, lang)}</p>
            </div>

            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-2xl font-semibold text-[#0D1B2A] tabular-nums">
                {formatHkd(product.priceHkd)}
              </span>
              {product.compareAtHkd && product.compareAtHkd > product.priceHkd && (
                <span className="text-sm text-[#7B8FA6] line-through tabular-nums">
                  {formatHkd(product.compareAtHkd)}
                </span>
              )}
              <span className="ml-auto text-xs text-[#4A607A] tabular-nums">
                {soldOut
                  ? t(UI_TEXT.catalog.outOfStock, lang)
                  : `${t(UI_TEXT.catalog.stockLeft, lang)}: ${product.stock}`}
              </span>
            </div>

            <div className="h-px bg-[#E2E8F0]" />

            <p className="text-sm leading-relaxed text-[#2C3E50]">{t(product.description, lang)}</p>

            <dl className="grid grid-cols-1 gap-3 pt-2 text-xs border-t border-[#E2E8F0]">
              <div>
                <dt className="text-[#4A607A] font-medium">{t(UI_TEXT.catalog.keyIngredients, lang)}</dt>
                <dd className="mt-1 text-[#0D1B2A] leading-relaxed">{t(product.ingredients, lang)}</dd>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                <dt className="text-[#4A607A] font-medium">{t(UI_TEXT.catalog.volume, lang)}</dt>
                <dd className="font-mono text-[#0D1B2A] tabular-nums">{product.volume}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-4 pt-4 border-t border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-[#E2E8F0] h-11">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={soldOut || quantity <= 1}
                  aria-label="Decrease quantity"
                  className="w-10 h-full flex items-center justify-center text-[#0D1B2A] hover:bg-[#F2F5F8] disabled:opacity-40 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-medium tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, product.stock), q + 1))}
                  disabled={soldOut || quantity >= product.stock}
                  aria-label="Increase quantity"
                  className="w-10 h-full flex items-center justify-center text-[#0D1B2A] hover:bg-[#F2F5F8] disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={soldOut}
                className="flex-1 h-11 px-6 bg-[#1E4E79] hover:bg-[#163B5C] disabled:bg-[#94A3B8] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E4E79]"
              >
                {soldOut
                  ? t(UI_TEXT.catalog.outOfStock, lang)
                  : `${t(UI_TEXT.catalog.addToBag, lang)} · ${formatHkd(product.priceHkd * quantity)}`}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#4A607A]">
              <span className="inline-flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#1E4E79]" />
                {t(UI_TEXT.hero.proof1Label, lang)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1E4E79]" />
                {t(UI_TEXT.hero.proof3Value, lang)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
