export type Language = 'zh' | 'en' | 'ko';

export interface LocalizedText {
  zh: string;
  en: string;
  ko: string;
}

export type ProductCategory = string;

export interface CategoryItem {
  slug: string;
  label: LocalizedText;
}

export type HeaderMenuActionType = 'section' | 'view' | 'category' | 'url';

export interface HeaderMenuItem {
  id: string;
  label: LocalizedText;
  actionType: HeaderMenuActionType;
  target: string;
  visible: boolean;
}

export interface ProofStripItem {
  label: LocalizedText;
  value: LocalizedText;
}

export interface HeroConfig {
  kicker: LocalizedText;
  headline: LocalizedText;
  subhead: LocalizedText;
  ctaPrimary: LocalizedText;
  ctaSecondary: LocalizedText;
  imageUrl: string;
  imagePosition: 'left' | 'right';
  proofItems: ProofStripItem[];
}

export interface CatalogSectionConfig {
  title: LocalizedText;
  description: LocalizedText;
}

export interface StoryMetricItem {
  title: LocalizedText;
  description: LocalizedText;
}

export interface StoryConfig {
  visible: boolean;
  kicker: LocalizedText;
  title: LocalizedText;
  body1: LocalizedText;
  body2: LocalizedText;
  imageUrl: string;
  imagePosition: 'left' | 'right';
  metrics: StoryMetricItem[];
}

export interface FooterLinkItem {
  id: string;
  label: LocalizedText;
  actionType: HeaderMenuActionType;
  target: string;
}

export interface FooterConfig {
  brandTitle: string;
  tagline: LocalizedText;
  businessHours: LocalizedText;
  contactEmail: string;
  contactPhone: string;
  paymentNotice: string;
  rights: LocalizedText;
  links: FooterLinkItem[];
}

export interface SiteConfig {
  utilityStrip: LocalizedText;
  headerMenu: HeaderMenuItem[];
  hero: HeroConfig;
  catalogSection: CatalogSectionConfig;
  categories: CategoryItem[];
  story: StoryConfig;
  footer: FooterConfig;
}

export interface Product {
  id: string;
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
  status: 'ACTIVE' | 'DRAFT' | 'OUT_OF_STOCK';
  featured: boolean;
  tag?: LocalizedText;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod =
  | 'FPS'
  | 'OCTOPUS'
  | 'PAYME'
  | 'ALIPAY_HK'
  | 'WECHAT_PAY_HK'
  | 'CARD';

export type DeliveryMethod = 'SF_DOOR' | 'SF_LOCKER' | 'CENTRAL_PICKUP';

export type OrderStatus =
  | 'CONFIRMED'
  | 'PACKING'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED';

export interface ShipmentEvent {
  id: string;
  status: OrderStatus;
  location: LocalizedText;
  note: LocalizedText;
  timestamp: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: LocalizedText;
  quantity: number;
  unitPriceHkd: number;
  lineTotalHkd: number;
  imageUrl: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  trackingNumber: string;
  courier: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  district: string;
  address: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  paymentStatus: 'PAID' | 'PENDING';
  orderStatus: OrderStatus;
  subtotalHkd: number;
  shippingHkd: number;
  totalHkd: number;
  items: OrderItem[];
  shipmentEvents: ShipmentEvent[];
  preferredLang: Language;
  createdAt: string;
  updatedAt: string;
}

export type MemberTier = 'SILVER' | 'GLACIER_GOLD' | 'CRYO_VIP';
export type MemberRole = 'MEMBER' | 'ADMIN';

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  district: string;
  tier: MemberTier;
  role: MemberRole;
  preferredLang: Language;
  totalOrders: number;
  totalSpentHkd: number;
  status: 'ACTIVE' | 'SUSPENDED';
  joinedAt: string;
  lastOrderAt: string;
}

export interface RevenuePoint {
  date: string;
  revenueHkd: number;
  orders: number;
}

export interface PaymentBreakdown {
  method: PaymentMethod;
  amountHkd: number;
  count: number;
}

export interface CategoryBreakdown {
  category: ProductCategory;
  revenueHkd: number;
  units: number;
}

export interface AnalyticsSummary {
  totalRevenueHkd: number;
  totalOrders: number;
  averageOrderValueHkd: number;
  activeMembers: number;
  lowStockCount: number;
  pendingFulfillmentCount: number;
  dailyRevenue: RevenuePoint[];
  paymentBreakdown: PaymentBreakdown[];
  categoryBreakdown: CategoryBreakdown[];
}

export interface SpringBootBlueprintFile {
  path: string;
  language: 'xml' | 'java' | 'yaml';
  description: LocalizedText;
  content: string;
}
