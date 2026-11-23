import { AlertCircle, CheckCircle2, ImagePlus, Info, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { uploadAdminProductImage, type UpsertProductPayload } from '../api/client';
import { getCategoryLabel, t, UI_TEXT } from '../i18n/translations';
import type { CategoryItem, Language, Product, ProductCategory } from '../types';
import { ResilientImage } from './BrandMark';

const STUDIO_PRESET_IMAGES = [
  { label: 'Cryo Serum', url: '/src/assets/images/product_cryo_serum_1795270502338.jpg' },
  { label: 'Barrier Cream', url: '/src/assets/images/product_barrier_cream_1795270502783.jpg' },
  { label: 'Botanical Mist', url: '/src/assets/images/product_botanical_mist_1795270503749.jpg' },
  { label: 'Ritual Set', url: '/src/assets/images/hero_dufreez_campaign_1795270503125.jpg' },
];

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

interface UploadedImageMeta {
  width: number;
  height: number;
  sizeBytes: number;
  ratioWarning: boolean;
}

interface AdminProductDrawerProps {
  open: boolean;
  token: string;
  lang: Language;
  categories: CategoryItem[];
  editingProduct: Product | null;
  onClose: () => void;
  onSubmit: (payload: UpsertProductPayload, editingId?: string) => Promise<void>;
}

function readImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Could not read image dimensions.'));
    img.src = dataUrl;
  });
}

