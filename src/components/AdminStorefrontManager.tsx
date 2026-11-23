import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  FolderTree,
  ImagePlus,
  LayoutPanelTop,
  Menu,
  PanelBottom,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { uploadAdminProductImage } from '../api/client';
import { t, UI_TEXT } from '../i18n/translations';
import { DEFAULT_SITE_CONFIG } from '../lib/defaultSiteConfig';
import type {
  CategoryItem,
  FooterLinkItem,
  HeaderMenuActionType,
  HeaderMenuItem,
  Language,
  LocalizedText,
  Product,
  SiteConfig,
} from '../types';
import { ResilientImage } from './BrandMark';

type StorefrontSubTab = 'sections' | 'categories' | 'header' | 'footer';

const BANNER_PRESETS = [
  { label: 'Hero Campaign', url: '/src/assets/images/hero_dufreez_campaign_1795270503125.jpg' },
  { label: 'Central Atelier', url: '/src/assets/images/brand_story_lab_1795270503389.jpg' },
  { label: 'Cryo Serum', url: '/src/assets/images/product_cryo_serum_1795270502338.jpg' },
  { label: 'Barrier Cream', url: '/src/assets/images/product_barrier_cream_1795270502783.jpg' },
  { label: 'Botanical Mist', url: '/src/assets/images/product_botanical_mist_1795270503749.jpg' },
];

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const SLUG_RE = /^[a-z0-9_-]{2,32}$/;

interface AdminStorefrontManagerProps {
  token: string;
  lang: Language;
  config: SiteConfig;
  products: Product[];
  onSaveConfig: (next: SiteConfig) => Promise<SiteConfig>;
}

function updateLoc(loc: LocalizedText, editLang: Language, value: string): LocalizedText {
  return { ...loc, [editLang]: value };
}

function swapItems<T>(list: T[], idxA: number, idxB: number): T[] {
  if (idxA < 0 || idxB < 0 || idxA >= list.length || idxB >= list.length) return list;
  const copy = [...list];
  [copy[idxA], copy[idxB]] = [copy[idxB], copy[idxA]];
  return copy;
}

