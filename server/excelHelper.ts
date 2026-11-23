import ExcelJS from 'exceljs';
import type { CreateProductInput, UpsertMemberInput } from '../src/db/repository.ts';
import { GENERATED_IMAGES } from '../src/db/seedData.ts';
import type { Language, Member, MemberRole, MemberTier, Product, ProductCategory } from '../src/types.ts';

const DEFAULT_CATEGORY_SLUGS = ['serum', 'cream', 'mist', 'wellness', 'ritual'];
const VALID_STATUSES: Product['status'][] = ['ACTIVE', 'DRAFT', 'OUT_OF_STOCK'];
const VALID_TIERS: MemberTier[] = ['SILVER', 'GLACIER_GOLD', 'CRYO_VIP'];
const VALID_LANGS: Language[] = ['zh', 'en', 'ko'];
const MAX_IMPORT_ROWS = 500;
const CATEGORY_SLUG_RE = /^[a-z0-9_-]{2,32}$/;

function safeExcelCell(value: string): string {
  // Neutralize spreadsheet formula injection on exported text
  if (/^[=@]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text.trim();
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text || '').join('').trim();
    }
    if ('result' in value && value.result !== undefined && value.result !== null) {
      return String(value.result).trim();
    }
  }
  return '';
}

function isSafeImagePath(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/src/assets/images/') && !url.includes('..')) return true;
  if (/^\/uploads\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(url)) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D1B2A' },
  };
  row.alignment = { vertical: 'middle', horizontal: 'left' };
  row.height = 24;
}

