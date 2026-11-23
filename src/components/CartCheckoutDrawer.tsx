import { ArrowLeft, CheckCircle2, CreditCard, Minus, Plus, QrCode, ShoppingBag, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { placeOrder } from '../api/client';
import {
  DELIVERY_LABELS,
  formatHkd,
  HK_DISTRICTS,
  PAYMENT_LABELS,
  t,
  UI_TEXT,
} from '../i18n/translations';
import type { CartItem, DeliveryMethod, Language, Order, PaymentMethod } from '../types';
import { ResilientImage } from './BrandMark';

interface CartCheckoutDrawerProps {
  open: boolean;
  lang: Language;
  items: CartItem[];
  onClose: () => void;
  onUpdateQty: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onOrderSuccess: (order: Order) => void;
  onTrackOrder: (orderNumber: string) => void;
}

const FREE_SHIPPING_THRESHOLD = 480;

export function CartCheckoutDrawer({
  open,
  lang,
  items,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onOrderSuccess,
  onTrackOrder,
}: CartCheckoutDrawerProps) {
  const [step, setStep] = useState<'bag' | 'checkout' | 'confirmed'>('bag');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+852 ');
  const [district, setDistrict] = useState(HK_DISTRICTS[0].id);
  const [address, setAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('SF_DOOR');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('FPS');
  const [cardLast4, setCardLast4] = useState('4242');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  if (!open) return null;

  const subtotalHkd = items.reduce((sum, i) => sum + i.product.priceHkd * i.quantity, 0);
  const baseShipping = DELIVERY_LABELS[deliveryMethod].feeHkd;
  const shippingHkd = subtotalHkd >= FREE_SHIPPING_THRESHOLD ? 0 : baseShipping;
  const totalHkd = subtotalHkd + shippingHkd;
  const remainingForFree = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotalHkd);

  const handleClose = () => {
    setError('');
    if (step === 'confirmed') {
      setStep('bag');
      setConfirmedOrder(null);
    }
    onClose();
  };

  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const order = await placeOrder({
        customerName,
        customerEmail,
        customerPhone,
        district,
        address,
        deliveryMethod,
        paymentMethod,
        preferredLang: lang,
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      });
      setConfirmedOrder(order);
      setStep('confirmed');
      onOrderSuccess(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0D1B2A]/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={t(UI_TEXT.cart.title, lang)}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-white h-full flex flex-col border-l border-[#E2E8F0] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep('bag');
                }}
                aria-label={t(UI_TEXT.cart.backToBag, lang)}
                className="w-9 h-9 flex items-center justify-center text-[#4A607A] hover:text-[#0D1B2A] hover:bg-[#F2F5F8] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="font-display text-2xl font-medium text-[#0D1B2A]">
              {step === 'bag'
                ? t(UI_TEXT.cart.title, lang)
                : step === 'checkout'
                  ? t(UI_TEXT.cart.checkoutTitle, lang)
                  : t(UI_TEXT.cart.orderConfirmed, lang)}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close drawer"
            className="w-10 h-10 flex items-center justify-center text-[#4A607A] hover:text-[#0D1B2A] hover:bg-[#F2F5F8] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: BAG */}
        {step === 'bag' && (
          <>
            {items.length > 0 && (
              <div className="px-6 py-3 bg-[#F2F5F8] border-b border-[#E2E8F0] text-xs text-[#1E4E79]">
                {remainingForFree === 0
                  ? t(UI_TEXT.cart.freeShippingUnlocked, lang)
                  : t(UI_TEXT.cart.freeShippingRemaining, lang).replace(
                      '{amount}',
                      formatHkd(remainingForFree)
                    )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <ShoppingBag className="w-10 h-10 text-[#94A3B8] mb-4 stroke-[1.5]" />
                  <p className="text-sm text-[#4A607A] mb-5">{t(UI_TEXT.cart.empty, lang)}</p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-5 py-2.5 bg-[#0D1B2A] text-white text-xs font-medium hover:bg-[#1E4E79] transition-colors whitespace-nowrap shrink-0"
                  >
                    {t(UI_TEXT.cart.emptyCta, lang)}
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-[#E2E8F0]">
                  {items.map(({ product, quantity }) => (
                    <li key={product.id} className="py-4 flex gap-4">
                      <ResilientImage
                        src={product.imageUrl}
                        alt={t(product.name, lang)}
                        className="w-20 h-20 object-cover bg-[#F2F5F8] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-[#0D1B2A] truncate">
                            {t(product.name, lang)}
                          </h3>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(product.id)}
                            aria-label="Remove item"
                            className="text-[#7B8FA6] hover:text-[#DC2626] p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-[#4A607A] font-mono mt-0.5">{product.volume}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="inline-flex items-center border border-[#E2E8F0] h-8">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(product.id, quantity - 1)}
                              aria-label="Decrease quantity"
                              className="w-8 h-full flex items-center justify-center text-[#0D1B2A] hover:bg-[#F2F5F8]"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-medium tabular-nums">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQty(product.id, Math.min(product.stock, quantity + 1))}
                              aria-label="Increase quantity"
                              className="w-8 h-full flex items-center justify-center text-[#0D1B2A] hover:bg-[#F2F5F8]"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-sm font-semibold text-[#0D1B2A] tabular-nums">
                            {formatHkd(product.priceHkd * quantity)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="px-6 py-5 border-t border-[#E2E8F0] bg-[#FAFBFD] space-y-4">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-[#4A607A]">
                    <span>{t(UI_TEXT.cart.subtotal, lang)}</span>
                    <span className="tabular-nums text-[#0D1B2A]">{formatHkd(subtotalHkd)}</span>
                  </div>
                  <div className="flex justify-between text-[#4A607A]">
                    <span>{t(UI_TEXT.cart.shipping, lang)}</span>
                    <span className="tabular-nums text-[#0D1B2A]">
                      {shippingHkd === 0 ? t(UI_TEXT.cart.free, lang) : formatHkd(shippingHkd)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-base text-[#0D1B2A] pt-2 border-t border-[#E2E8F0]">
                    <span>{t(UI_TEXT.cart.total, lang)}</span>
                    <span className="tabular-nums">{formatHkd(totalHkd)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('checkout')}
                  className="w-full h-11 bg-[#1E4E79] hover:bg-[#163B5C] text-white text-sm font-medium transition-colors whitespace-nowrap"
                >
                  {t(UI_TEXT.cart.proceedCheckout, lang)}
                </button>
              </div>
            )}
          </>
        )}

        {/* STEP 2: HONG KONG LOCAL CHECKOUT */}
        {step === 'checkout' && (
          <form onSubmit={handleCheckoutSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {error && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs">
                  {error}
                </div>
              )}

              {/* Recipient Info */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-[#4A607A]">
                  {t(UI_TEXT.cart.recipientSection, lang)}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#4A607A] mb-1">
                      {t(UI_TEXT.cart.nameLabel, lang)}
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Chloe Chan"
                      className="w-full h-10 px-3 text-sm border border-[#CBD5E1] bg-white focus:border-[#1E4E79] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4A607A] mb-1">
                      {t(UI_TEXT.cart.phoneLabel, lang)}
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+852 9123 4567"
                      className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] bg-white focus:border-[#1E4E79] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#4A607A] mb-1">
                    {t(UI_TEXT.cart.emailLabel, lang)}
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="name@dufreez.com"
                    className="w-full h-10 px-3 text-sm border border-[#CBD5E1] bg-white focus:border-[#1E4E79] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#4A607A] mb-1">
                    {t(UI_TEXT.cart.districtLabel, lang)}
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-[#CBD5E1] bg-white focus:border-[#1E4E79] focus:outline-none"
                  >
                    {HK_DISTRICTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {t(d.region, lang)} — {t(d.label, lang)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#4A607A] mb-1">
                    {t(UI_TEXT.cart.addressLabel, lang)}
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={
                      deliveryMethod === 'SF_LOCKER'
                        ? 'SF Locker H852BD04P, Harbour City'
                        : 'Unit 1208, 88 Queen’s Road Central, HK'
                    }
                    className="w-full h-10 px-3 text-sm border border-[#CBD5E1] bg-white focus:border-[#1E4E79] focus:outline-none"
                  />
                </div>
              </section>

              {/* Delivery Method */}
              <section className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
                <h3 className="text-xs font-semibold tracking-wide text-[#4A607A]">
                  {t(UI_TEXT.cart.deliverySection, lang)}
                </h3>
                <div className="space-y-2">
                  {(Object.keys(DELIVERY_LABELS) as DeliveryMethod[]).map((key) => {
                    const info = DELIVERY_LABELS[key];
                    const selected = deliveryMethod === key;
                    const effectiveFee = subtotalHkd >= FREE_SHIPPING_THRESHOLD ? 0 : info.feeHkd;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDeliveryMethod(key)}
                        className={`w-full text-left p-3 border transition-colors ${
                          selected
                            ? 'border-[#1E4E79] bg-[#F2F6FA]'
                            : 'border-[#E2E8F0] hover:border-[#94A3B8] bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-[#0D1B2A]">
                            {t(info.name, lang)}
                          </span>
                          <span className="text-xs font-mono font-medium text-[#1E4E79] tabular-nums">
                            {effectiveFee === 0 ? t(UI_TEXT.cart.free, lang) : formatHkd(effectiveFee)}
                          </span>
                        </div>
                        <p className="text-xs text-[#4A607A] mt-0.5">{t(info.eta, lang)}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Hong Kong Local Payment Methods */}
              <section className="space-y-2.5 pt-4 border-t border-[#E2E8F0]">
                <h3 className="text-xs font-semibold tracking-wide text-[#4A607A]">
                  {t(UI_TEXT.cart.paymentSection, lang)}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((method) => {
                    const meta = PAYMENT_LABELS[method];
                    const selected = paymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`text-left p-3 border transition-colors ${
                          selected
                            ? 'border-[#1E4E79] bg-[#F2F6FA]'
                            : 'border-[#E2E8F0] hover:border-[#94A3B8] bg-white'
                        }`}
                      >
                        <div className="text-xs font-semibold text-[#0D1B2A]">
                          {t(meta.name, lang)}
                        </div>
                        <div className="text-[11px] text-[#4A607A] mt-0.5 leading-snug">
                          {t(meta.hint, lang)}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Contextual Payment Guidance */}
                {paymentMethod === 'FPS' ? (
                  <div className="p-3.5 bg-[#F2F5F8] border border-[#E2E8F0] flex items-start gap-3">
                    <QrCode className="w-8 h-8 text-[#1E4E79] shrink-0 mt-0.5" />
                    <div className="text-xs text-[#2C3E50] leading-relaxed">
                      <p className="font-semibold text-[#0D1B2A] font-mono">FPS ID · 16890421</p>
                      <p className="mt-0.5">{t(UI_TEXT.cart.fpsInstruction, lang)}</p>
                    </div>
                  </div>
                ) : paymentMethod === 'CARD' ? (
                  <div className="p-3.5 bg-[#F2F5F8] border border-[#E2E8F0] space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-[#0D1B2A]">
                      <CreditCard className="w-4 h-4 text-[#1E4E79]" />
                      <span>{t(UI_TEXT.cart.cardLast4Label, lang)}</span>
                    </div>
                    <input
                      type="text"
                      maxLength={4}
                      pattern="\d{4}"
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-32 h-9 px-3 text-sm font-mono border border-[#CBD5E1] bg-white"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-[#F2F5F8] border border-[#E2E8F0] text-xs text-[#2C3E50]">
                    {t(UI_TEXT.cart.walletInstruction, lang)}
                  </div>
                )}
              </section>
            </div>

            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#FAFBFD] space-y-3">
              <div className="flex justify-between text-sm font-semibold text-[#0D1B2A]">
                <span>{t(UI_TEXT.cart.total, lang)}</span>
                <span className="tabular-nums text-base">{formatHkd(totalHkd)}</span>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-[#1E4E79] hover:bg-[#163B5C] disabled:opacity-60 text-white text-sm font-medium transition-colors whitespace-nowrap"
              >
                {submitting
                  ? t(UI_TEXT.cart.processing, lang)
                  : `${t(UI_TEXT.cart.placeOrder, lang)} · ${formatHkd(totalHkd)}`}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: ORDER CONFIRMED RECEIPT */}
        {step === 'confirmed' && confirmedOrder && (
          <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col justify-between gap-6">
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-7 h-7 text-[#16A34A] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-[#0D1B2A]">
                    {t(UI_TEXT.cart.orderConfirmed, lang)}
                  </h3>
                  <p className="text-xs text-[#4A607A] mt-1">
                    {confirmedOrder.customerName} · {confirmedOrder.district}
                  </p>
                </div>
              </div>

              <dl className="divide-y divide-[#E2E8F0] border-y border-[#E2E8F0] text-sm">
                <div className="py-3 flex justify-between">
                  <dt className="text-[#4A607A]">{t(UI_TEXT.cart.orderNumber, lang)}</dt>
                  <dd className="font-mono font-semibold text-[#0D1B2A] tabular-nums">
                    {confirmedOrder.orderNumber}
                  </dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-[#4A607A]">{t(UI_TEXT.cart.trackingNumber, lang)}</dt>
                  <dd className="font-mono font-medium text-[#1E4E79] tabular-nums">
                    {confirmedOrder.trackingNumber}
                  </dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-[#4A607A]">{t(UI_TEXT.cart.paymentRef, lang)}</dt>
                  <dd className="font-mono text-xs text-[#0D1B2A] tabular-nums">
                    {confirmedOrder.paymentReference}
                  </dd>
                </div>
                <div className="py-3 flex justify-between font-semibold">
                  <dt className="text-[#0D1B2A]">{t(UI_TEXT.cart.total, lang)}</dt>
                  <dd className="tabular-nums text-[#0D1B2A]">
                    {formatHkd(confirmedOrder.totalHkd)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  const num = confirmedOrder.orderNumber;
                  handleClose();
                  onTrackOrder(num);
                }}
                className="w-full h-11 bg-[#1E4E79] hover:bg-[#163B5C] text-white text-sm font-medium transition-colors"
              >
                {t(UI_TEXT.cart.trackNow, lang)}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full h-11 border border-[#CBD5E1] text-[#0D1B2A] hover:bg-[#F2F5F8] text-sm font-medium transition-colors"
              >
                {t(UI_TEXT.cart.continueShopping, lang)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