export function AdminStorefrontManager({
  token,
  lang,
  config,
  products,
  onSaveConfig,
}: AdminStorefrontManagerProps) {
  const [subTab, setSubTab] = useState<StorefrontSubTab>('sections');
  const [editLang, setEditLang] = useState<Language>(lang);
  const [draft, setDraft] = useState<SiteConfig>(config);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [localError, setLocalError] = useState('');
  const [uploadingSlot, setUploadingSlot] = useState<'hero' | 'story' | null>(null);

  const heroFileRef = useRef<HTMLInputElement | null>(null);
  const storyFileRef = useRef<HTMLInputElement | null>(null);

  // New Category form state
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatKo, setNewCatKo] = useState('');
  const [newCatEn, setNewCatEn] = useState('');
  const [newCatZh, setNewCatZh] = useState('');

  // New Header Menu form state
  const [newMenuKo, setNewMenuKo] = useState('');
  const [newMenuEn, setNewMenuEn] = useState('');
  const [newMenuZh, setNewMenuZh] = useState('');
  const [newMenuType, setNewMenuType] = useState<HeaderMenuActionType>('category');
  const [newMenuTarget, setNewMenuTarget] = useState(config.categories[0]?.slug || 'serum');

  // New Footer Link form state
  const [newFtKo, setNewFtKo] = useState('');
  const [newFtEn, setNewFtEn] = useState('');
  const [newFtZh, setNewFtZh] = useState('');
  const [newFtType, setNewFtType] = useState<HeaderMenuActionType>('section');
  const [newFtTarget, setNewFtTarget] = useState('#story');

  useEffect(() => {
    setDraft(config);
    setDirty(false);
  }, [config]);

  const mutateDraft = (updater: (prev: SiteConfig) => SiteConfig) => {
    setDraft((prev) => updater(prev));
    setDirty(true);
    setSavedNotice(false);
    setLocalError('');
  };

  const handleSave = async () => {
    setLocalError('');
    setSaving(true);
    try {
      const saved = await onSaveConfig(draft);
      setDraft(saved);
      setDirty(false);
      setSavedNotice(true);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to save storefront settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleBannerUpload = async (
    slot: 'hero' | 'story',
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLocalError('');

    if (!ALLOWED_MIMES.includes(file.type)) {
      setLocalError('JPG, PNG, WebP 형식의 이미지 파일만 업로드 가능합니다.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setLocalError('이미지 크기는 최대 3 MB 이하여야 합니다.');
      return;
    }

    setUploadingSlot(slot);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
      });
      const uploaded = await uploadAdminProductImage(token, dataUrl);
      mutateDraft((prev) =>
        slot === 'hero'
          ? { ...prev, hero: { ...prev.hero, imageUrl: uploaded.imageUrl } }
          : { ...prev, story: { ...prev.story, imageUrl: uploaded.imageUrl } }
      );
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploadingSlot(null);
    }
  };

  // Category CRUD helpers
  const handleAddCategory = () => {
    setLocalError('');
    const normalizedSlug = newCatSlug
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]/g, '');

    if (!SLUG_RE.test(normalizedSlug) || normalizedSlug === 'all') {
      setLocalError('카테고리 코드(Slug)는 영문 소문자·숫자·하이픈 2~32자로 입력해 주세요 (all 제외).');
      return;
    }
    if (draft.categories.some((c) => c.slug === normalizedSlug)) {
      setLocalError(`이미 존재하는 카테고리 코드입니다: ${normalizedSlug}`);
      return;
    }
    const fallbackName = newCatKo.trim() || newCatEn.trim() || newCatZh.trim();
    if (!fallbackName) {
      setLocalError('카테고리 이름을 최소 1개 언어 이상 입력해 주세요.');
      return;
    }
    const nextItem: CategoryItem = {
      slug: normalizedSlug,
      label: {
        ko: newCatKo.trim() || fallbackName,
        en: newCatEn.trim() || fallbackName,
        zh: newCatZh.trim() || fallbackName,
      },
    };
    mutateDraft((prev) => ({
      ...prev,
      categories: [...prev.categories, nextItem],
    }));
    setNewCatSlug('');
    setNewCatKo('');
    setNewCatEn('');
    setNewCatZh('');
  };

  const handleUpdateCategoryLabel = (slug: string, field: Language, value: string) => {
    mutateDraft((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.slug === slug ? { ...c, label: { ...c.label, [field]: value } } : c
      ),
    }));
  };

  const handleDeleteCategory = (slug: string) => {
    if (draft.categories.length <= 1) {
      setLocalError('최소 1개 이상의 품목 카테고리가 필요합니다.');
      return;
    }
    mutateDraft((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.slug !== slug),
    }));
  };

  // Header Menu CRUD helpers
  const handleAddHeaderMenu = () => {
    setLocalError('');
    const fallback = newMenuKo.trim() || newMenuEn.trim() || newMenuZh.trim();
    if (!fallback) {
      setLocalError('추가할 메뉴명을 입력해 주세요.');
      return;
    }
    if (newMenuType === 'url' && !newMenuTarget.trim().startsWith('https://')) {
      setLocalError('외부 링크는 반드시 https:// 로 시작해야 합니다.');
      return;
    }
    if (!newMenuTarget.trim()) {
      setLocalError('연결 대상을 선택하거나 입력해 주세요.');
      return;
    }
    const nextItem: HeaderMenuItem = {
      id: `nav-${Date.now().toString(36)}`,
      label: {
        ko: newMenuKo.trim() || fallback,
        en: newMenuEn.trim() || fallback,
        zh: newMenuZh.trim() || fallback,
      },
      actionType: newMenuType,
      target: newMenuTarget.trim(),
      visible: true,
    };
    mutateDraft((prev) => ({
      ...prev,
      headerMenu: [...prev.headerMenu, nextItem],
    }));
    setNewMenuKo('');
    setNewMenuEn('');
    setNewMenuZh('');
  };

  // Footer Link CRUD helpers
  const handleAddFooterLink = () => {
    setLocalError('');
    const fallback = newFtKo.trim() || newFtEn.trim() || newFtZh.trim();
    if (!fallback) {
      setLocalError('추가할 푸터 링크명을 입력해 주세요.');
      return;
    }
    if (newFtType === 'url' && !newFtTarget.trim().startsWith('https://')) {
      setLocalError('외부 링크는 반드시 https:// 로 시작해야 합니다.');
      return;
    }
    const nextLink: FooterLinkItem = {
      id: `ft-${Date.now().toString(36)}`,
      label: {
        ko: newFtKo.trim() || fallback,
        en: newFtEn.trim() || fallback,
        zh: newFtZh.trim() || fallback,
      },
      actionType: newFtType,
      target: newFtTarget.trim(),
    };
    mutateDraft((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        links: [...prev.footer.links, nextLink],
      },
    }));
    setNewFtKo('');
    setNewFtEn('');
    setNewFtZh('');
  };

  const renderTargetEditor = (
    actionType: HeaderMenuActionType,
    target: string,
    onChangeTarget: (val: string) => void
  ) => {
    if (actionType === 'section') {
      return (
        <select
          value={target}
          onChange={(e) => onChangeTarget(e.target.value)}
          className="h-9 px-2.5 text-xs border border-[#CBD5E1] bg-white w-full"
        >
          <option value="#top">최상단 (#top)</option>
          <option value="#catalog">시그니처 상품 영역 (#catalog)</option>
          <option value="#collections">카테고리 필터 (#collections)</option>
          <option value="#story">브랜드 스토리 영역 (#story)</option>
        </select>
      );
    }
    if (actionType === 'view') {
      return (
        <select
          value={target}
          onChange={(e) => onChangeTarget(e.target.value)}
          className="h-9 px-2.5 text-xs border border-[#CBD5E1] bg-white w-full"
        >
          <option value="storefront">메인 스토어 (storefront)</option>
          <option value="tracking">실시간 배송조회 (tracking)</option>
          <option value="admin">관리자 콘솔 (admin)</option>
        </select>
      );
    }
    if (actionType === 'category') {
      return (
        <select
          value={target}
          onChange={(e) => onChangeTarget(e.target.value)}
          className="h-9 px-2.5 text-xs border border-[#CBD5E1] bg-white w-full"
        >
          <option value="all">전체 상품 (all)</option>
          {draft.categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {t(cat.label, lang)} ({cat.slug})
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type="url"
        value={target}
        onChange={(e) => onChangeTarget(e.target.value)}
        placeholder="https://dufreez.com/..."
        className="h-9 px-2.5 text-xs font-mono border border-[#CBD5E1] w-full"
      />
    );
  };

  const defaultTargetForType = (type: HeaderMenuActionType): string => {
    if (type === 'section') return '#catalog';
    if (type === 'view') return 'tracking';
    if (type === 'category') return draft.categories[0]?.slug || 'all';
    return 'https://dufreez.com';
  };

  const subTabs: { id: StorefrontSubTab; icon: typeof LayoutPanelTop; label: string }[] = [
    { id: 'sections', icon: LayoutPanelTop, label: t(UI_TEXT.admin.storefront.subtabs.sections, lang) },
    { id: 'categories', icon: FolderTree, label: t(UI_TEXT.admin.storefront.subtabs.categories, lang) },
    { id: 'header', icon: Menu, label: t(UI_TEXT.admin.storefront.subtabs.header, lang) },
    { id: 'footer', icon: PanelBottom, label: t(UI_TEXT.admin.storefront.subtabs.footer, lang) },
  ];

  return (
    <div className="space-y-6">
      {/* Hidden File Inputs for Hero & Story Banner Uploads */}
      <input
        ref={heroFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => void handleBannerUpload('hero', e)}
        className="hidden"
      />
      <input
        ref={storyFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => void handleBannerUpload('story', e)}
        className="hidden"
      />

      {/* Top Bar: Sub-tabs + Save CTA */}
      <div className="bg-white border border-[#E2E8F0] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {subTabs.map((item) => {
            const Icon = item.icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#0D1B2A] text-white'
                    : 'bg-[#F2F5F8] text-[#4A607A] hover:text-[#0D1B2A]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              mutateDraft(() => DEFAULT_SITE_CONFIG);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 border border-[#CBD5E1] bg-white text-xs font-medium text-[#4A607A] hover:text-[#0D1B2A] transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>기본값 복원</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#1E4E79] hover:bg-[#163B5C] disabled:opacity-60 text-white text-xs font-medium transition-colors whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {saving
                ? t(UI_TEXT.admin.storefront.saving, lang)
                : t(UI_TEXT.admin.storefront.saveAll, lang)}
              {dirty ? ' *' : ''}
            </span>
          </button>
        </div>
      </div>

      {localError && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
          {localError}
        </div>
      )}

      {savedNotice && (
        <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#15803D] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{t(UI_TEXT.admin.storefront.savedSuccess, lang)}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 1: MAIN HERO (TOP) & BRAND STORY (BOTTOM) + IMAGE LAYOUT    */}
      {/* =================================================================== */}
      {subTab === 'sections' && (
        <div className="space-y-6">
          {/* Editing Language Switcher */}
          <div className="bg-white border border-[#E2E8F0] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#4A607A]">
              {t(UI_TEXT.admin.storefront.editLangLabel, lang)} — 상·하단 다국어 텍스트를 언어별로 편집할 수 있습니다.
            </span>
            <div className="flex items-center gap-1.5">
              {(['ko', 'en', 'zh'] as Language[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setEditLang(code)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    editLang === code
                      ? 'bg-[#1E4E79] text-white'
                      : 'bg-[#F2F5F8] text-[#4A607A] hover:text-[#0D1B2A]'
                  }`}
                >
                  {code === 'ko' ? '한국어 (KO)' : code === 'en' ? 'English (EN)' : '繁體中文 (ZH)'}
                </button>
              ))}
            </div>
          </div>

          {/* 1A. Top Utility Strip */}
          <section className="bg-white border border-[#E2E8F0] p-6 space-y-3">
            <h3 className="text-sm font-semibold text-[#0D1B2A]">
              최상단 공지 바 (Top Utility Bar · {editLang.toUpperCase()})
            </h3>
            <input
              type="text"
              value={draft.utilityStrip[editLang]}
              onChange={(e) =>
                mutateDraft((prev) => ({
                  ...prev,
                  utilityStrip: updateLoc(prev.utilityStrip, editLang, e.target.value),
                }))
              }
              className="w-full h-10 px-3 text-sm border border-[#CBD5E1] focus:border-[#1E4E79] focus:outline-none"
            />
          </section>

          {/* 1B. Main Top Hero Section */}
          <section className="bg-white border border-[#E2E8F0] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-base font-semibold text-[#0D1B2A]">
                  메인 상단 히어로 영역 (Top Hero Section)
                </h3>
                <p className="text-xs text-[#4A607A] mt-0.5">
                  메인 배너 이미지 업로드, 좌/우 배치 전환, 헤드라인 및 하단 4단 신뢰 지표를 수정합니다.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    mutateDraft((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, imagePosition: 'left' },
                    }))
                  }
                  className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap ${
                    draft.hero.imagePosition === 'left'
                      ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
                      : 'bg-white text-[#4A607A] border-[#CBD5E1] hover:border-[#0D1B2A]'
                  }`}
                >
                  {t(UI_TEXT.admin.storefront.imageLeft, lang)}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    mutateDraft((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, imagePosition: 'right' },
                    }))
                  }
                  className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap ${
                    draft.hero.imagePosition === 'right'
                      ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
                      : 'bg-white text-[#4A607A] border-[#CBD5E1] hover:border-[#0D1B2A]'
                  }`}
                >
                  {t(UI_TEXT.admin.storefront.imageRight, lang)}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Hero Image Control */}
              <div className="lg:col-span-5 space-y-3">
                <div className="aspect-[16/10] bg-[#F2F5F8] border border-[#E2E8F0] overflow-hidden">
                  <ResilientImage
                    src={draft.hero.imageUrl}
                    alt="Hero banner preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  disabled={uploadingSlot === 'hero'}
                  onClick={() => heroFileRef.current?.click()}
                  className="w-full h-10 px-4 border border-dashed border-[#1E4E79] bg-[#F2F6FA] hover:bg-[#E6EFF8] text-xs font-medium text-[#1E4E79] inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span>
                    {uploadingSlot === 'hero'
                      ? t(UI_TEXT.admin.products.uploadingPhoto, lang)
                      : t(UI_TEXT.admin.storefront.uploadBanner, lang)}
                  </span>
                </button>
                <p className="text-[11px] text-[#4A607A]">
                  {t(UI_TEXT.admin.storefront.bannerGuide, lang)}
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {BANNER_PRESETS.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() =>
                        mutateDraft((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, imageUrl: preset.url },
                        }))
                      }
                      className={`p-0.5 border ${
                        draft.hero.imageUrl === preset.url
                          ? 'border-[#1E4E79]'
                          : 'border-[#E2E8F0]'
                      }`}
                      title={preset.label}
                    >
                      <ResilientImage
                        src={preset.url}
                        alt={preset.label}
                        className="w-full aspect-[4/3] object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Hero Copy Fields */}
              <div className="lg:col-span-7 space-y-3">
                <div>
                  <label className="block text-xs text-[#4A607A] mb-1">
                    상단 서브 라벨 (Kicker · {editLang.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    value={draft.hero.kicker[editLang]}
                    onChange={(e) =>
                      mutateDraft((prev) => ({
                        ...prev,
                        hero: {
                          ...prev.hero,
                          kicker: updateLoc(prev.hero.kicker, editLang, e.target.value),
                        },
                      }))
                    }
                    className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#4A607A] mb-1">
                    메인 헤드라인 (Headline · {editLang.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    value={draft.hero.headline[editLang]}
                    onChange={(e) =>
                      mutateDraft((prev) => ({
                        ...prev,
                        hero: {
                          ...prev.hero,
                          headline: updateLoc(prev.hero.headline, editLang, e.target.value),
                        },
                      }))
                    }
                    className="w-full h-10 px-3 text-sm font-medium border border-[#CBD5E1]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#4A607A] mb-1">
                    본문 설명 (Subhead · {editLang.toUpperCase()})
                  </label>
                  <textarea
                    rows={3}
                    value={draft.hero.subhead[editLang]}
                    onChange={(e) =>
                      mutateDraft((prev) => ({
                        ...prev,
                        hero: {
                          ...prev.hero,
                          subhead: updateLoc(prev.hero.subhead, editLang, e.target.value),
                        },
                      }))
                    }
                    className="w-full p-3 text-sm border border-[#CBD5E1]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#4A607A] mb-1">
                      기본 버튼 문구 (Primary CTA)
                    </label>
                    <input
                      type="text"
                      value={draft.hero.ctaPrimary[editLang]}
                      onChange={(e) =>
                        mutateDraft((prev) => ({
                          ...prev,
                          hero: {
                            ...prev.hero,
                            ctaPrimary: updateLoc(prev.hero.ctaPrimary, editLang, e.target.value),
                          },
                        }))
                      }
                      className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#4A607A] mb-1">
                      보조 버튼 문구 (Secondary CTA)
                    </label>
                    <input
                      type="text"
                      value={draft.hero.ctaSecondary[editLang]}
                      onChange={(e) =>
                        mutateDraft((prev) => ({
                          ...prev,
                          hero: {
                            ...prev.hero,
                            ctaSecondary: updateLoc(
                              prev.hero.ctaSecondary,
                              editLang,
                              e.target.value
                            ),
                          },
                        }))
                      }
                      className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Hero 4-Column Proof Strip */}
            <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
              <div className="text-xs font-semibold text-[#0D1B2A]">
                상단 히어로 하단 4단 신뢰 지표 (Proof Strip · {editLang.toUpperCase()})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {draft.hero.proofItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-[#FAFBFD] border border-[#E2E8F0] space-y-2">
                    <input
                      type="text"
                      value={item.label[editLang]}
                      onChange={(e) =>
                        mutateDraft((prev) => ({
                          ...prev,
                          hero: {
                            ...prev.hero,
                            proofItems: prev.hero.proofItems.map((p, i) =>
                              i === idx
                                ? { ...p, label: updateLoc(p.label, editLang, e.target.value) }
                                : p
                            ),
                          },
                        }))
                      }
                      placeholder="라벨"
                      className="w-full h-8 px-2.5 text-xs border border-[#CBD5E1] bg-white"
                    />
                    <input
                      type="text"
                      value={item.value[editLang]}
                      onChange={(e) =>
                        mutateDraft((prev) => ({
                          ...prev,
                          hero: {
                            ...prev.hero,
                            proofItems: prev.hero.proofItems.map((p, i) =>
                              i === idx
                                ? { ...p, value: updateLoc(p.value, editLang, e.target.value) }
                                : p
                            ),
                          },
                        }))
                      }
                      placeholder="핵심 수치/문구"
                      className="w-full h-8 px-2.5 text-xs font-semibold border border-[#CBD5E1] bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 1C. Catalog Section Title & Description */}
          <section className="bg-white border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[#0D1B2A]">
              중앙 시그니처 포뮬레이션 섹션 타이틀 ({editLang.toUpperCase()})
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">섹션 제목</label>
                <input
                  type="text"
                  value={draft.catalogSection.title[editLang]}
                  onChange={(e) =>
                    mutateDraft((prev) => ({
                      ...prev,
                      catalogSection: {
                        ...prev.catalogSection,
                        title: updateLoc(prev.catalogSection.title, editLang, e.target.value),
                      },
                    }))
                  }
                  className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">섹션 설명</label>
                <input
                  type="text"
                  value={draft.catalogSection.description[editLang]}
                  onChange={(e) =>
                    mutateDraft((prev) => ({
                      ...prev,
                      catalogSection: {
                        ...prev.catalogSection,
                        description: updateLoc(
                          prev.catalogSection.description,
                          editLang,
                          e.target.value
                        ),
                      },
                    }))
                  }
                  className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                />
              </div>
            </div>
          </section>

          {/* 1D. Bottom Brand Story / Atelier Section */}
          <section className="bg-white border border-[#E2E8F0] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-base font-semibold text-[#0D1B2A]">
                  메인 하단 브랜드 스토리 영역 (Bottom Story Section)
                </h3>
                <p className="text-xs text-[#4A607A] mt-0.5">
                  하단 브랜드 소개 이미지, 좌/우 배치, 노출 여부 및 핵심 지표를 관리합니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    mutateDraft((prev) => ({
                      ...prev,
                      story: { ...prev.story, visible: !prev.story.visible },
                    }))
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap ${
                    draft.story.visible
                      ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                      : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                  }`}
                >
                  {draft.story.visible ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" />
                  )}
                  <span>{draft.story.visible ? '메인 노출 중' : '숨김 상태'}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    mutateDraft((prev) => ({
                      ...prev,
                      story: { ...prev.story, imagePosition: 'left' },
                    }))
                  }
                  className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap ${
                    draft.story.imagePosition === 'left'
                      ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
                      : 'bg-white text-[#4A607A] border-[#CBD5E1]'
                  }`}
                >
                  {t(UI_TEXT.admin.storefront.imageLeft, lang)}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    mutateDraft((prev) => ({
                      ...prev,
                      story: { ...prev.story, imagePosition: 'right' },
                    }))
                  }
                  className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap ${
                    draft.story.imagePosition === 'right'
                      ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
                      : 'bg-white text-[#4A607A] border-[#CBD5E1]'
                  }`}
                >
                  {t(UI_TEXT.admin.storefront.imageRight, lang)}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Story Image Control */}
              <div className="lg:col-span-5 space-y-3">
                <div className="aspect-[16/10] bg-[#F2F5F8] border border-[#E2E8F0] overflow-hidden">
                  <ResilientImage
                    src={draft.story.imageUrl}
                    alt="Brand story preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  disabled={uploadingSlot === 'story'}
                  onClick={() => storyFileRef.current?.click()}
                  className="w-full h-10 px-4 border border-dashed border-[#1E4E79] bg-[#F2F6FA] hover:bg-[#E6EFF8] text-xs font-medium text-[#1E4E79] inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span>
                    {uploadingSlot === 'story'
                      ? t(UI_TEXT.admin.products.uploadingPhoto, lang)
                      : t(UI_TEXT.admin.storefront.uploadBanner, lang)}
                  </span>
                </button>
                <p className="text-[11px] text-[#4A607A]">
                  {t(UI_TEXT.admin.storefront.bannerGuide, lang)}
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {BANNER_PRESETS.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() =>
                        mutateDraft((prev) => ({
                          ...prev,
                          story: { ...prev.story, imageUrl: preset.url },
                        }))
                      }
                      className={`p-0.5 border ${
                        draft.story.imageUrl === preset.url
                          ? 'border-[#1E4E79]'
                          : 'border-[#E2E8F0]'
                      }`}
                      title={preset.label}
                    >
                      <ResilientImage
                        src={preset.url}
                        alt={preset.label}
                        className="w-full aspect-[4/3] object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Story Text Fields */}
              <div className="lg:col-span-7 space-y-3">
                <div>
                  <label className="block text-xs text-[#4A607A] mb-1">
                    상단 소제목 (Kicker · {editLang.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    value={draft.story.kicker[editLang]}
                    onChange={(e) =>
                      mutateDraft((prev) => ({
                        ...prev,
                        story: {
                          ...prev.story,
                          kicker: updateLoc(prev.story.kicker, editLang, e.target.value),
                        },
                      }))
                    }
                    className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#4A607A] mb-1">
                    스토리 제목 (Title · {editLang.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    value={draft.story.title[editLang]}
                    onChange={(e) =>
                      mutateDraft((prev) => ({
                        ...prev,
                        story: {
                          ...prev.story,
                          title: updateLoc(prev.story.title, editLang, e.target.value),
                        },
                      }))
                    }
                    className="w-full h-10 px-3 text-sm font-medium border border-[#CBD5E1]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#4A607A] mb-1">본문 1</label>
                  <textarea
                    rows={3}
                    value={draft.story.body1[editLang]}
                    onChange={(e) =>
                      mutateDraft((prev) => ({
                        ...prev,
                        story: {
                          ...prev.story,
                          body1: updateLoc(prev.story.body1, editLang, e.target.value),
                        },
                      }))
                    }
                    className="w-full p-3 text-sm border border-[#CBD5E1]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#4A607A] mb-1">본문 2</label>
                  <textarea
                    rows={2}
                    value={draft.story.body2[editLang]}
                    onChange={(e) =>
                      mutateDraft((prev) => ({
                        ...prev,
                        story: {
                          ...prev.story,
                          body2: updateLoc(prev.story.body2, editLang, e.target.value),
                        },
                      }))
                    }
                    className="w-full p-3 text-sm border border-[#CBD5E1]"
                  />
                </div>
              </div>
            </div>

            {/* Story 3 Metrics */}
            <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
              <div className="text-xs font-semibold text-[#0D1B2A]">
                하단 핵심 지표 3항목 (Story Metrics · {editLang.toUpperCase()})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {draft.story.metrics.map((metric, idx) => (
                  <div key={idx} className="p-3 bg-[#FAFBFD] border border-[#E2E8F0] space-y-2">
                    <input
                      type="text"
                      value={metric.title[editLang]}
                      onChange={(e) =>
                        mutateDraft((prev) => ({
                          ...prev,
                          story: {
                            ...prev.story,
                            metrics: prev.story.metrics.map((m, i) =>
                              i === idx
                                ? { ...m, title: updateLoc(m.title, editLang, e.target.value) }
                                : m
                            ),
                          },
                        }))
                      }
                      className="w-full h-8 px-2.5 text-xs font-semibold border border-[#CBD5E1] bg-white"
                    />
                    <textarea
                      rows={2}
                      value={metric.description[editLang]}
                      onChange={(e) =>
                        mutateDraft((prev) => ({
                          ...prev,
                          story: {
                            ...prev.story,
                            metrics: prev.story.metrics.map((m, i) =>
                              i === idx
                                ? {
                                    ...m,
                                    description: updateLoc(
                                      m.description,
                                      editLang,
                                      e.target.value
                                    ),
                                  }
                                : m
                            ),
                          },
                        }))
                      }
                      className="w-full p-2 text-xs border border-[#CBD5E1] bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 2: SIGNATURE FORMULATIONS CATEGORY CRUD                     */}
      {/* =================================================================== */}
      {subTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E8F0] p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-[#0D1B2A]">
                시그니처 포뮬레이션 품목별 카테고리 관리
              </h3>
              <p className="text-xs text-[#4A607A] mt-1">
                ‘전체 상품’ 탭은 기본 고정되며, 아래 품목별 카테고리를 자유롭게 추가·수정·순서 변경·삭제할 수 있습니다. 저장 시 쇼핑몰 필터와 상품 등록 화면에 즉시 반영됩니다.
              </p>
            </div>

            <div className="overflow-x-auto border border-[#E2E8F0]">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-[#FAFBFD] border-b border-[#E2E8F0] text-xs font-medium text-[#4A607A]">
                    <th className="py-2.5 px-3 w-20">순서</th>
                    <th className="py-2.5 px-3 w-36">코드 (Slug)</th>
                    <th className="py-2.5 px-3">한국어명 (KO)</th>
                    <th className="py-2.5 px-3">English (EN)</th>
                    <th className="py-2.5 px-3">繁體中文 (ZH)</th>
                    <th className="py-2.5 px-3 text-right w-20">상품 수</th>
                    <th className="py-2.5 px-3 text-right w-16">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs">
                  {draft.categories.map((cat, idx) => {
                    const count = products.filter((p) => p.category === cat.slug).length;
                    return (
                      <tr key={cat.slug} className="hover:bg-[#FAFBFD]">
                        <td className="py-2.5 px-3">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() =>
                                mutateDraft((prev) => ({
                                  ...prev,
                                  categories: swapItems(prev.categories, idx, idx - 1),
                                }))
                              }
                              aria-label="Move up"
                              className="p-1.5 border border-[#E2E8F0] text-[#4A607A] hover:text-[#0D1B2A] disabled:opacity-30"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === draft.categories.length - 1}
                              onClick={() =>
                                mutateDraft((prev) => ({
                                  ...prev,
                                  categories: swapItems(prev.categories, idx, idx + 1),
                                }))
                              }
                              aria-label="Move down"
                              className="p-1.5 border border-[#E2E8F0] text-[#4A607A] hover:text-[#0D1B2A] disabled:opacity-30"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-[#1E4E79]">
                          {cat.slug}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={cat.label.ko}
                            onChange={(e) =>
                              handleUpdateCategoryLabel(cat.slug, 'ko', e.target.value)
                            }
                            className="w-full h-8 px-2.5 text-xs border border-[#CBD5E1]"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={cat.label.en}
                            onChange={(e) =>
                              handleUpdateCategoryLabel(cat.slug, 'en', e.target.value)
                            }
                            className="w-full h-8 px-2.5 text-xs border border-[#CBD5E1]"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={cat.label.zh}
                            onChange={(e) =>
                              handleUpdateCategoryLabel(cat.slug, 'zh', e.target.value)
                            }
                            className="w-full h-8 px-2.5 text-xs border border-[#CBD5E1]"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#4A607A]">
                          {count}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.slug)}
                            aria-label={`Delete ${cat.slug}`}
                            className="p-1.5 text-[#4A607A] hover:text-[#DC2626] hover:bg-[#FEF2F2]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add New Category Bar */}
            <div className="p-4 bg-[#FAFBFD] border border-[#E2E8F0] space-y-3">
              <div className="text-xs font-semibold text-[#0D1B2A]">신규 카테고리 추가</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <input
                  type="text"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  placeholder="영문 코드 (예: ampoule)"
                  className="h-9 px-3 text-xs font-mono border border-[#CBD5E1] bg-white"
                />
                <input
                  type="text"
                  value={newCatKo}
                  onChange={(e) => setNewCatKo(e.target.value)}
                  placeholder="한국어명 (예: 집중 앰플)"
                  className="h-9 px-3 text-xs border border-[#CBD5E1] bg-white"
                />
                <input
                  type="text"
                  value={newCatEn}
                  onChange={(e) => setNewCatEn(e.target.value)}
                  placeholder="English (e.g. Ampoules)"
                  className="h-9 px-3 text-xs border border-[#CBD5E1] bg-white"
                />
                <input
                  type="text"
                  value={newCatZh}
                  onChange={(e) => setNewCatZh(e.target.value)}
                  placeholder="繁體中文 (例：濃縮安瓶)"
                  className="h-9 px-3 text-xs border border-[#CBD5E1] bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="h-9 px-4 bg-[#0D1B2A] hover:bg-[#1E4E79] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>카테고리 추가</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 3: HEADER MAIN NAVIGATION MENU CRUD                         */}
      {/* =================================================================== */}
      {subTab === 'header' && (
        <div className="bg-white border border-[#E2E8F0] p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-[#0D1B2A]">
              헤더 주메뉴 카테고리 관리 (Header Navigation)
            </h3>
            <p className="text-xs text-[#4A607A] mt-1">
              상단 네비게이션 바에 표시되는 메뉴명을 수정하거나 새 메뉴(품목 카테고리 바로가기, 섹션 이동, 외부 링크 등)를 추가·삭제할 수 있습니다. (최대 10개)
            </p>
          </div>

          <div className="space-y-3">
            {draft.headerMenu.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 border border-[#E2E8F0] bg-[#FAFBFD] grid grid-cols-1 lg:grid-cols-12 gap-3 items-center"
              >
                <div className="lg:col-span-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() =>
                      mutateDraft((prev) => ({
                        ...prev,
                        headerMenu: swapItems(prev.headerMenu, idx, idx - 1),
                      }))
                    }
                    aria-label="Move menu up"
                    className="p-1.5 bg-white border border-[#E2E8F0] text-[#4A607A] hover:text-[#0D1B2A] disabled:opacity-30"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === draft.headerMenu.length - 1}
                    onClick={() =>
                      mutateDraft((prev) => ({
                        ...prev,
                        headerMenu: swapItems(prev.headerMenu, idx, idx + 1),
                      }))
                    }
                    aria-label="Move menu down"
                    className="p-1.5 bg-white border border-[#E2E8F0] text-[#4A607A] hover:text-[#0D1B2A] disabled:opacity-30"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      mutateDraft((prev) => ({
                        ...prev,
                        headerMenu: prev.headerMenu.map((m) =>
                          m.id === item.id ? { ...m, visible: !m.visible } : m
                        ),
                      }))
                    }
                    title={item.visible ? '표시 중' : '숨김'}
                    className={`p-1.5 border ${
                      item.visible
                        ? 'bg-white border-[#BBF7D0] text-[#15803D]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
                    }`}
                  >
                    {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="lg:col-span-5 grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={item.label.ko}
                    onChange={(e) =>
                      mutateDraft((prev) => ({
                        ...prev,
                        headerMenu: prev.headerMenu.map((m) =>
                          m.id === item.id
                            ? { ...m, label: { ...m.label, ko: e.target.value } }
                            : m
                        ),
                      }))
                    }
                    placeholder="한국어"
                    className="h-9 px-2.5 text-xs border border-[#CBD5E1] bg-white"
                  />
                  <input
                    type="text"
                    value={item.label.en}
                    onChange={(e) =>
                      mutateDraft((prev) => ({
                        ...prev,
                        headerMenu: prev.headerMenu.map((m) =>
                          m.id === item.id
                            ? { ...m, label: { ...m.label, en: e.target.value } }
                            : m
                        ),
                      }))
                    }
                    placeholder="English"
                    className="h-9 px-2.5 text-xs border border-[#CBD5E1] bg-white"
                  />
                  <input
                    type="text"
                    value={item.label.zh}
                    onChange={(e) =>
                      mutateDraft((prev) => ({
                        ...prev,
                        headerMenu: prev.headerMenu.map((m) =>
                          m.id === item.id
                            ? { ...m, label: { ...m.label, zh: e.target.value } }
                            : m
                        ),
                      }))
                    }
                    placeholder="繁體中文"
                    className="h-9 px-2.5 text-xs border border-[#CBD5E1] bg-white"
                  />
                </div>

                <div className="lg:col-span-4 grid grid-cols-2 gap-2">
                  <select
                    value={item.actionType}
                    onChange={(e) => {
                      const nextType = e.target.value as HeaderMenuActionType;
                      mutateDraft((prev) => ({
                        ...prev,
                        headerMenu: prev.headerMenu.map((m) =>
                          m.id === item.id
                            ? { ...m, actionType: nextType, target: defaultTargetForType(nextType) }
                            : m
                        ),
                      }));
                    }}
                    className="h-9 px-2 text-xs border border-[#CBD5E1] bg-white"
                  >
                    <option value="section">섹션 이동</option>
                    <option value="category">카테고리 바로가기</option>
                    <option value="view">내부 화면</option>
                    <option value="url">외부 링크(HTTPS)</option>
                  </select>
                  {renderTargetEditor(item.actionType, item.target, (val) =>
                    mutateDraft((prev) => ({
                      ...prev,
                      headerMenu: prev.headerMenu.map((m) =>
                        m.id === item.id ? { ...m, target: val } : m
                      ),
                    }))
                  )}
                </div>

                <div className="lg:col-span-1 flex justify-end">
                  <button
                    type="button"
                    disabled={draft.headerMenu.length <= 1}
                    onClick={() =>
                      mutateDraft((prev) => ({
                        ...prev,
                        headerMenu: prev.headerMenu.filter((m) => m.id !== item.id),
                      }))
                    }
                    aria-label="Delete menu item"
                    className="p-2 text-[#4A607A] hover:text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Header Menu Form */}
          <div className="p-4 bg-[#F2F6FA] border border-[#BFD4E8] space-y-3">
            <div className="text-xs font-semibold text-[#0D1B2A]">신규 주메뉴 추가</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              <input
                type="text"
                value={newMenuKo}
                onChange={(e) => setNewMenuKo(e.target.value)}
                placeholder="한국어 메뉴명"
                className="h-9 px-2.5 text-xs border border-[#CBD5E1] bg-white"
              />
              <input
                type="text"
                value={newMenuEn}
                onChange={(e) => setNewMenuEn(e.target.value)}
                placeholder="English Label"
                className="h-9 px-2.5 text-xs border border-[#CBD5E1] bg-white"
              />
              <input
                type="text"
                value={newMenuZh}
                onChange={(e) => setNewMenuZh(e.target.value)}
                placeholder="繁體中文名稱"
                className="h-9 px-2.5 text-xs border border-[#CBD5E1] bg-white"
              />
              <select
                value={newMenuType}
                onChange={(e) => {
                  const nextType = e.target.value as HeaderMenuActionType;
                  setNewMenuType(nextType);
                  setNewMenuTarget(defaultTargetForType(nextType));
                }}
                className="h-9 px-2 text-xs border border-[#CBD5E1] bg-white"
              >
                <option value="category">카테고리 바로가기</option>
                <option value="section">섹션 이동</option>
                <option value="view">내부 화면</option>
                <option value="url">외부 링크(HTTPS)</option>
              </select>
              <div>{renderTargetEditor(newMenuType, newMenuTarget, setNewMenuTarget)}</div>
              <button
                type="button"
                onClick={handleAddHeaderMenu}
                className="h-9 px-4 bg-[#0D1B2A] hover:bg-[#1E4E79] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>메뉴 추가</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 4: BOTTOM FOOTER MANAGEMENT                                 */}
      {/* =================================================================== */}
      {subTab === 'footer' && (
        <div className="space-y-6">
          {/* Editing Language Switcher for Footer Localized Fields */}
          <div className="bg-white border border-[#E2E8F0] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#4A607A]">
              {t(UI_TEXT.admin.storefront.editLangLabel, lang)} — 주소·운영시간·저작권 문구를 언어별로 수정할 수 있습니다.
            </span>
            <div className="flex items-center gap-1.5">
              {(['ko', 'en', 'zh'] as Language[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setEditLang(code)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    editLang === code
                      ? 'bg-[#1E4E79] text-white'
                      : 'bg-[#F2F5F8] text-[#4A607A] hover:text-[#0D1B2A]'
                  }`}
                >
                  {code === 'ko' ? '한국어 (KO)' : code === 'en' ? 'English (EN)' : '繁體中文 (ZH)'}
                </button>
              ))}
            </div>
          </div>

          <section className="bg-white border border-[#E2E8F0] p-6 space-y-5">
            <h3 className="text-base font-semibold text-[#0D1B2A]">
              하단 푸터 기본 정보 (Footer Identity & Contact)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">브랜드 타이틀</label>
                <input
                  type="text"
                  value={draft.footer.brandTitle}
                  onChange={(e) =>
                    mutateDraft((prev) => ({
                      ...prev,
                      footer: { ...prev.footer, brandTitle: e.target.value },
                    }))
                  }
                  className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">고객센터 이메일</label>
                <input
                  type="email"
                  value={draft.footer.contactEmail}
                  onChange={(e) =>
                    mutateDraft((prev) => ({
                      ...prev,
                      footer: { ...prev.footer, contactEmail: e.target.value },
                    }))
                  }
                  className="w-full h-9 px-3 text-sm font-mono border border-[#CBD5E1]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">고객센터 전화번호</label>
                <input
                  type="text"
                  value={draft.footer.contactPhone}
                  onChange={(e) =>
                    mutateDraft((prev) => ({
                      ...prev,
                      footer: { ...prev.footer, contactPhone: e.target.value },
                    }))
                  }
                  className="w-full h-9 px-3 text-sm font-mono border border-[#CBD5E1]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">
                  홍콩 오피스 / 플래그십 주소 ({editLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={draft.footer.tagline[editLang]}
                  onChange={(e) =>
                    mutateDraft((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        tagline: updateLoc(prev.footer.tagline, editLang, e.target.value),
                      },
                    }))
                  }
                  className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">
                  운영 시간 ({editLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={draft.footer.businessHours[editLang]}
                  onChange={(e) =>
                    mutateDraft((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        businessHours: updateLoc(
                          prev.footer.businessHours,
                          editLang,
                          e.target.value
                        ),
                      },
                    }))
                  }
                  className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">지원 결제 수단 안내 문구</label>
                <input
                  type="text"
                  value={draft.footer.paymentNotice}
                  onChange={(e) =>
                    mutateDraft((prev) => ({
                      ...prev,
                      footer: { ...prev.footer, paymentNotice: e.target.value },
                    }))
                  }
                  className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">
                  저작권 문구 (Copyright · {editLang.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={draft.footer.rights[editLang]}
                  onChange={(e) =>
                    mutateDraft((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        rights: updateLoc(prev.footer.rights, editLang, e.target.value),
                      },
                    }))
                  }
                  className="w-full h-9 px-3 text-sm border border-[#CBD5E1]"
                />
              </div>
            </div>
          </section>

          {/* Footer Quick Links Management */}
          <section className="bg-white border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[#0D1B2A]">푸터 바로가기 링크 관리</h3>

            <div className="space-y-2.5">
              {draft.footer.links.map((link, idx) => (
                <div
                  key={link.id}
                  className="p-3 bg-[#FAFBFD] border border-[#E2E8F0] grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center"
                >
                  <div className="lg:col-span-1 flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() =>
                        mutateDraft((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            links: swapItems(prev.footer.links, idx, idx - 1),
                          },
                        }))
                      }
                      aria-label="Move link up"
                      className="p-1.5 bg-white border border-[#E2E8F0] text-[#4A607A] disabled:opacity-30"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === draft.footer.links.length - 1}
                      onClick={() =>
                        mutateDraft((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            links: swapItems(prev.footer.links, idx, idx + 1),
                          },
                        }))
                      }
                      aria-label="Move link down"
                      className="p-1.5 bg-white border border-[#E2E8F0] text-[#4A607A] disabled:opacity-30"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="lg:col-span-6 grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={link.label.ko}
                      onChange={(e) =>
                        mutateDraft((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            links: prev.footer.links.map((l) =>
                              l.id === link.id
                                ? { ...l, label: { ...l.label, ko: e.target.value } }
                                : l
                            ),
                          },
                        }))
                      }
                      placeholder="한국어"
                      className="h-9 px-2.5 text-xs border border-[#CBD5E1] bg-white"
                    />
                    <input
                      type="text"
                      value={link.label.en}
                      onChange={(e) =>
                        mutateDraft((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            links: prev.footer.links.map((l) =>
                              l.id === link.id
                                ? { ...l, label: { ...l.label, en: e.target.value } }
                                : l
                            ),
                          },
                        }))
                      }
                      placeholder="English"
                      className="h-9 px-2.5 text-xs border border-[#CBD5E1] bg-white"
                    />
                    <input
                      type="text"
                      value={link.label.zh}
                      onChange={(e) =>
                        mutateDraft((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            links: prev.footer.links.map((l) =>
                              l.id === link.id
                                ? { ...l, label: { ...l.label, zh: e.target.value } }
                                : l
                            ),
                          },
                        }))
                      }
                      placeholder="繁體中文"
                      className="h-9 px-2.5 text-xs border border-[#CBD5E1] bg-white"
                    />
                  </div>
                  <div className="lg:col-span-4 grid grid-cols-2 gap-2">
                    <select
                      value={link.actionType}
                      onChange={(e) => {
                        const nextType = e.target.value as HeaderMenuActionType;
                        mutateDraft((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            links: prev.footer.links.map((l) =>
                              l.id === link.id
                                ? {
                                    ...l,
                                    actionType: nextType,
                                    target: defaultTargetForType(nextType),
                                  }
                                : l
                            ),
                          },
                        }));
                      }}
                      className="h-9 px-2 text-xs border border-[#CBD5E1] bg-white"
                    >
                      <option value="section">섹션 이동</option>
                      <option value="category">카테고리</option>
                      <option value="view">내부 화면</option>
                      <option value="url">외부 링크</option>
                    </select>
                    {renderTargetEditor(link.actionType, link.target, (val) =>
                      mutateDraft((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          links: prev.footer.links.map((l) =>
                            l.id === link.id ? { ...l, target: val } : l
                          ),
                        },
                      }))
                    )}
                  </div>
                  <div className="lg:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        mutateDraft((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            links: prev.footer.links.filter((l) => l.id !== link.id),
                          },
                        }))
                      }
                      aria-label="Delete footer link"
                      className="p-2 text-[#4A607A] hover:text-[#DC2626] hover:bg-[#FEF2F2]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Footer Link */}
            <div className="p-4 bg-[#F2F6FA] border border-[#BFD4E8] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              <input
                type="text"
                value={newFtKo}
                onChange={(e) => setNewFtKo(e.target.value)}
                placeholder="한국어 링크명"
                className="h-9 px-2.5 text-xs border border-[#CBD5E1] bg-white"
              />
              <input
                type="text"
                value={newFtEn}
                onChange={(e) => setNewFtEn(e.target.value)}
                placeholder="English Label"
                className="h-9 px-2.5 text-xs border border-[#CBD5E1] bg-white"
              />
              <input
                type="text"
                value={newFtZh}
                onChange={(e) => setNewFtZh(e.target.value)}
                placeholder="繁體中文名稱"
                className="h-9 px-2.5 text-xs border border-[#CBD5E1] bg-white"
              />
              <select
                value={newFtType}
                onChange={(e) => {
                  const nextType = e.target.value as HeaderMenuActionType;
                  setNewFtType(nextType);
                  setNewFtTarget(defaultTargetForType(nextType));
                }}
                className="h-9 px-2 text-xs border border-[#CBD5E1] bg-white"
              >
                <option value="section">섹션 이동</option>
                <option value="category">카테고리</option>
                <option value="view">내부 화면</option>
                <option value="url">외부 링크</option>
              </select>
              <div>{renderTargetEditor(newFtType, newFtTarget, setNewFtTarget)}</div>
              <button
                type="button"
                onClick={handleAddFooterLink}
                className="h-9 px-4 bg-[#0D1B2A] hover:bg-[#1E4E79] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>링크 추가</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