export async function buildProductsWorkbookBuffer(
  products: Product[],
  categorySlugs: string[] = DEFAULT_CATEGORY_SLUGS
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DUFREEZ Hong Kong Admin';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Products');
  sheet.columns = [
    { header: 'SKU', key: 'sku', width: 16 },
    { header: 'Category', key: 'category', width: 13 },
    { header: 'Name_KO', key: 'nameKo', width: 28 },
    { header: 'Name_EN', key: 'nameEn', width: 30 },
    { header: 'Name_ZH', key: 'nameZh', width: 28 },
    { header: 'Subtitle_KO', key: 'subtitleKo', width: 32 },
    { header: 'Subtitle_EN', key: 'subtitleEn', width: 34 },
    { header: 'Subtitle_ZH', key: 'subtitleZh', width: 32 },
    { header: 'Description_KO', key: 'descriptionKo', width: 42 },
    { header: 'Description_EN', key: 'descriptionEn', width: 42 },
    { header: 'Description_ZH', key: 'descriptionZh', width: 42 },
    { header: 'Ingredients', key: 'ingredients', width: 36 },
    { header: 'Volume', key: 'volume', width: 18 },
    { header: 'Price_HKD', key: 'priceHkd', width: 13 },
    { header: 'CompareAt_HKD', key: 'compareAtHkd', width: 15 },
    { header: 'Stock', key: 'stock', width: 10 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Image_URL', key: 'imageUrl', width: 44 },
  ];
  styleHeaderRow(sheet.getRow(1));

  for (const p of products) {
    sheet.addRow({
      sku: safeExcelCell(p.sku),
      category: p.category,
      nameKo: safeExcelCell(p.name.ko),
      nameEn: safeExcelCell(p.name.en),
      nameZh: safeExcelCell(p.name.zh),
      subtitleKo: safeExcelCell(p.subtitle.ko),
      subtitleEn: safeExcelCell(p.subtitle.en),
      subtitleZh: safeExcelCell(p.subtitle.zh),
      descriptionKo: safeExcelCell(p.description.ko),
      descriptionEn: safeExcelCell(p.description.en),
      descriptionZh: safeExcelCell(p.description.zh),
      ingredients: safeExcelCell(p.ingredients.en),
      volume: safeExcelCell(p.volume),
      priceHkd: p.priceHkd,
      compareAtHkd: p.compareAtHkd ?? '',
      stock: p.stock,
      status: p.status,
      imageUrl: p.imageUrl,
    });
  }

  const guide = workbook.addWorksheet('Upload_Guide');
  guide.columns = [
    { header: 'Field', key: 'field', width: 22 },
    { header: 'Allowed Values / Rule', key: 'rule', width: 70 },
  ];
  styleHeaderRow(guide.getRow(1));
  guide.addRows([
    { field: 'SKU (Unique Key)', rule: 'Existing SKU updates the product; new SKU creates a new product (e.g. DF-SRM-010).' },
    { field: 'Category', rule: `Active category slugs: ${categorySlugs.join(', ')}` },
    { field: 'Price_HKD', rule: 'Positive integer in Hong Kong Dollars (e.g. 490)' },
    { field: 'Stock', rule: 'Non-negative integer (e.g. 50)' },
    { field: 'Status', rule: 'ACTIVE, DRAFT, or OUT_OF_STOCK' },
    { field: 'Image_URL', rule: 'Optional. HTTPS URL or /uploads/... path. Recommended 1200x900px (4:3), JPG/PNG/WebP.' },
  ]);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function parseProductsWorkbookBuffer(
  buffer: Buffer,
  allowedCategories: string[] = DEFAULT_CATEGORY_SLUGS
): Promise<{ rows: CreateProductInput[]; errors: string[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const sheet = workbook.getWorksheet('Products') || workbook.worksheets[0];
  if (!sheet) {
    throw new Error('Excel file does not contain a readable worksheet.');
  }

  const headerMap = new Map<string, number>();
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const key = cellToString(cell.value).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key) headerMap.set(key, colNumber);
  });

  const getCol = (row: ExcelJS.Row, ...aliases: string[]): string => {
    for (const alias of aliases) {
      const idx = headerMap.get(alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
      if (idx) {
        return cellToString(row.getCell(idx).value);
      }
    }
    return '';
  };

  const rows: CreateProductInput[] = [];
  const errors: string[] = [];
  const totalRows = Math.min(sheet.rowCount, MAX_IMPORT_ROWS + 1);

  for (let r = 2; r <= totalRows; r++) {
    const row = sheet.getRow(r);
    const sku = getCol(row, 'SKU').toUpperCase().slice(0, 32);
    const nameEn = getCol(row, 'Name_EN', 'Name').slice(0, 120);
    const nameKo = getCol(row, 'Name_KO').slice(0, 120);
    const nameZh = getCol(row, 'Name_ZH').slice(0, 120);

    // Skip completely empty rows
    if (!sku && !nameEn && !nameKo && !nameZh) continue;

    if (!sku) {
      errors.push(`Row ${r}: Missing SKU.`);
      continue;
    }

    const fallbackName = nameEn || nameKo || nameZh;
    if (!fallbackName) {
      errors.push(`Row ${r} (${sku}): Product name is required.`);
      continue;
    }

    const catRaw = getCol(row, 'Category').toLowerCase().trim();
    const defaultCat = allowedCategories[0] || 'serum';
    const category: ProductCategory =
      catRaw && catRaw !== 'all' && (allowedCategories.includes(catRaw) || CATEGORY_SLUG_RE.test(catRaw))
        ? catRaw
        : defaultCat;

    const priceHkd = Math.round(Number(getCol(row, 'Price_HKD', 'Price')));
    if (!Number.isFinite(priceHkd) || priceHkd <= 0 || priceHkd > 99999) {
      errors.push(`Row ${r} (${sku}): Invalid Price_HKD.`);
      continue;
    }

    const compareRaw = Number(getCol(row, 'CompareAt_HKD', 'CompareAt'));
    const compareAtHkd =
      Number.isFinite(compareRaw) && compareRaw > priceHkd ? Math.round(compareRaw) : undefined;

    const stockRaw = Number(getCol(row, 'Stock'));
    const stock = Number.isInteger(stockRaw) && stockRaw >= 0 && stockRaw <= 100000 ? stockRaw : 0;

    const statusRaw = getCol(row, 'Status').toUpperCase() as Product['status'];
    const status: Product['status'] = VALID_STATUSES.includes(statusRaw)
      ? statusRaw
      : stock === 0
        ? 'OUT_OF_STOCK'
        : 'ACTIVE';

    const subEn = getCol(row, 'Subtitle_EN').slice(0, 180);
    const subKo = getCol(row, 'Subtitle_KO').slice(0, 180);
    const subZh = getCol(row, 'Subtitle_ZH').slice(0, 180);
    const subFallback = subEn || subKo || subZh || fallbackName;

    const descEn = getCol(row, 'Description_EN').slice(0, 800);
    const descKo = getCol(row, 'Description_KO').slice(0, 800);
    const descZh = getCol(row, 'Description_ZH').slice(0, 800);
    const descFallback = descEn || descKo || descZh || fallbackName;

    const ingredientsText =
      getCol(row, 'Ingredients').slice(0, 400) || 'Cryo-Botanical Extract Complex';
    const volume = getCol(row, 'Volume').slice(0, 48) || '50 ml';

    const imgCandidate = getCol(row, 'Image_URL', 'ImageUrl').slice(0, 512);
    const imageUrl = isSafeImagePath(imgCandidate) ? imgCandidate : GENERATED_IMAGES.serum;

    rows.push({
      sku,
      category,
      name: {
        zh: nameZh || fallbackName,
        en: nameEn || fallbackName,
        ko: nameKo || fallbackName,
      },
      subtitle: {
        zh: subZh || subFallback,
        en: subEn || subFallback,
        ko: subKo || subFallback,
      },
      description: {
        zh: descZh || descFallback,
        en: descEn || descFallback,
        ko: descKo || descFallback,
      },
      ingredients: {
        zh: ingredientsText,
        en: ingredientsText,
        ko: ingredientsText,
      },
      volume,
      priceHkd,
      compareAtHkd,
      stock,
      status,
      featured: true,
      imageUrl,
    });
  }

  return { rows, errors };
}