export function AdminProductDrawer({
  open,
  token,
  lang,
  categories,
  editingProduct,
  onClose,
  onSubmit,
}: AdminProductDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const defaultCat = categories[0]?.slug || 'serum';
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<ProductCategory>(defaultCat);
  const [nameZh, setNameZh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameKo, setNameKo] = useState('');
  const [subtitleZh, setSubtitleZh] = useState('');
  const [subtitleEn, setSubtitleEn] = useState('');
  const [subtitleKo, setSubtitleKo] = useState('');
  const [descriptionZh, setDescriptionZh] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionKo, setDescriptionKo] = useState('');
  const [ingredientsEn, setIngredientsEn] = useState('');
  const [volume, setVolume] = useState('50 ml');
  const [priceHkd, setPriceHkd] = useState('480');
  const [compareAtHkd, setCompareAtHkd] = useState('');
  const [stock, setStock] = useState('50');
  const [status, setStatus] = useState<Product['status']>('ACTIVE');
  const [imageUrl, setImageUrl] = useState(STUDIO_PRESET_IMAGES[0].url);

  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadMeta, setUploadMeta] = useState<UploadedImageMeta | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setUploadMeta(null);
    if (editingProduct) {
      setSku(editingProduct.sku);
      setCategory(editingProduct.category);
      setNameZh(editingProduct.name.zh);
      setNameEn(editingProduct.name.en);
      setNameKo(editingProduct.name.ko);
      setSubtitleZh(editingProduct.subtitle.zh);
      setSubtitleEn(editingProduct.subtitle.en);
      setSubtitleKo(editingProduct.subtitle.ko);
      setDescriptionZh(editingProduct.description.zh);
      setDescriptionEn(editingProduct.description.en);
      setDescriptionKo(editingProduct.description.ko);
      setIngredientsEn(editingProduct.ingredients.en);
      setVolume(editingProduct.volume);
      setPriceHkd(String(editingProduct.priceHkd));
      setCompareAtHkd(editingProduct.compareAtHkd ? String(editingProduct.compareAtHkd) : '');
      setStock(String(editingProduct.stock));
      setStatus(editingProduct.status);
      setImageUrl(editingProduct.imageUrl);
    } else {
      const rand = Math.floor(100 + Math.random() * 900);
      setSku(`DF-SRM-${rand}`);
      setCategory(categories[0]?.slug || 'serum');
      setNameZh('');
      setNameEn('');
      setNameKo('');
      setSubtitleZh('');
      setSubtitleEn('');
      setSubtitleKo('');
      setDescriptionZh('');
      setDescriptionEn('');
      setDescriptionKo('');
      setIngredientsEn('Cryo-Hyaluronate, Centella Exosomes, Panthenol B5');
      setVolume('50 ml');
      setPriceHkd('480');
      setCompareAtHkd('');
      setStock('45');
      setStatus('ACTIVE');
      setImageUrl(STUDIO_PRESET_IMAGES[0].url);
    }
  }, [open, editingProduct, categories]);

  if (!open) return null;

  const processImageFile = async (file: File) => {
    setError('');
    if (!ALLOWED_MIMES.includes(file.type)) {
      setError('JPG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('이미지 파일 크기는 최대 3 MB 이하만 업로드 가능합니다.');
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
      });

      const dims = await readImageDimensions(dataUrl);
      const ratio = dims.height > 0 ? dims.width / dims.height : 1;
      const ratioWarning = Math.abs(ratio - 4 / 3) > 0.28;

      const uploaded = await uploadAdminProductImage(token, dataUrl);
      setImageUrl(uploaded.imageUrl);
      setUploadMeta({
        width: dims.width,
        height: dims.height,
        sizeBytes: uploaded.sizeBytes,
        ratioWarning,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processImageFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processImageFile(file);
    }
  };

  const fillQuickTemplate = () => {
    const rand = Math.floor(200 + Math.random() * 799);
    setSku(`DF-SRM-${rand}`);
    setCategory('serum');
    setNameZh('冰川微囊亮白安瓶精華');
    setNameEn('Glacier Micro-Capsule Brightening Ampoule');
    setNameKo('글레이셔 마이크로 캡슐 브라이트닝 앰플');
    setSubtitleZh('穩定維C衍生物 × 低溫積雪草舒緩修護');
    setSubtitleEn('Stabilized Vitamin C & Cold-Extracted Centella');
    setSubtitleKo('안정화 비타민C 유도체 · 저온 추출 병풀 진정');
    setDescriptionZh('針對香港紫外線暗沉與冷氣乾燥肌研發的高滲透亮白安瓶，質地清爽零負擔。');
    setDescriptionEn('Fast-absorbing clinical brightening ampoule formulated for humid climates, visibly clarifying dull skin tone.');
    setDescriptionKo('홍콩의 강한 자외선과 실내 건조로 칙칙해진 피부를 맑게 가꿔주는 고침투 브라이트닝 앰플입니다.');
    setIngredientsEn('3-O-Ethyl Ascorbic Acid, Niacinamide 5%, Alpine Edelweiss');
    setVolume('30 ml / 1.01 fl. oz.');
    setPriceHkd('540');
    setCompareAtHkd('620');
    setStock('60');
    setStatus('ACTIVE');
    setImageUrl(STUDIO_PRESET_IMAGES[0].url);
    setUploadMeta(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const fallbackName = nameEn.trim() || nameKo.trim() || nameZh.trim();
      await onSubmit(
        {
          sku: sku.trim(),
          category,
          name: {
            zh: nameZh.trim() || fallbackName,
            en: nameEn.trim() || fallbackName,
            ko: nameKo.trim() || fallbackName,
          },
          subtitle: {
            zh: subtitleZh.trim() || subtitleEn.trim() || fallbackName,
            en: subtitleEn.trim() || subtitleKo.trim() || fallbackName,
            ko: subtitleKo.trim() || subtitleEn.trim() || fallbackName,
          },
          description: {
            zh: descriptionZh.trim() || descriptionEn.trim() || fallbackName,
            en: descriptionEn.trim() || descriptionKo.trim() || fallbackName,
            ko: descriptionKo.trim() || descriptionEn.trim() || fallbackName,
          },
          ingredients: {
            zh: ingredientsEn.trim(),
            en: ingredientsEn.trim(),
            ko: ingredientsEn.trim(),
          },
          volume: volume.trim() || '50 ml',
          priceHkd: Number(priceHkd),
          compareAtHkd: compareAtHkd ? Number(compareAtHkd) : undefined,
          stock: Number(stock),
          status,
          imageUrl,
        },
        editingProduct?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0D1B2A]/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white h-full flex flex-col border-l border-[#E2E8F0] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-medium text-[#0D1B2A]">
            {editingProduct
              ? t(UI_TEXT.admin.products.editProduct, lang)
              : t(UI_TEXT.admin.products.quickAdd, lang)}
          </h2>
          <div className="flex items-center gap-2">
            {!editingProduct && (
              <button
                type="button"
                onClick={fillQuickTemplate}
                className="inline-flex items-center gap-1.5 h-9 px-3 border border-[#CBD5E1] text-xs font-medium text-[#1E4E79] hover:bg-[#F2F5F8] transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t(UI_TEXT.admin.products.autoFill, lang)}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="w-9 h-9 flex items-center justify-center text-[#4A607A] hover:bg-[#F2F5F8]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {error && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
                {error}
              </div>
            )}

            {/* Product Photo Upload + Live 4:3 Preview + Operator Guide */}
            <section className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                {/* 4:3 Live Preview */}
                <div className="sm:col-span-5">
                  <div className="aspect-[4/3] w-full bg-[#F2F5F8] border border-[#E2E8F0] overflow-hidden">
                    <ResilientImage
                      src={imageUrl}
                      alt={nameEn || 'Product preview'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {uploadMeta && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-[#16A34A] tabular-nums">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {uploadMeta.width} × {uploadMeta.height} px ·{' '}
                        {(uploadMeta.sizeBytes / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  )}
                </div>

                {/* Upload Dropzone & Guide */}
                <div className="sm:col-span-7 space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    className={`p-4 border border-dashed text-center transition-colors ${
                      dragActive
                        ? 'border-[#1E4E79] bg-[#F2F6FA]'
                        : 'border-[#CBD5E1] bg-[#FAFBFD] hover:border-[#1E4E79]'
                    }`}
                  >
                    <ImagePlus className="w-5 h-5 text-[#1E4E79] mx-auto mb-1.5" />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-[#1E4E79] hover:underline underline-offset-4"
                    >
                      {uploading
                        ? t(UI_TEXT.admin.products.uploadingPhoto, lang)
                        : t(UI_TEXT.admin.products.uploadPhoto, lang)}
                    </button>
                    <p className="mt-1 text-[11px] text-[#4A607A]">
                      {t(UI_TEXT.admin.products.dropHint, lang)}
                    </p>
                  </div>

                  {uploadMeta?.ratioWarning && (
                    <div className="p-2.5 bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-[#92400E] flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{t(UI_TEXT.admin.products.ratioWarning, lang)}</span>
                    </div>
                  )}

                  {/* Operator Image Specification Guide */}
                  <div className="p-3.5 bg-[#F2F5F8] border border-[#E2E8F0] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0D1B2A]">
                      <Info className="w-3.5 h-3.5 text-[#1E4E79]" />
                      <span>{t(UI_TEXT.admin.products.guideTitle, lang)}</span>
                    </div>
                    <ul className="text-[11px] text-[#2C3E50] space-y-1 leading-relaxed">
                      <li>· {t(UI_TEXT.admin.products.guideSize, lang)}</li>
                      <li>· {t(UI_TEXT.admin.products.guideRatio, lang)}</li>
                      <li>· {t(UI_TEXT.admin.products.guideFormat, lang)}</li>
                      <li>· {t(UI_TEXT.admin.products.guideTip, lang)}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Built-in Studio Presets */}
              <div>
                <div className="text-xs text-[#4A607A] mb-2">
                  {t(UI_TEXT.admin.products.studioPresets, lang)}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {STUDIO_PRESET_IMAGES.map((img) => {
                    const selected = imageUrl === img.url;
                    return (
                      <button
                        key={img.url}
                        type="button"
                        onClick={() => {
                          setImageUrl(img.url);
                          setUploadMeta(null);
                        }}
                        className={`p-1 border text-left transition-colors ${
                          selected ? 'border-[#1E4E79] bg-[#F2F6FA]' : 'border-[#E2E8F0]'
                        }`}
                      >
                        <ResilientImage
                          src={img.url}
                          alt={img.label}
                          className="w-full aspect-[4/3] object-cover"
                        />
                        <span className="block text-[11px] text-[#2C3E50] mt-1 truncate">
                          {img.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Core SKU / Category / Price / Stock */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#E2E8F0]">
              <div className="col-span-2">
                <label className="block text-xs text-[#4A607A] mb-1">SKU</label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full h-9 px-3 text-sm font-mono border border-[#CBD5E1]"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-[#4A607A] mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="w-full h-9 px-2.5 text-sm border border-[#CBD5E1] bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {t(cat.label, lang)}
                    </option>
                  ))}
                  {!categories.some((c) => c.slug === category) && category && (
                    <option value={category}>
                      {getCategoryLabel(category, categories, lang)}
                    </option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">Price (HK$)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={priceHkd}
                  onChange={(e) => setPriceHkd(e.target.value)}
                  className="w-full h-9 px-3 text-sm font-mono tabular-nums border border-[#CBD5E1]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">Compare (HK$)</label>
                <input
                  type="number"
                  min={0}
                  value={compareAtHkd}
                  onChange={(e) => setCompareAtHkd(e.target.value)}
                  placeholder="Optional"
                  className="w-full h-9 px-3 text-sm font-mono tabular-nums border border-[#CBD5E1]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">HK Stock</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full h-9 px-3 text-sm font-mono tabular-nums border border-[#CBD5E1]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Product['status'])}
                  className="w-full h-9 px-2 text-sm border border-[#CBD5E1] bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                </select>
              </div>
            </div>

            {/* Multilingual Names */}
            <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
              <div className="text-xs font-semibold text-[#4A607A]">
                Multilingual Product Title (繁體中文 / English / 한국어)
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                <input
                  type="text"
                  required
                  value={nameZh}
                  onChange={(e) => setNameZh(e.target.value)}
                  placeholder="繁體中文名稱 (例：極淨冰萃胜肽精華)"
                  className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                />
                <input
                  type="text"
                  required
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="English Name (e.g. Cryo-Peptide Cellular Serum)"
                  className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                />
                <input
                  type="text"
                  required
                  value={nameKo}
                  onChange={(e) => setNameKo(e.target.value)}
                  placeholder="한국어 상품명 (예: 크라이오 펩타이드 셀룰러 세럼)"
                  className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                />
              </div>
            </div>

            {/* Subtitles & Descriptions */}
            <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#4A607A] mb-1">Volume</label>
                  <input
                    type="text"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    placeholder="50 ml / 1.69 fl. oz."
                    className="w-full h-9 px-3 text-sm font-mono border border-[#CBD5E1]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#4A607A] mb-1">Key Ingredients</label>
                  <input
                    type="text"
                    value={ingredientsEn}
                    onChange={(e) => setIngredientsEn(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#4A607A] mb-1">Subtitle (EN / KO / ZH)</label>
                <input
                  type="text"
                  value={lang === 'zh' ? subtitleZh : lang === 'ko' ? subtitleKo : subtitleEn}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (lang === 'zh') setSubtitleZh(v);
                    else if (lang === 'ko') setSubtitleKo(v);
                    else setSubtitleEn(v);
                  }}
                  className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#4A607A] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={
                    lang === 'zh' ? descriptionZh : lang === 'ko' ? descriptionKo : descriptionEn
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (lang === 'zh') setDescriptionZh(v);
                    else if (lang === 'ko') setDescriptionKo(v);
                    else setDescriptionEn(v);
                  }}
                  className="w-full p-3 text-sm border border-[#CBD5E1]"
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#FAFBFD] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 border border-[#CBD5E1] text-xs font-medium text-[#0D1B2A] hover:bg-[#F2F5F8]"
            >
              {t(UI_TEXT.admin.products.cancel, lang)}
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="h-10 px-5 bg-[#1E4E79] hover:bg-[#163B5C] disabled:opacity-60 text-white text-xs font-medium transition-colors"
            >
              {t(UI_TEXT.admin.products.saveProduct, lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
