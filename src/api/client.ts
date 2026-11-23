import type {
  AnalyticsSummary,
  DeliveryMethod,
  Language,
  LocalizedText,
  Member,
  MemberRole,
  MemberTier,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductCategory,
  SiteConfig,
  SpringBootBlueprintFile,
} from '../types';

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchSiteConfig(): Promise<SiteConfig> {
  const data = await requestJson<{ config: SiteConfig }>('/api/v1/site-config');
  return data.config;
}

export async function fetchProducts(category = 'all', q = ''): Promise<Product[]> {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.set('category', category);
  if (q.trim()) params.set('q', q.trim());
  const qs = params.toString();
  const data = await requestJson<{ products: Product[] }>(`/api/v1/products${qs ? `?${qs}` : ''}`);
  return data.products;
}

export interface PlaceOrderPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  district: string;
  address: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  preferredLang: Language;
  items: { productId: string; quantity: number }[];
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<Order> {
  const data = await requestJson<{ order: Order }>('/api/v1/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.order;
}

export interface TrackingResult {
  orderNumber: string;
  trackingNumber: string;
  courier: string;
  district: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  orderStatus: OrderStatus;
  totalHkd: number;
  items: Order['items'];
  shipmentEvents: Order['shipmentEvents'];
  createdAt: string;
  updatedAt: string;
}

export async function lookupTracking(query: string): Promise<TrackingResult> {
  const data = await requestJson<{ tracking: TrackingResult }>(
    `/api/v1/tracking/${encodeURIComponent(query.trim())}`
  );
  return data.tracking;
}

// -----------------------------------------------------------------------------
// AUTH & ADMIN API (Firebase ID Token held strictly in React state memory)
// -----------------------------------------------------------------------------

export interface AuthenticatedUserProfile {
  uid: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthSessionResponse {
  token: string;
  user: AuthenticatedUserProfile;
}

export async function registerMember(payload: {
  name: string;
  phone: string;
  email: string;
  preferredLang: Language;
}): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginMember(payload: {
  email: string;
  phone: string;
}): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>('/api/v1/auth/member-login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchCurrentUser(idToken: string): Promise<AuthenticatedUserProfile> {
  const data = await requestJson<{ user: AuthenticatedUserProfile }>('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return data.user;
}

function adminHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchAdminAnalytics(token: string): Promise<AnalyticsSummary> {
  const data = await requestJson<{ analytics: AnalyticsSummary }>('/api/v1/admin/analytics', {
    headers: adminHeaders(token),
  });
  return data.analytics;
}

export async function fetchAdminProducts(token: string): Promise<Product[]> {
  const data = await requestJson<{ products: Product[] }>('/api/v1/admin/products', {
    headers: adminHeaders(token),
  });
  return data.products;
}

export interface UpsertProductPayload {
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
  imageUrl: string;
}

export async function createAdminProduct(token: string, payload: UpsertProductPayload): Promise<Product> {
  const data = await requestJson<{ product: Product }>('/api/v1/admin/products', {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return data.product;
}

export async function updateAdminProduct(
  token: string,
  id: string,
  payload: Partial<UpsertProductPayload>
): Promise<Product> {
  const data = await requestJson<{ product: Product }>(`/api/v1/admin/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return data.product;
}

export async function deleteAdminProduct(token: string, id: string): Promise<void> {
  await requestJson(`/api/v1/admin/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  });
}

export async function fetchAdminOrders(token: string): Promise<Order[]> {
  const data = await requestJson<{ orders: Order[] }>('/api/v1/admin/orders', {
    headers: adminHeaders(token),
  });
  return data.orders;
}

export async function updateOrderShipment(
  token: string,
  orderId: string,
  payload: { status: OrderStatus; location: LocalizedText; note: LocalizedText }
): Promise<Order> {
  const data = await requestJson<{ order: Order }>(
    `/api/v1/admin/orders/${encodeURIComponent(orderId)}/shipment`,
    {
      method: 'PATCH',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  return data.order;
}

export async function fetchAdminMembers(token: string): Promise<Member[]> {
  const data = await requestJson<{ members: Member[] }>('/api/v1/admin/members', {
    headers: adminHeaders(token),
  });
  return data.members;
}

export interface UpsertMemberPayload {
  name: string;
  email: string;
  phone: string;
  district: string;
  tier: MemberTier;
  role?: MemberRole;
  preferredLang: Language;
  status: 'ACTIVE' | 'SUSPENDED';
}

export async function createAdminMember(
  token: string,
  payload: UpsertMemberPayload
): Promise<Member> {
  const data = await requestJson<{ member: Member }>('/api/v1/admin/members', {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify(payload),
  });
  return data.member;
}

export async function updateAdminMember(
  token: string,
  memberId: string,
  payload: Partial<UpsertMemberPayload>
): Promise<Member> {
  const data = await requestJson<{ member: Member }>(
    `/api/v1/admin/members/${encodeURIComponent(memberId)}`,
    {
      method: 'PUT',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  return data.member;
}

export async function deleteAdminMember(token: string, memberId: string): Promise<void> {
  await requestJson(`/api/v1/admin/members/${encodeURIComponent(memberId)}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  });
}

export async function uploadAdminProductImage(
  token: string,
  dataBase64: string
): Promise<{ imageUrl: string; mimeType: string; sizeBytes: number }> {
  return requestJson('/api/v1/admin/upload-image', {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify({ dataBase64 }),
  });
}

export interface ExcelImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function downloadAdminExcel(
  token: string,
  resource: 'products' | 'members'
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`/api/v1/admin/${resource}/export`, {
    headers: adminHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err?.error === 'string' ? err.error : 'Failed to export Excel file.');
  }
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : `dufreez-${resource}.xlsx`;
  const blob = await res.blob();
  return { blob, filename };
}

export async function importAdminExcel(
  token: string,
  resource: 'products' | 'members',
  fileBase64: string
): Promise<ExcelImportSummary> {
  const data = await requestJson<{ summary: ExcelImportSummary }>(
    `/api/v1/admin/${resource}/import`,
    {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({ fileBase64 }),
    }
  );
  return data.summary;
}

export async function updateAdminSiteConfig(
  token: string,
  config: SiteConfig
): Promise<SiteConfig> {
  const data = await requestJson<{ config: SiteConfig }>('/api/v1/admin/site-config', {
    method: 'PUT',
    headers: adminHeaders(token),
    body: JSON.stringify(config),
  });
  return data.config;
}

export async function fetchSpringBootBlueprint(token: string): Promise<SpringBootBlueprintFile[]> {
  const data = await requestJson<{ files: SpringBootBlueprintFile[] }>(
    '/api/v1/admin/springboot-blueprint',
    {
      headers: adminHeaders(token),
    }
  );
  return data.files;
}
