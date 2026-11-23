import {
  ArrowLeft,
  BarChart3,
  Check,
  Code2,
  Copy,
  Download,
  FileSpreadsheet,
  LayoutTemplate,
  LogOut,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  createAdminMember,
  createAdminProduct,
  deleteAdminMember,
  deleteAdminProduct,
  downloadAdminExcel,
  fetchAdminAnalytics,
  fetchAdminMembers,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchSpringBootBlueprint,
  importAdminExcel,
  updateAdminMember,
  updateAdminProduct,
  updateAdminSiteConfig,
  updateOrderShipment,
  type ExcelImportSummary,
  type UpsertMemberPayload,
  type UpsertProductPayload,
} from '../api/client';
import {
  formatHkd,
  getCategoryLabel,
  MEMBER_TIER_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_LABELS,
  t,
  UI_TEXT,
} from '../i18n/translations';
import type {
  AnalyticsSummary,
  Language,
  Member,
  MemberRole,
  MemberTier,
  Order,
  OrderStatus,
  Product,
  SiteConfig,
  SpringBootBlueprintFile,
} from '../types';
import { AdminMemberDrawer } from './AdminMemberDrawer';
import { AdminProductDrawer } from './AdminProductDrawer';
import { AdminStorefrontManager } from './AdminStorefrontManager';
import { DufreezLogoMark, ResilientImage } from './BrandMark';

type AdminTab = 'overview' | 'products' | 'orders' | 'members' | 'storefront' | 'architecture';

