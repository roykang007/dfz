import { Check, MapPin, Package, Search, Truck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { lookupTracking, type TrackingResult } from '../api/client';
import {
  formatHkd,
  ORDER_STATUS_LABELS,
  PAYMENT_LABELS,
  t,
  UI_TEXT,
} from '../i18n/translations';
import type { Language, OrderStatus } from '../types';
import { ResilientImage } from './BrandMark';

const STATUS_SEQUENCE: OrderStatus[] = [
  'CONFIRMED',
  'PACKING',
  'DISPATCHED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

const SAMPLE_ORDERS = ['DF-2026-1042', 'DF-2026-1041', 'DF-2026-1040'];

interface TrackingViewProps {
  lang: Language;
  initialQuery?: string;
}

export function TrackingView({ lang, initialQuery = '' }: TrackingViewProps) {
  const [query, setQuery] = useState(initialQuery || 'DF-2026-1042');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runSearch = async (target: string) => {
    const cleaned = target.trim();
    if (!cleaned) return;
    setLoading(true);
    setError('');
    try {
      const data = await lookupTracking(cleaned);
      setResult(data);
    } catch {
      setResult(null);
      setError(t(UI_TEXT.tracking.notFound, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const target = initialQuery || 'DF-2026-1042';
    setQuery(target);
    void runSearch(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runSearch(query);
  };

  const currentStageIndex = result ? STATUS_SEQUENCE.indexOf(result.orderStatus) : -1;

  return (
    <section className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl sm:text-5xl font-medium text-[#0D1B2A] tracking-tight">
          {t(UI_TEXT.tracking.title, lang)}
        </h1>
        <p className="mt-3 text-sm sm:text-base text-[#4A607A] leading-relaxed">
          {t(UI_TEXT.tracking.subtitle, lang)}
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7B8FA6] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(UI_TEXT.tracking.placeholder, lang)}
            className="w-full h-11 pl-10 pr-4 bg-white border border-[#CBD5E1] text-sm font-mono text-[#0D1B2A] focus:border-[#1E4E79] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="h-11 px-6 bg-[#1E4E79] hover:bg-[#163B5C] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
        >
          {t(UI_TEXT.tracking.searchBtn, lang)}
        </button>
      </form>

      {/* Quick Sample Lookup Buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#4A607A]">
        <span>{t(UI_TEXT.tracking.quickDemo, lang)}</span>
        {SAMPLE_ORDERS.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => {
              setQuery(num);
              void runSearch(num);
            }}
            className="font-mono text-[#1E4E79] hover:underline underline-offset-4 whitespace-nowrap"
          >
            {num}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-8 p-4 bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#B91C1C]">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-8 bg-white border border-[#E2E8F0] p-8 animate-pulse space-y-4">
          <div className="h-6 bg-[#E2E8F0] w-1/3" />
          <div className="h-4 bg-[#F2F5F8] w-2/3" />
          <div className="h-24 bg-[#F2F5F8] w-full" />
        </div>
      )}

      {!loading && result && (
        <div className="mt-10 bg-white border border-[#E2E8F0]">
          {/* Summary Header Strip */}
          <div className="p-6 sm:p-8 border-b border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-[#4A607A]">{t(UI_TEXT.cart.orderNumber, lang)}</div>
              <div className="mt-1 font-mono text-base font-semibold text-[#0D1B2A] tabular-nums">
                {result.orderNumber}
              </div>
              <div className="mt-1 text-xs font-medium text-[#1E4E79]">
                {t(ORDER_STATUS_LABELS[result.orderStatus], lang)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#4A607A]">{t(UI_TEXT.tracking.courierLabel, lang)}</div>
              <div className="mt-1 text-sm font-medium text-[#0D1B2A]">{result.courier}</div>
              <div className="mt-0.5 font-mono text-xs text-[#4A607A] tabular-nums">
                {result.trackingNumber}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#4A607A]">{t(UI_TEXT.tracking.destinationLabel, lang)}</div>
              <div className="mt-1 text-sm font-medium text-[#0D1B2A]">{result.district}, Hong Kong</div>
            </div>
            <div>
              <div className="text-xs text-[#4A607A]">{t(UI_TEXT.tracking.paymentLabel, lang)}</div>
              <div className="mt-1 text-sm font-medium text-[#0D1B2A]">
                {t(PAYMENT_LABELS[result.paymentMethod].name, lang)}
              </div>
              <div className="mt-0.5 font-mono text-xs text-[#4A607A] tabular-nums">
                {formatHkd(result.totalHkd)}
              </div>
            </div>
          </div>

          {/* 6-Stage Progress Rail */}
          <div className="px-6 sm:px-8 py-6 bg-[#FAFBFD] border-b border-[#E2E8F0] overflow-x-auto">
            <div className="grid grid-cols-6 min-w-[640px] gap-2">
              {STATUS_SEQUENCE.map((stage, idx) => {
                const completed = idx <= currentStageIndex;
                const active = idx === currentStageIndex;
                return (
                  <div key={stage} className="flex flex-col items-start">
                    <div className="flex items-center w-full">
                      <div
                        className={`w-6 h-6 flex items-center justify-center text-xs shrink-0 ${
                          completed
                            ? 'bg-[#1E4E79] text-white'
                            : 'bg-[#E2E8F0] text-[#7B8FA6]'
                        }`}
                      >
                        {completed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      {idx < STATUS_SEQUENCE.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 mx-2 ${
                            idx < currentStageIndex ? 'bg-[#1E4E79]' : 'bg-[#E2E8F0]'
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`mt-2.5 text-xs leading-snug pr-2 ${
                        active
                          ? 'font-semibold text-[#0D1B2A]'
                          : completed
                            ? 'text-[#2C3E50]'
                            : 'text-[#94A3B8]'
                      }`}
                    >
                      {t(ORDER_STATUS_LABELS[stage], lang)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Split Body: Chronological Timeline + Items */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0]">
            <div className="lg:col-span-7 p-6 sm:p-8">
              <h2 className="text-sm font-semibold text-[#0D1B2A] flex items-center gap-2 mb-6">
                <Truck className="w-4 h-4 text-[#1E4E79]" />
                {t(UI_TEXT.tracking.timelineTitle, lang)}
              </h2>
              <ol className="space-y-6">
                {[...result.shipmentEvents].reverse().map((ev, index) => (
                  <li key={ev.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-2.5 h-2.5 mt-1.5 shrink-0 ${
                          index === 0 ? 'bg-[#1E4E79]' : 'bg-[#CBD5E1]'
                        }`}
                      />
                      {index < result.shipmentEvents.length - 1 && (
                        <div className="w-px flex-1 bg-[#E2E8F0] mt-2" />
                      )}
                    </div>
                    <div className="pb-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#4A607A]">
                        <span className="font-semibold text-[#0D1B2A]">
                          {t(ORDER_STATUS_LABELS[ev.status], lang)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {new Date(ev.timestamp).toLocaleString('en-HK', {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#2C3E50]">{t(ev.note, lang)}</p>
                      <div className="mt-1 inline-flex items-center gap-1 text-xs text-[#4A607A]">
                        <MapPin className="w-3 h-3 text-[#7B8FA6]" />
                        <span>{t(ev.location, lang)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="lg:col-span-5 p-6 sm:p-8 bg-[#FAFBFD]">
              <h2 className="text-sm font-semibold text-[#0D1B2A] flex items-center gap-2 mb-5">
                <Package className="w-4 h-4 text-[#1E4E79]" />
                {t(UI_TEXT.tracking.itemsTitle, lang)}
              </h2>
              <ul className="divide-y divide-[#E2E8F0]">
                {result.items.map((item) => (
                  <li key={`${item.productId}-${item.sku}`} className="py-3.5 flex items-center gap-3.5">
                    <ResilientImage
                      src={item.imageUrl}
                      alt={t(item.name, lang)}
                      className="w-14 h-14 object-cover bg-[#F2F5F8] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#0D1B2A] truncate">
                        {t(item.name, lang)}
                      </div>
                      <div className="text-xs text-[#4A607A] font-mono tabular-nums mt-0.5">
                        {item.sku} · ×{item.quantity}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-[#0D1B2A] tabular-nums">
                      {formatHkd(item.lineTotalHkd)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