export async function buildMembersWorkbookBuffer(membersList: Member[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DUFREEZ Hong Kong Admin';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Members');
  sheet.columns = [
    { header: 'Name', key: 'name', width: 26 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'District', key: 'district', width: 22 },
    { header: 'Tier', key: 'tier', width: 16 },
    { header: 'Role', key: 'role', width: 12 },
    { header: 'Preferred_Lang', key: 'preferredLang', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Total_Orders', key: 'totalOrders', width: 14 },
    { header: 'Total_Spent_HKD', key: 'totalSpentHkd', width: 17 },
  ];
  styleHeaderRow(sheet.getRow(1));

  for (const m of membersList) {
    sheet.addRow({
      name: safeExcelCell(m.name),
      email: safeExcelCell(m.email),
      phone: m.phone,
      district: safeExcelCell(m.district),
      tier: m.tier,
      role: m.role,
      preferredLang: m.preferredLang,
      status: m.status,
      totalOrders: m.totalOrders,
      totalSpentHkd: m.totalSpentHkd,
    });
  }

  const guide = workbook.addWorksheet('Upload_Guide');
  guide.columns = [
    { header: 'Field', key: 'field', width: 22 },
    { header: 'Allowed Values / Rule', key: 'rule', width: 70 },
  ];
  styleHeaderRow(guide.getRow(1));
  guide.addRows([
    { field: 'Email (Unique Key)', rule: 'Existing email updates the member; new email creates a new member.' },
    { field: 'Tier', rule: 'SILVER, GLACIER_GOLD, or CRYO_VIP' },
    { field: 'Role', rule: 'MEMBER (regular member) or ADMIN (can access Admin Console on login)' },
    { field: 'Preferred_Lang', rule: 'zh, en, or ko' },
    { field: 'Status', rule: 'ACTIVE or SUSPENDED' },
    { field: 'District', rule: 'Hong Kong district (e.g. Central & Western, Wan Chai, Yau Tsim Mong, Sha Tin)' },
  ]);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function parseMembersWorkbookBuffer(
  buffer: Buffer
): Promise<{ rows: UpsertMemberInput[]; errors: string[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const sheet = workbook.getWorksheet('Members') || workbook.worksheets[0];
  if (!sheet) {
    throw new Error('Excel file does not contain a readable worksheet.');
  }

  const headerMap = new Map<string, number>();
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const key = cellToString(cell.value).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key) headerMap.set(key, colNumber);
  });

  const getCol = (row: ExcelJS.Row, ...aliases: string[]): string => {
    for (const alias of aliases) {
      const idx = headerMap.get(alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
      if (idx) {
        return cellToString(row.getCell(idx).value);
      }
    }
    return '';
  };

  const rows: UpsertMemberInput[] = [];
  const errors: string[] = [];
  const totalRows = Math.min(sheet.rowCount, MAX_IMPORT_ROWS + 1);

  for (let r = 2; r <= totalRows; r++) {
    const row = sheet.getRow(r);
    const name = getCol(row, 'Name').slice(0, 80);
    const email = getCol(row, 'Email').toLowerCase().slice(0, 120);

    if (!name && !email) continue;
    if (!email || !email.includes('@')) {
      errors.push(`Row ${r}: Valid email is required.`);
      continue;
    }
    if (!name) {
      errors.push(`Row ${r} (${email}): Name is required.`);
      continue;
    }

    const phone = getCol(row, 'Phone').slice(0, 32) || '+852 0000 0000';
    const district = getCol(row, 'District').slice(0, 60) || 'Central & Western';

    const tierRaw = getCol(row, 'Tier').toUpperCase() as MemberTier;
    const tier: MemberTier = VALID_TIERS.includes(tierRaw) ? tierRaw : 'SILVER';

    const roleRaw = getCol(row, 'Role').toUpperCase();
    const role: MemberRole | undefined =
      roleRaw === 'ADMIN' ? 'ADMIN' : roleRaw === 'MEMBER' ? 'MEMBER' : undefined;

    const langRaw = getCol(row, 'Preferred_Lang', 'Lang').toLowerCase() as Language;
    const preferredLang: Language = VALID_LANGS.includes(langRaw) ? langRaw : 'zh';

    const statusRaw = getCol(row, 'Status').toUpperCase();
    const status: 'ACTIVE' | 'SUSPENDED' = statusRaw === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';

    const ordersRaw = getCol(row, 'Total_Orders', 'Orders');
    const spentRaw = getCol(row, 'Total_Spent_HKD', 'TotalSpent');
    const totalOrders =
      ordersRaw !== '' && Number.isInteger(Number(ordersRaw)) && Number(ordersRaw) >= 0
        ? Number(ordersRaw)
        : undefined;
    const totalSpentHkd =
      spentRaw !== '' && Number.isFinite(Number(spentRaw)) && Number(spentRaw) >= 0
        ? Math.round(Number(spentRaw))
        : undefined;

    rows.push({
      name,
      email,
      phone,
      district,
      tier,
      role,
      preferredLang,
      status,
      totalOrders,
      totalSpentHkd,
    });
  }

  return { rows, errors };
}