const ORDER_STATUS_LIST: OrderStatus[] = [
  'CONFIRMED',
  'PACKING',
  'DISPATCHED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

const CHART_COLORS = ['#1E4E79', '#336B9E', '#4F86B8', '#73A2CC', '#94B8D7', '#CBD5E1'];

interface AdminConsoleProps {
  token: string;
  lang: Language;
  siteConfig: SiteConfig;
  onChangeLang: (lang: Language) => void;
  onSignOut: () => void;
  onReturnStorefront: () => void;
  onCatalogMutated: () => void;
  onSiteConfigUpdated: (next: SiteConfig) => void;
  onTrackOrder: (orderNumber: string) => void;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export function AdminConsole({
  token,
  lang,
  siteConfig,
  onChangeLang,
  onSignOut,
  onReturnStorefront,
  onCatalogMutated,
  onSiteConfigUpdated,
  onTrackOrder,
}: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [blueprintFiles, setBlueprintFiles] = useState<SpringBootBlueprintFile[]>([]);

  // Product management states
  const [productSearch, setProductSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Member management states
  const [memberSearch, setMemberSearch] = useState('');
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [confirmDeleteMemberId, setConfirmDeleteMemberId] = useState<string | null>(null);

  // Excel import/export states
  const productExcelInputRef = useRef<HTMLInputElement | null>(null);
  const memberExcelInputRef = useRef<HTMLInputElement | null>(null);
  const [excelBusy, setExcelBusy] = useState(false);
  const [excelSummary, setExcelSummary] = useState<{
    resource: 'products' | 'members';
    data: ExcelImportSummary;
  } | null>(null);

  // Order shipment update modal state
  const [updatingOrder, setUpdatingOrder] = useState<Order | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [shipStatus, setShipStatus] = useState<OrderStatus>('DISPATCHED');
  const [shipLocation, setShipLocation] = useState('SF Express Tsing Yi Sorting Center, HK');
  const [shipNote, setShipNote] = useState('');
  const [savingShipment, setSavingShipment] = useState(false);

  // Blueprint viewer
  const [selectedBlueprintIdx, setSelectedBlueprintIdx] = useState(0);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ana, prods, ords, mems, files] = await Promise.all([
        fetchAdminAnalytics(token),
        fetchAdminProducts(token),
        fetchAdminOrders(token),
        fetchAdminMembers(token),
        fetchSpringBootBlueprint(token),
      ]);
      setAnalytics(ana);
      setProducts(prods);
      setOrders(ords);
      setMembers(mems);
      setBlueprintFiles(files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin console.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  const handleProductSave = async (payload: UpsertProductPayload, editingId?: string) => {
    if (editingId) {
      await updateAdminProduct(token, editingId, payload);
    } else {
      await createAdminProduct(token, payload);
    }
    await loadAllData();
    onCatalogMutated();
  };

  const handleProductDelete = async (id: string) => {
    await deleteAdminProduct(token, id);
    setConfirmDeleteId(null);
    await loadAllData();
    onCatalogMutated();
  };

  const handleMemberSave = async (payload: UpsertMemberPayload, editingId?: string) => {
    if (editingId) {
      await updateAdminMember(token, editingId, payload);
    } else {
      await createAdminMember(token, payload);
    }
    await loadAllData();
  };

  const handleMemberDelete = async (id: string) => {
    await deleteAdminMember(token, id);
    setConfirmDeleteMemberId(null);
    await loadAllData();
  };

  const handleExcelExport = async (resource: 'products' | 'members') => {
    setError('');
    setExcelBusy(true);
    try {
      const { blob, filename } = await downloadAdminExcel(token, resource);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Excel export failed.');
    } finally {
      setExcelBusy(false);
    }
  };

  const handleExcelImportFile = async (
    resource: 'products' | 'members',
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setExcelSummary(null);
    setExcelBusy(true);
    try {
      const fileBase64 = await readFileAsBase64(file);
      const summary = await importAdminExcel(token, resource, fileBase64);
      setExcelSummary({ resource, data: summary });
      await loadAllData();
      if (resource === 'products') {
        onCatalogMutated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Excel import failed.');
    } finally {
      setExcelBusy(false);
    }
  };

  const openShipmentModal = (order: Order) => {
    setUpdatingOrder(order);
    const curIdx = ORDER_STATUS_LIST.indexOf(order.orderStatus);
    const nextStage = ORDER_STATUS_LIST[Math.min(ORDER_STATUS_LIST.length - 1, curIdx + 1)];
    setShipStatus(nextStage);
    setShipLocation('SF Express Hong Kong Hub');
    setShipNote('');
  };

  const handleShipmentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!updatingOrder) return;
    setSavingShipment(true);
    try {
      const loc = shipLocation.trim() || 'SF Express Hong Kong Hub';
      const noteText =
        shipNote.trim() ||
        `Status updated to ${ORDER_STATUS_LABELS[shipStatus].en} (${loc}).`;
      await updateOrderShipment(token, updatingOrder.id, {
        status: shipStatus,
        location: { zh: loc, en: loc, ko: loc },
        note: { zh: noteText, en: noteText, ko: noteText },
      });
      setUpdatingOrder(null);
      await loadAllData();
    } finally {
      setSavingShipment(false);
    }
  };

  const handleMemberPatch = async (
    memberId: string,
    patch: { tier?: MemberTier; status?: 'ACTIVE' | 'SUSPENDED'; role?: MemberRole }
  ) => {
    try {
      setError('');
      await updateAdminMember(token, memberId, patch);
      await loadAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member.');
    }
  };

  const handleDownloadBlueprint = (file: SpringBootBlueprintFile) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.path.split('/').pop() || 'file.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = async (file: SpringBootBlueprintFile) => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopiedPath(file.path);
      window.setTimeout(() => setCopiedPath(null), 1500);
    } catch {
      // Clipboard blocked in some sandboxed contexts
    }
  };

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.en.toLowerCase().includes(q) ||
        p.name.zh.toLowerCase().includes(q) ||
        p.name.ko.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'ALL') return orders;
    return orders.filter((o) => o.orderStatus === orderStatusFilter);
  }, [orders, orderStatusFilter]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        m.district.toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  const handleSiteConfigSave = async (next: SiteConfig): Promise<SiteConfig> => {
    const saved = await updateAdminSiteConfig(token, next);
    onSiteConfigUpdated(saved);
    return saved;
  };

  const navItems: { id: AdminTab; icon: typeof BarChart3; label: string }[] = [
    { id: 'overview', icon: BarChart3, label: t(UI_TEXT.admin.tabs.overview, lang) },
    { id: 'products', icon: Package, label: t(UI_TEXT.admin.tabs.products, lang) },
    { id: 'orders', icon: Truck, label: t(UI_TEXT.admin.tabs.orders, lang) },
    { id: 'members', icon: Users, label: t(UI_TEXT.admin.tabs.members, lang) },
    { id: 'storefront', icon: LayoutTemplate, label: t(UI_TEXT.admin.tabs.storefront, lang) },
    { id: 'architecture', icon: Code2, label: t(UI_TEXT.admin.tabs.architecture, lang) },
  ];

  const activeBlueprint = blueprintFiles[selectedBlueprintIdx] || null;

  return (
    <div className="min-h-screen bg-[#FAFBFD] flex flex-col lg:flex-row">
      {/* Hidden Excel File Inputs */}
      <input
        ref={productExcelInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => void handleExcelImportFile('products', e)}
        className="hidden"
      />
      <input
        ref={memberExcelInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => void handleExcelImportFile('members', e)}
        className="hidden"
      />

      {/* Sidebar Navigation (256px desktop) */}
      <aside className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-[#E2E8F0] flex flex-col shrink-0">
        <div className="h-16 px-6 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[#0D1B2A]">
            <DufreezLogoMark className="w-5 h-5 text-[#1E4E79]" />
            <span className="font-display text-lg font-semibold tracking-tight whitespace-nowrap">
              DUFREEZ
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#4A607A]">HK ADMIN</span>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setExcelSummary(null);
                }}
                className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 text-left ${
                  active
                    ? 'bg-[#0D1B2A] text-white'
                    : 'text-[#4A607A] hover:bg-[#F2F5F8] hover:text-[#0D1B2A]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:flex flex-col gap-2 p-4 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onReturnStorefront}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#4A607A] hover:text-[#0D1B2A] hover:bg-[#F2F5F8] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t(UI_TEXT.admin.returnStorefront, lang)}</span>
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t(UI_TEXT.admin.signOut, lang)}</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Contextual Top Bar */}
        <header className="h-16 px-6 lg:px-8 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-4">
          <div className="text-sm text-[#4A607A] truncate">
            <span>dufreez.com</span>
            <span className="mx-2 text-[#CBD5E1]">/</span>
            <span className="font-medium text-[#0D1B2A]">
              {navItems.find((i) => i.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 text-xs text-[#4A607A]">
              {(['zh', 'en', 'ko'] as Language[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onChangeLang(code)}
                  className={`transition-colors whitespace-nowrap ${
                    lang === code
                      ? 'font-semibold text-[#1E4E79] underline underline-offset-4'
                      : 'hover:text-[#0D1B2A]'
                  }`}
                >
                  {code === 'zh' ? '繁體中文' : code === 'en' ? 'EN' : '한국어'}
                </button>
              ))}
            </div>

            {activeTab === 'products' && (
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setDrawerOpen(true);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#1E4E79] hover:bg-[#163B5C] text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t(UI_TEXT.admin.products.quickAdd, lang)}</span>
              </button>
            )}

            {activeTab === 'members' && (
              <button
                type="button"
                onClick={() => {
                  setEditingMember(null);
                  setMemberDrawerOpen(true);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#1E4E79] hover:bg-[#163B5C] text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{t(UI_TEXT.admin.members.addMember, lang)}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onReturnStorefront}
              className="lg:hidden text-xs font-medium text-[#1E4E79] whitespace-nowrap"
            >
              {t(UI_TEXT.admin.returnStorefront, lang)}
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#B91C1C] flex items-center justify-between gap-4">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Dismiss error"
                className="text-[#B91C1C] hover:opacity-70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-white border border-[#E2E8F0]" />
                ))}
              </div>
              <div className="h-72 bg-white border border-[#E2E8F0]" />
            </div>
          ) : (
            <>
              {/* TAB 1: REVENUE & ANALYTICS */}
              {activeTab === 'overview' && analytics && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-[#E2E8F0] p-5">
                      <div className="text-xs text-[#4A607A]">{t(UI_TEXT.admin.kpi.revenue, lang)}</div>
                      <div className="mt-2 font-mono text-2xl font-semibold text-[#0D1B2A] tabular-nums">
                        {formatHkd(analytics.totalRevenueHkd)}
                      </div>
                    </div>
                    <div className="bg-white border border-[#E2E8F0] p-5">
                      <div className="text-xs text-[#4A607A]">{t(UI_TEXT.admin.kpi.orders, lang)}</div>
                      <div className="mt-2 font-mono text-2xl font-semibold text-[#0D1B2A] tabular-nums">
                        {analytics.totalOrders}
                      </div>
                      <div className="mt-1 text-xs text-[#4A607A] tabular-nums">
                        {analytics.pendingFulfillmentCount} in transit / packing
                      </div>
                    </div>
                    <div className="bg-white border border-[#E2E8F0] p-5">
                      <div className="text-xs text-[#4A607A]">{t(UI_TEXT.admin.kpi.aov, lang)}</div>
                      <div className="mt-2 font-mono text-2xl font-semibold text-[#0D1B2A] tabular-nums">
                        {formatHkd(analytics.averageOrderValueHkd)}
                      </div>
                    </div>
                    <div className="bg-white border border-[#E2E8F0] p-5">
                      <div className="text-xs text-[#4A607A]">{t(UI_TEXT.admin.kpi.members, lang)}</div>
                      <div className="mt-2 font-mono text-2xl font-semibold text-[#0D1B2A] tabular-nums">
                        {analytics.activeMembers}
                      </div>
                      <div className="mt-1 text-xs text-[#D97706] tabular-nums">
                        {analytics.lowStockCount} low-stock SKUs
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 bg-white border border-[#E2E8F0] p-6">
                      <h3 className="text-sm font-semibold text-[#0D1B2A] mb-5">
                        {t(UI_TEXT.admin.charts.revenueTrend, lang)}
                      </h3>
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.dailyRevenue} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 11, fill: '#4A607A' }}
                              axisLine={{ stroke: '#E2E8F0' }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 11, fill: '#4A607A' }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v) => `$${v}`}
                            />
                            <Tooltip
                              formatter={(value: unknown) => [formatHkd(Number(value)), 'HKD']}
                              contentStyle={{
                                border: '1px solid #E2E8F0',
                                borderRadius: 0,
                                fontSize: 12,
                              }}
                            />
                            <Bar dataKey="revenueHkd" fill="#1E4E79" maxBarSize={38} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="lg:col-span-5 bg-white border border-[#E2E8F0] p-6 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-[#0D1B2A] mb-5">
                          {t(UI_TEXT.admin.charts.paymentMix, lang)}
                        </h3>
                        <div className="h-52 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={analytics.paymentBreakdown.map((p) => ({
                                ...p,
                                label: t(PAYMENT_LABELS[p.method].name, lang),
                              }))}
                              layout="vertical"
                              margin={{ top: 0, right: 16, left: 10, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                              <XAxis type="number" hide />
                              <YAxis
                                type="category"
                                dataKey="label"
                                width={120}
                                tick={{ fontSize: 11, fill: '#2C3E50' }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                formatter={(value: unknown) => [formatHkd(Number(value)), 'HKD']}
                                contentStyle={{
                                  border: '1px solid #E2E8F0',
                                  borderRadius: 0,
                                  fontSize: 12,
                                }}
                              />
                              <Bar dataKey="amountHkd" barSize={18}>
                                {analytics.paymentBreakdown.map((entry, idx) => (
                                  <Cell
                                    key={entry.method}
                                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#E2E8F0]">
                        <h4 className="text-xs font-semibold text-[#4A607A] mb-2.5">
                          {t(UI_TEXT.admin.charts.categorySales, lang)}
                        </h4>
                        <div className="space-y-2">
                          {analytics.categoryBreakdown.map((c) => (
                            <div
                              key={c.category}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-[#2C3E50]">
                                {getCategoryLabel(c.category, siteConfig.categories, lang)} ({c.units})
                              </span>
                              <span className="font-mono font-medium text-[#0D1B2A] tabular-nums">
                                {formatHkd(c.revenueHkd)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRODUCT MANAGEMENT, IMAGE UPLOAD & EXCEL SYNC */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative w-full md:w-80">
                      <Search className="w-4 h-4 text-[#7B8FA6] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder={t(UI_TEXT.catalog.searchPlaceholder, lang)}
                        className="w-full h-10 pl-9 pr-3 bg-white border border-[#CBD5E1] text-sm focus:border-[#1E4E79] focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={excelBusy}
                        onClick={() => void handleExcelExport('products')}
                        className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-white border border-[#CBD5E1] hover:border-[#1E4E79] text-xs font-medium text-[#0D1B2A] transition-colors whitespace-nowrap shrink-0"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>{t(UI_TEXT.admin.excel.exportBtn, lang)}</span>
                      </button>
                      <button
                        type="button"
                        disabled={excelBusy}
                        onClick={() => productExcelInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-white border border-[#CBD5E1] hover:border-[#1E4E79] text-xs font-medium text-[#0D1B2A] transition-colors whitespace-nowrap shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#1E4E79]" />
                        <span>
                          {excelBusy
                            ? t(UI_TEXT.admin.excel.importing, lang)
                            : t(UI_TEXT.admin.excel.importBtn, lang)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setDrawerOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 h-10 px-4 bg-[#1E4E79] hover:bg-[#163B5C] text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{t(UI_TEXT.admin.products.quickAdd, lang)}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#4A607A]">
                    {t(UI_TEXT.admin.excel.hintProducts, lang)}
                  </p>

                  {excelSummary?.resource === 'products' && (
                    <div className="p-4 bg-[#F2F6FA] border border-[#BFD4E8] text-xs text-[#0D1B2A] space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-semibold text-[#1E4E79]">
                            {t(UI_TEXT.admin.excel.summaryTitle, lang)}
                          </span>
                          <span className="font-mono tabular-nums">
                            {t(UI_TEXT.admin.excel.created, lang)}: {excelSummary.data.created} ·{' '}
                            {t(UI_TEXT.admin.excel.updated, lang)}: {excelSummary.data.updated} ·{' '}
                            {t(UI_TEXT.admin.excel.skipped, lang)}: {excelSummary.data.skipped}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExcelSummary(null)}
                          aria-label="Close summary"
                          className="text-[#4A607A] hover:text-[#0D1B2A]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {excelSummary.data.errors.length > 0 && (
                        <ul className="text-[11px] text-[#B91C1C] space-y-0.5 pt-1 border-t border-[#BFD4E8]">
                          {excelSummary.data.errors.map((msg, i) => (
                            <li key={i}>· {msg}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="bg-white border border-[#E2E8F0] overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[760px]">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-xs font-medium text-[#4A607A]">
                          <th className="py-3 px-4">SKU / Product</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4 text-right">Price (HKD)</th>
                          <th className="py-3 px-4 text-right">HK Stock</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-sm">
                        {filteredProducts.map((product) => (
                          <tr key={product.id} className="hover:bg-[#FAFBFD]">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <ResilientImage
                                  src={product.imageUrl}
                                  alt={t(product.name, lang)}
                                  className="w-12 h-9 object-cover bg-[#F2F5F8] shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-medium text-[#0D1B2A] truncate max-w-[260px]">
                                    {t(product.name, lang)}
                                  </div>
                                  <div className="text-xs font-mono text-[#4A607A] tabular-nums">
                                    {product.sku} · {product.volume}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs text-[#2C3E50]">
                              {getCategoryLabel(product.category, siteConfig.categories, lang)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-medium text-[#0D1B2A] tabular-nums">
                              {formatHkd(product.priceHkd)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums">
                              <span
                                className={
                                  product.stock === 0
                                    ? 'text-[#DC2626] font-semibold'
                                    : product.stock <= 10
                                      ? 'text-[#D97706] font-semibold'
                                      : 'text-[#0D1B2A]'
                                }
                              >
                                {product.stock}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs font-medium">
                              <span
                                className={
                                  product.status === 'ACTIVE'
                                    ? 'text-[#16A34A]'
                                    : product.status === 'DRAFT'
                                      ? 'text-[#4A607A]'
                                      : 'text-[#DC2626]'
                                }
                              >
                                {product.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setDrawerOpen(true);
                                  }}
                                  aria-label={`Edit ${product.sku}`}
                                  className="p-2 text-[#4A607A] hover:text-[#1E4E79] hover:bg-[#F2F5F8]"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {confirmDeleteId === product.id ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleProductDelete(product.id)}
                                    className="px-2.5 py-1 bg-[#DC2626] text-white text-xs font-medium whitespace-nowrap"
                                  >
                                    {t(UI_TEXT.admin.products.deleteConfirm, lang)}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(product.id)}
                                    aria-label={`Delete ${product.sku}`}
                                    className="p-2 text-[#4A607A] hover:text-[#DC2626] hover:bg-[#FEF2F2]"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: ORDERS & LIVE SHIPMENT MANAGEMENT */}
              {activeTab === 'orders' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {(['ALL', ...ORDER_STATUS_LIST] as const).map((statusKey) => {
                      const active = orderStatusFilter === statusKey;
                      return (
                        <button
                          key={statusKey}
                          type="button"
                          onClick={() => setOrderStatusFilter(statusKey)}
                          className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                            active
                              ? 'bg-[#0D1B2A] text-white'
                              : 'bg-white border border-[#E2E8F0] text-[#4A607A] hover:text-[#0D1B2A]'
                          }`}
                        >
                          {statusKey === 'ALL'
                            ? `All (${orders.length})`
                            : t(ORDER_STATUS_LABELS[statusKey], lang)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-white border border-[#E2E8F0] overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[860px]">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-xs font-medium text-[#4A607A]">
                          <th className="py-3 px-4">Order / Waybill</th>
                          <th className="py-3 px-4">Customer & HK District</th>
                          <th className="py-3 px-4">Payment</th>
                          <th className="py-3 px-4 text-right">Total (HKD)</th>
                          <th className="py-3 px-4">Shipment Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-sm">
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-[#FAFBFD]">
                            <td className="py-3.5 px-4">
                              <button
                                type="button"
                                onClick={() => onTrackOrder(order.orderNumber)}
                                className="font-mono font-semibold text-[#1E4E79] hover:underline tabular-nums block"
                              >
                                {order.orderNumber}
                              </button>
                              <span className="font-mono text-xs text-[#4A607A] tabular-nums">
                                {order.trackingNumber}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-[#0D1B2A]">{order.customerName}</div>
                              <div className="text-xs text-[#4A607A]">
                                {order.district} · {order.customerPhone}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs">
                              <div className="font-medium text-[#0D1B2A]">
                                {t(PAYMENT_LABELS[order.paymentMethod].name, lang)}
                              </div>
                              <div className="font-mono text-[11px] text-[#4A607A] tabular-nums">
                                {order.paymentReference}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#0D1B2A] tabular-nums">
                              {formatHkd(order.totalHkd)}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-medium">
                              <span
                                className={
                                  order.orderStatus === 'DELIVERED'
                                    ? 'text-[#16A34A]'
                                    : order.orderStatus === 'OUT_FOR_DELIVERY'
                                      ? 'text-[#1E4E79]'
                                      : 'text-[#D97706]'
                                }
                              >
                                {t(ORDER_STATUS_LABELS[order.orderStatus], lang)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => openShipmentModal(order)}
                                className="px-3 py-1.5 border border-[#CBD5E1] text-xs font-medium text-[#0D1B2A] hover:border-[#1E4E79] hover:text-[#1E4E79] transition-colors whitespace-nowrap"
                              >
                                {t(UI_TEXT.admin.orders.updateShipment, lang)}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: MEMBER CRUD & EXCEL MANAGEMENT */}
              {activeTab === 'members' && (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative w-full md:w-80">
                      <Search className="w-4 h-4 text-[#7B8FA6] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder={t(UI_TEXT.admin.members.searchPlaceholder, lang)}
                        className="w-full h-10 pl-9 pr-3 bg-white border border-[#CBD5E1] text-sm focus:border-[#1E4E79] focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={excelBusy}
                        onClick={() => void handleExcelExport('members')}
                        className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-white border border-[#CBD5E1] hover:border-[#1E4E79] text-xs font-medium text-[#0D1B2A] transition-colors whitespace-nowrap shrink-0"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>{t(UI_TEXT.admin.excel.exportBtn, lang)}</span>
                      </button>
                      <button
                        type="button"
                        disabled={excelBusy}
                        onClick={() => memberExcelInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-white border border-[#CBD5E1] hover:border-[#1E4E79] text-xs font-medium text-[#0D1B2A] transition-colors whitespace-nowrap shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#1E4E79]" />
                        <span>
                          {excelBusy
                            ? t(UI_TEXT.admin.excel.importing, lang)
                            : t(UI_TEXT.admin.excel.importBtn, lang)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMember(null);
                          setMemberDrawerOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 h-10 px-4 bg-[#1E4E79] hover:bg-[#163B5C] text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{t(UI_TEXT.admin.members.addMember, lang)}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#4A607A]">
                    {t(UI_TEXT.admin.excel.hintMembers, lang)}
                  </p>

                  {excelSummary?.resource === 'members' && (
                    <div className="p-4 bg-[#F2F6FA] border border-[#BFD4E8] text-xs text-[#0D1B2A] space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-semibold text-[#1E4E79]">
                            {t(UI_TEXT.admin.excel.summaryTitle, lang)}
                          </span>
                          <span className="font-mono tabular-nums">
                            {t(UI_TEXT.admin.excel.created, lang)}: {excelSummary.data.created} ·{' '}
                            {t(UI_TEXT.admin.excel.updated, lang)}: {excelSummary.data.updated} ·{' '}
                            {t(UI_TEXT.admin.excel.skipped, lang)}: {excelSummary.data.skipped}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExcelSummary(null)}
                          aria-label="Close summary"
                          className="text-[#4A607A] hover:text-[#0D1B2A]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {excelSummary.data.errors.length > 0 && (
                        <ul className="text-[11px] text-[#B91C1C] space-y-0.5 pt-1 border-t border-[#BFD4E8]">
                          {excelSummary.data.errors.map((msg, i) => (
                            <li key={i}>· {msg}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="bg-white border border-[#E2E8F0] overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[980px]">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] bg-[#FAFBFD] text-xs font-medium text-[#4A607A]">
                          <th className="py-3 px-4">Member</th>
                          <th className="py-3 px-4">HK District / Lang</th>
                          <th className="py-3 px-4">{t(UI_TEXT.admin.members.tier, lang)}</th>
                          <th className="py-3 px-4">{t(UI_TEXT.admin.members.role, lang)}</th>
                          <th className="py-3 px-4 text-right">
                            {t(UI_TEXT.admin.members.ordersCount, lang)}
                          </th>
                          <th className="py-3 px-4 text-right">
                            {t(UI_TEXT.admin.members.totalSpend, lang)}
                          </th>
                          <th className="py-3 px-4">{t(UI_TEXT.admin.members.status, lang)}</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-sm">
                        {filteredMembers.map((member) => (
                          <tr key={member.id} className="hover:bg-[#FAFBFD]">
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-[#0D1B2A]">{member.name}</div>
                              <div className="text-xs text-[#4A607A] font-mono">
                                {member.email} · {member.phone}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-[#2C3E50]">
                              {member.district} · {member.preferredLang.toUpperCase()}
                            </td>
                            <td className="py-3.5 px-4">
                              <select
                                value={member.tier}
                                onChange={(e) =>
                                  void handleMemberPatch(member.id, {
                                    tier: e.target.value as MemberTier,
                                  })
                                }
                                className="h-8 px-2 text-xs border border-[#CBD5E1] bg-white text-[#0D1B2A]"
                              >
                                {(['SILVER', 'GLACIER_GOLD', 'CRYO_VIP'] as MemberTier[]).map(
                                  (tier) => (
                                    <option key={tier} value={tier}>
                                      {t(MEMBER_TIER_LABELS[tier], lang)}
                                    </option>
                                  )
                                )}
                              </select>
                            </td>
                            <td className="py-3.5 px-4">
                              <select
                                value={member.role}
                                aria-label={`Role for ${member.name}`}
                                onChange={(e) =>
                                  void handleMemberPatch(member.id, {
                                    role: e.target.value as MemberRole,
                                  })
                                }
                                className={`h-8 px-2 text-xs border bg-white ${
                                  member.role === 'ADMIN'
                                    ? 'border-[#1E4E79] text-[#1E4E79] font-semibold bg-[#F2F7FC]'
                                    : 'border-[#CBD5E1] text-[#0D1B2A]'
                                }`}
                              >
                                <option value="MEMBER">
                                  {t(UI_TEXT.admin.members.roleMember, lang)}
                                </option>
                                <option value="ADMIN">
                                  {t(UI_TEXT.admin.members.roleAdmin, lang)}
                                </option>
                              </select>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                              {member.totalOrders}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-medium text-[#0D1B2A] tabular-nums">
                              {formatHkd(member.totalSpentHkd)}
                            </td>
                            <td className="py-3.5 px-4">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleMemberPatch(member.id, {
                                    status: member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                                  })
                                }
                                className={`text-xs font-medium underline underline-offset-4 ${
                                  member.status === 'ACTIVE'
                                    ? 'text-[#16A34A]'
                                    : 'text-[#DC2626]'
                                }`}
                              >
                                {member.status === 'ACTIVE'
                                  ? t(UI_TEXT.admin.members.active, lang)
                                  : t(UI_TEXT.admin.members.suspended, lang)}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMember(member);
                                    setMemberDrawerOpen(true);
                                  }}
                                  aria-label={`Edit ${member.name}`}
                                  className="p-2 text-[#4A607A] hover:text-[#1E4E79] hover:bg-[#F2F5F8]"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {confirmDeleteMemberId === member.id ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleMemberDelete(member.id)}
                                    className="px-2.5 py-1 bg-[#DC2626] text-white text-xs font-medium whitespace-nowrap"
                                  >
                                    {t(UI_TEXT.admin.products.deleteConfirm, lang)}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteMemberId(member.id)}
                                    aria-label={`Delete ${member.name}`}
                                    className="p-2 text-[#4A607A] hover:text-[#DC2626] hover:bg-[#FEF2F2]"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: STOREFRONT DESIGN, CATEGORIES, HEADER MENU & FOOTER */}
              {activeTab === 'storefront' && (
                <AdminStorefrontManager
                  token={token}
                  lang={lang}
                  config={siteConfig}
                  products={products}
                  onSaveConfig={handleSiteConfigSave}
                />
              )}

              {/* TAB 6: SPRING BOOT 3.4 / JAVA 21 BACKEND BLUEPRINT */}
              {activeTab === 'architecture' && (
                <div className="space-y-6">
                  <div className="bg-white border border-[#E2E8F0] p-6">
                    <h2 className="font-display text-2xl font-medium text-[#0D1B2A]">
                      {t(UI_TEXT.admin.architecture.title, lang)}
                    </h2>
                    <p className="mt-2 text-sm text-[#4A607A] leading-relaxed max-w-4xl">
                      {t(UI_TEXT.admin.architecture.subtitle, lang)}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4 bg-white border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
                      {blueprintFiles.map((file, idx) => {
                        const active = idx === selectedBlueprintIdx;
                        return (
                          <button
                            key={file.path}
                            type="button"
                            onClick={() => setSelectedBlueprintIdx(idx)}
                            className={`w-full text-left p-4 transition-colors ${
                              active ? 'bg-[#F2F6FA]' : 'hover:bg-[#FAFBFD]'
                            }`}
                          >
                            <div className="font-mono text-xs font-semibold text-[#0D1B2A] break-all">
                              {file.path}
                            </div>
                            <p className="mt-1 text-xs text-[#4A607A] leading-relaxed">
                              {t(file.description, lang)}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="lg:col-span-8 bg-white border border-[#E2E8F0] flex flex-col overflow-hidden">
                      {activeBlueprint && (
                        <>
                          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 bg-[#FAFBFD]">
                            <span className="font-mono text-xs font-medium text-[#0D1B2A]">
                              {activeBlueprint.path}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleCopyCode(activeBlueprint)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 border border-[#CBD5E1] bg-white text-xs text-[#0D1B2A] hover:bg-[#F2F5F8] whitespace-nowrap"
                              >
                                {copiedPath === activeBlueprint.path ? (
                                  <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {copiedPath === activeBlueprint.path
                                    ? t(UI_TEXT.admin.architecture.copied, lang)
                                    : t(UI_TEXT.admin.architecture.copyCode, lang)}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadBlueprint(activeBlueprint)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 bg-[#1E4E79] hover:bg-[#163B5C] text-white text-xs font-medium whitespace-nowrap"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>{t(UI_TEXT.admin.architecture.downloadFile, lang)}</span>
                              </button>
                            </div>
                          </div>
                          <pre className="p-5 text-xs font-mono text-[#0D1B2A] bg-[#FAFBFD] overflow-x-auto leading-relaxed flex-1">
                            <code>{activeBlueprint.content}</code>
                          </pre>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Quick Product Registration / Edit Drawer with Photo Upload */}
      <AdminProductDrawer
        open={drawerOpen}
        token={token}
        lang={lang}
        categories={siteConfig.categories}
        editingProduct={editingProduct}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleProductSave}
      />

      {/* Member Add / Edit Drawer */}
      <AdminMemberDrawer
        open={memberDrawerOpen}
        lang={lang}
        editingMember={editingMember}
        onClose={() => setMemberDrawerOpen(false)}
        onSubmit={handleMemberSave}
      />

      {/* Shipment Checkpoint Update Modal */}
      {updatingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1B2A]/45 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setUpdatingOrder(null)}
        >
          <div
            className="w-full max-w-md bg-white border border-[#E2E8F0] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-2xl font-medium text-[#0D1B2A]">
              {t(UI_TEXT.admin.orders.updateShipment, lang)}
            </h3>
            <p className="mt-1 font-mono text-xs text-[#4A607A]">
              {updatingOrder.orderNumber} · {updatingOrder.trackingNumber}
            </p>

            <form onSubmit={handleShipmentSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">
                  {t(UI_TEXT.admin.orders.nextStatus, lang)}
                </label>
                <select
                  value={shipStatus}
                  onChange={(e) => setShipStatus(e.target.value as OrderStatus)}
                  className="w-full h-10 px-3 text-sm border border-[#CBD5E1] bg-white"
                >
                  {ORDER_STATUS_LIST.map((st) => (
                    <option key={st} value={st}>
                      {t(ORDER_STATUS_LABELS[st], lang)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">
                  {t(UI_TEXT.admin.orders.hubLocation, lang)}
                </label>
                <input
                  type="text"
                  required
                  value={shipLocation}
                  onChange={(e) => setShipLocation(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-[#CBD5E1]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#4A607A] mb-1">
                  {t(UI_TEXT.admin.orders.note, lang)}
                </label>
                <textarea
                  rows={3}
                  value={shipNote}
                  onChange={(e) => setShipNote(e.target.value)}
                  placeholder="Arrived at Central SF Express distribution hub."
                  className="w-full p-3 text-sm border border-[#CBD5E1]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUpdatingOrder(null)}
                  className="h-10 px-4 border border-[#CBD5E1] text-xs font-medium text-[#0D1B2A]"
                >
                  {t(UI_TEXT.admin.products.cancel, lang)}
                </button>
                <button
                  type="submit"
                  disabled={savingShipment}
                  className="h-10 px-5 bg-[#1E4E79] hover:bg-[#163B5C] text-white text-xs font-medium"
                >
                  {t(UI_TEXT.admin.orders.saveUpdate, lang)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
