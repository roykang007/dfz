import type {
  CategoryItem,
  DeliveryMethod,
  Language,
  LocalizedText,
  MemberTier,
  OrderStatus,
  PaymentMethod,
} from '../types';

export const HK_DISTRICTS: { id: string; label: LocalizedText; region: LocalizedText }[] = [
  { id: 'Central & Western', label: { zh: '中西區 (中環・上環)', en: 'Central & Western', ko: '센트럴 & 웨스턴 (중환)' }, region: { zh: '香港島', en: 'Hong Kong Island', ko: '홍콩섬' } },
  { id: 'Wan Chai', label: { zh: '灣仔區 (灣仔・銅鑼灣)', en: 'Wan Chai & Causeway Bay', ko: '완차이 & 코즈웨이베이' }, region: { zh: '香港島', en: 'Hong Kong Island', ko: '홍콩섬' } },
  { id: 'Yau Tsim Mong', label: { zh: '油尖旺區 (尖沙咀・旺角)', en: 'Tsim Sha Tsui & Mong Kok', ko: '침사추이 & 몽콕' }, region: { zh: '九龍', en: 'Kowloon', ko: '구룡' } },
  { id: 'Kwun Tong', label: { zh: '觀塘區', en: 'Kwun Tong', ko: '쿤통' }, region: { zh: '九龍', en: 'Kowloon', ko: '구룡' } },
  { id: 'Sha Tin', label: { zh: '沙田區', en: 'Sha Tin', ko: '샤틴' }, region: { zh: '新界', en: 'New Territories', ko: '신계' } },
  { id: 'Tseung Kwan O', label: { zh: '將軍澳・西貢', en: 'Tseung Kwan O & Sai Kung', ko: '정관오 & 사이쿵' }, region: { zh: '新界', en: 'New Territories', ko: '신계' } },
  { id: 'Tsuen Wan', label: { zh: '荃灣區', en: 'Tsuen Wan', ko: '췬완' }, region: { zh: '新界', en: 'New Territories', ko: '신계' } },
];

export const CATEGORY_LABELS: Record<string, LocalizedText> = {
  all: { zh: '全部商品', en: 'All Products', ko: '전체 상품' },
  serum: { zh: '美妝', en: 'Beauty', ko: '뷰티' },
  cream: { zh: '時尚', en: 'Fashion', ko: '패션' },
  mist: { zh: '珠寶', en: 'Jewelry', ko: '주얼리' },
  wellness: { zh: '運動', en: 'Sports', ko: '스포츠' },
  ritual: { zh: '兒童及嬰兒', en: 'Kids & Baby', ko: '키즈베이비' },
};

export function getCategoryLabel(
  slug: string,
  categories: CategoryItem[] | undefined,
  lang: Language
): string {
  if (slug === 'all') return t(CATEGORY_LABELS.all, lang);
  const found = categories?.find((c) => c.slug === slug);
  if (found) return t(found.label, lang);
  if (CATEGORY_LABELS[slug]) return t(CATEGORY_LABELS[slug], lang);
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export const PAYMENT_LABELS: Record<PaymentMethod, { name: LocalizedText; hint: LocalizedText }> = {
  FPS: {
    name: { zh: '轉數快 FPS', en: 'FPS (Faster Payment)', ko: 'FPS (홍콩 즉시이체)' },
    hint: { zh: '香港金管局即時轉賬・免手續費', en: 'HKMA instant bank transfer · Zero fee', ko: '홍콩 은행 즉시 계좌이체 · 수수료 무료' },
  },
  OCTOPUS: {
    name: { zh: '八達通 Octopus', en: 'Octopus App', ko: '옥토퍼스 (Octopus)' },
    hint: { zh: '支援八達通銀包及手機拍卡付款', en: 'Pay via Octopus Wallet or Mobile Tap', ko: '옥토퍼스 앱 및 모바일 원터치 결제' },
  },
  PAYME: {
    name: { zh: 'PayMe by HSBC', en: 'PayMe by HSBC', ko: 'PayMe (HSBC)' },
    hint: { zh: '一鍵跳轉滙豐 PayMe 確認付款', en: 'Instant checkout with HSBC PayMe', ko: 'HSBC PayMe 앱 즉시 결제 연동' },
  },
  ALIPAY_HK: {
    name: { zh: 'AlipayHK 支付寶香港', en: 'AlipayHK', ko: 'AlipayHK (알리페이 홍콩)' },
    hint: { zh: '港幣實時結算・支援消費券及積分', en: 'HKD settlement with AlipayHK wallet', ko: 'HKD 실시간 결제 지원' },
  },
  WECHAT_PAY_HK: {
    name: { zh: 'WeChat Pay HK', en: 'WeChat Pay HK', ko: 'WeChat Pay HK' },
    hint: { zh: '港幣微信錢包極速掃碼支付', en: 'HKD WeChat Pay wallet scan checkout', ko: '홍콩 위챗페이 QR 간편결제' },
  },
  CARD: {
    name: { zh: 'Visa / Mastercard / Apple Pay', en: 'Visa / Mastercard / Apple Pay', ko: '신용카드 / Apple Pay' },
    hint: { zh: '3D Secure 2.0 加密港幣結算', en: '3DS2 encrypted HKD card checkout', ko: '3DS2 보안 암호화 HKD 결제' },
  },
};

export const DELIVERY_LABELS: Record<DeliveryMethod, { name: LocalizedText; eta: LocalizedText; feeHkd: number }> = {
  SF_DOOR: {
    name: { zh: '順豐速運上門派送', en: 'SF Express Door-to-Door', ko: 'SF Express 문 앞 배송' },
    eta: { zh: '1–2 個工作天送達（全港冷鏈溫控）', en: '1–2 business days (HK climate-controlled)', ko: '1–2 영업일 도착 (홍콩 전역 콜드체인)' },
    feeHkd: 38,
  },
  SF_LOCKER: {
    name: { zh: '順豐智能櫃 / 順豐站自取', en: 'SF Locker / SF Station Pickup', ko: 'SF 스마트락커 / 지점 픽업' },
    eta: { zh: '24 小時全港逾 1,000 個自取點', en: '24/7 pickup across 1,000+ HK lockers', ko: '홍콩 전역 1,000+ 스마트락커 24시간 수령' },
    feeHkd: 25,
  },
  CENTRAL_PICKUP: {
    name: { zh: '中環旗艦店免費自取', en: 'Central Flagship Atelier Pickup', ko: '센트럴 플래그십 스토어 픽업' },
    eta: { zh: '最快 2 小時備妥（中環皇后大道中 88 號）', en: 'Ready in 2 hours (88 Queen’s Road Central)', ko: '최소 2시간 내 준비 (퀸즈로드 센트럴 88)' },
    feeHkd: 0,
  },
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, LocalizedText> = {
  CONFIRMED: { zh: '已確認訂單', en: 'Order Confirmed', ko: '주문 확인' },
  PACKING: { zh: '葵涌冷鏈倉打包中', en: 'Packing at Kwai Chung Hub', ko: '콰이청 콜드체인 패킹 중' },
  DISPATCHED: { zh: '順豐已攬收', en: 'Dispatched via SF Express', ko: 'SF Express 발송 완료' },
  IN_TRANSIT: { zh: '香港分撥中心轉運中', en: 'In Transit (HK Hub)', ko: '홍콩 물류 허브 이동 중' },
  OUT_FOR_DELIVERY: { zh: '派送員正前往派遞', en: 'Out for Delivery', ko: '배송 기사 이동 중' },
  DELIVERED: { zh: '已簽收送達', en: 'Delivered', ko: '배송 완료' },
};

export const MEMBER_TIER_LABELS: Record<MemberTier, LocalizedText> = {
  SILVER: { zh: '銀霜會員', en: 'Silver', ko: '실버 멤버' },
  GLACIER_GOLD: { zh: '冰川金卡', en: 'Glacier Gold', ko: '글레이셔 골드' },
  CRYO_VIP: { zh: '極致黑鑽 VIP', en: 'Cryo VIP', ko: '크라이오 VIP' },
};

export const UI_TEXT = {
  utilityStrip: {
    zh: '香港全區購物滿 HK$480 免費享順豐速運溫控配送 · 支援轉數快 FPS / 八達通 / PayMe',
    en: 'Complimentary SF Express climate-controlled delivery across Hong Kong over HK$480 · FPS / Octopus / PayMe',
    ko: '홍콩 전역 HK$480 이상 구매 시 SF Express 무료 콜드체인 배송 · FPS / 옥토퍼스 / PayMe 지원',
  },
  nav: {
    shop: { zh: '探索商品', en: 'Shop', ko: '스토어' },
    collections: { zh: '精選系列', en: 'Collections', ko: '컬렉션' },
    tracking: { zh: '物流追蹤', en: 'Track Order', ko: '배송조회' },
    story: { zh: '品牌理念', en: 'Atelier', ko: '브랜드 스토리' },
    admin: { zh: '管理後台', en: 'Admin', ko: '관리자' },
    bag: { zh: '購物袋', en: 'Bag', ko: '장바구니' },
    loginSignup: { zh: '登入 / 註冊', en: 'Sign In', ko: '로그인 / 회원가입' },
    logout: { zh: '登出', en: 'Sign Out', ko: '로그아웃' },
  },
  memberAuth: {
    loginTab: { zh: '會員登入', en: 'Sign In', ko: '로그인' },
    signupTab: { zh: '快速註冊', en: 'Sign Up', ko: '회원가입' },
    signupTitle: { zh: 'DUFREEZ 快速會員註冊', en: 'Quick Member Registration', ko: 'DUFREEZ 간편 회원가입' },
    signupDesc: {
      zh: '僅需填寫姓名、電話與電郵即可立即成為會員。',
      en: 'Join in seconds with just your name, phone number, and email.',
      ko: '이름, 전화번호, 이메일만 입력하면 바로 회원가입이 완료됩니다.',
    },
    loginTitle: { zh: '會員登入', en: 'Member Sign In', ko: '회원 로그인' },
    loginDesc: {
      zh: '輸入註冊時的電郵與電話號碼登入；如已被指定為管理員，登入後即可看見管理後台選單。',
      en: 'Sign in with your registered email and phone. Designated admins will see the Admin menu immediately.',
      ko: '가입하신 이메일과 전화번호로 로그인하세요. 관리자로 지정된 회원은 로그인 시 관리자 메뉴가 표시됩니다.',
    },
    nameLabel: { zh: '姓名', en: 'Full Name', ko: '이름' },
    phoneLabel: { zh: '聯絡電話', en: 'Phone Number', ko: '전화번호' },
    emailLabel: { zh: '電子郵件', en: 'Email Address', ko: '이메일' },
    signupSubmit: { zh: '完成註冊並登入', en: 'Create Account', ko: '회원가입 완료' },
    loginSubmit: { zh: '登入帳號', en: 'Sign In', ko: '로그인' },
    orDivider: { zh: '或使用 Google 帳號登入', en: 'Or continue with Google', ko: '또는 Google 계정으로 로그인' },
    googleBtn: { zh: '使用 Google 帳號登入', en: 'Continue with Google', ko: 'Google 계정으로 로그인' },
    submitting: { zh: '處理中...', en: 'Please wait...', ko: '처리 중...' },
  },
  hero: {
    kicker: {
      zh: '香港中環研製 · 亞熱帶潮濕氣候專研低溫植萃護膚',
      en: 'Central, Hong Kong · Cryo-Botanical Formulations for Subtropical Climates',
      ko: '홍콩 센트럴 포뮬레이션 · 아열대 습윤 기후 맞춤 크라이오 보태니컬 스킨케어',
    },
    headline: {
      zh: '以零度極淨植萃，重塑肌底恆濕屏障',
      en: 'Sub-Zero Botanical Purity for Weightless Cellular Calm',
      ko: '극저온 보태니컬의 정수로 완성하는 투명한 수분 장벽',
    },
    subhead: {
      zh: 'dufreez.com 承襲高機能生物修護美學，針對香港高溫潮濕與空調乾燥交替環境，透過低溫微囊萃取鎖存高活性胜肽與海洋膠原，實現無負擔深層透潤。',
      en: 'Engineered for Hong Kong’s contrast between humid summers and dry air-conditioned interiors. Cryo-encapsulated peptides and marine bio-actives absorb cleanly with zero residue.',
      ko: '홍콩의 고온다습한 야외와 건조한 실내 냉방 환경을 동시에 고려해 설계했습니다. 저온 미세캡슐 공법으로 추출한 펩타이드와 마린 콜라겐이 끈적임 없이 깊숙이 흡수됩니다.',
    },
    ctaPrimary: { zh: '選購皇牌系列', en: 'Explore Collection', ko: '베스트 컬렉션 보기' },
    ctaSecondary: { zh: '追蹤我的訂單', en: 'Track Shipment', ko: '실시간 배송 조회' },
    proof1Label: { zh: '香港同日冷鏈出庫', en: 'Same-Day HK Dispatch', ko: '홍콩 당일 콜드체인 출고' },
    proof1Value: { zh: '16:00 前下單', en: 'Before 4:00 PM HKT', ko: 'HKT 16:00 이전 주문' },
    proof2Label: { zh: '臨床 72 小時鎖水實測', en: '72h Hydration Retention', ko: '72시간 수분 유지 임상' },
    proof2Value: { zh: '+64.8% 屏障提升', en: '+64.8% Barrier Index', ko: '피부 장벽 +64.8%' },
    proof3Label: { zh: '香港本地即時支付', en: 'Local HK Checkout', ko: '홍콩 현지 결제 완비' },
    proof3Value: { zh: 'FPS · 八達通 · PayMe', en: 'FPS · Octopus · PayMe', ko: 'FPS · 옥토퍼스 · PayMe' },
    proof4Label: { zh: '順豐全港配送網絡', en: 'SF Express Network', ko: 'SF Express 홍콩 배송' },
    proof4Value: { zh: '1,000+ 智能櫃及上門', en: '1,000+ Lockers & Door', ko: '1,000+ 락커 및 문 앞 배송' },
  },
  catalog: {
    sectionTitle: { zh: '精選修護配方', en: 'Curated Formulations', ko: '시그니처 포뮬레이션' },
    sectionDesc: {
      zh: '每款產品皆於香港冷鏈恆溫倉保存，確保高活性植萃成分在開啟瞬間維持最佳效能。',
      en: 'Stored in our Kwai Chung climate-controlled vault to preserve bio-active potency until the moment you unseal.',
      ko: '모든 제품은 홍콩 콰이청 콜드체인 보관소에서 최적 온도로 관리되어 개봉 순간까지 유효 성분의 활성을 유지합니다.',
    },
    searchPlaceholder: { zh: '搜尋商品名稱、成分或編號...', en: 'Search formulations, ingredients, SKU...', ko: '상품명, 성분, SKU 검색...' },
    addToBag: { zh: '加入購物袋', en: 'Add to Bag', ko: '장바구니 담기' },
    added: { zh: '已加入購物袋', en: 'Added to Bag', ko: '담기 완료' },
    outOfStock: { zh: '暫時缺貨', en: 'Sold Out', ko: '품절' },
    inStock: { zh: '香港現貨', en: 'In Stock HK', ko: '홍콩 재고 보유' },
    lowStock: { zh: '少量現貨', en: 'Low Stock', ko: '품절 임박' },
    viewDetails: { zh: '查看詳情', en: 'View Details', ko: '상세 보기' },
    keyIngredients: { zh: '核心活性成分', en: 'Key Bio-Actives', ko: '핵심 유효 성분' },
    volume: { zh: '容量規格', en: 'Net Volume', ko: '용량' },
    stockLeft: { zh: '尚餘庫存', en: 'Units Available', ko: '남은 수량' },
    noResults: { zh: '找不到符合條件的商品。', en: 'No formulations match your current filter.', ko: '조건에 맞는 상품이 없습니다.' },
    resetFilters: { zh: '重設篩選', en: 'Reset Filters', ko: '필터 초기화' },
  },
  story: {
    kicker: { zh: '香港中環配方實驗室 · DUFREEZ ATELIER', en: 'Central Hong Kong Formulation Lab · DUFREEZ Atelier', ko: '홍콩 센트럴 포뮬레이션 아틀리에 · DUFREEZ' },
    title: {
      zh: '專為亞洲都會節奏打造的冷萃臨床美學',
      en: 'Clinical Cryo-Extraction Crafted for Urban Asian Skin',
      ko: '도시의 리듬과 습윤 기후를 위한 클리니컬 저온 추출 미학',
    },
    body1: {
      zh: 'DUFREEZ 匯聚韓國生物科研配方與香港極簡零售體驗。我們摒棄厚重矽靈與人工香精，以 4°C 低溫萃取技術完整保留植物外泌體與神經醯胺結構，讓肌膚在亞熱帶高濕環境依然透氣清潤。',
      en: 'Bridging Korean bio-dermatological science with Hong Kong’s refined retail standards. Every batch undergoes 4°C cold extraction—eliminating heavy silicones and synthetic fragrance while preserving bioactive exosomes and ceramides.',
      ko: 'DUFREEZ는 한국의 바이오 더마 과학 기술과 홍콩의 세련된 리테일 감각을 결합했습니다. 무거운 실리콘과 인공 향료를 배제하고 4°C 저온 추출 공법으로 유효 성분을 온전히 담아내어 사계절 쾌적한 사용감을 제공합니다.',
    },
    body2: {
      zh: '歡迎親臨中環皇后大道中旗艦概念空間體驗一對一肌膚含水量檢測，或於 dufreez.com 享受香港本地即時支付與順豐翌日冷鏈配送。',
      en: 'Visit our Queen’s Road Central flagship studio for a complimentary hydration diagnostic, or shop online at dufreez.com with next-day SF Express cold-chain dispatch.',
      ko: '홍콩 퀸즈로드 센트럴 플래그십 아틀리에에서 피부 수분 진단을 체험하거나, dufreez.com에서 홍콩 현지 간편결제와 SF Express 익일 콜드체인 배송을 이용해 보세요.',
    },
    metric1Title: { zh: '4°C 低溫萃取', en: '4°C Cold Extraction', ko: '4°C 저온 추출' },
    metric1Desc: { zh: '較傳統熱萃保留高出 3.2 倍活性胜肽', en: 'Preserves 3.2× more active peptides vs heat distillation', ko: '열추출 대비 3.2배 높은 펩타이드 활성 유지' },
    metric2Title: { zh: '全港冷鏈覆蓋', en: 'Full HK Cold-Chain', ko: '홍콩 전역 콜드체인' },
    metric2Desc: { zh: '港島・九龍・新界 24–48 小時溫控送達', en: '24–48h climate-controlled delivery across HK Island, Kowloon & NT', ko: '홍콩섬·구룡·신계 24~48시간 정온 배송' },
    metric3Title: { zh: '成分全透明溯源', en: '100% Traceable Actives', ko: '100% 원료 이력 추적' },
    metric3Desc: { zh: '每瓶附設批次編號，通過香港及韓國雙重皮膚測試', en: 'Batch-numbered and dermatologist tested in HK & Seoul', ko: '전 제품 배치 번호 표기 및 홍콩·서울 피부 자극 테스트 완료' },
  },
  cart: {
    title: { zh: '您的購物袋', en: 'Your Shopping Bag', ko: '장바구니' },
    empty: { zh: '購物袋目前是空的。', en: 'Your shopping bag is currently empty.', ko: '장바구니가 비어 있습니다.' },
    emptyCta: { zh: '瀏覽商品系列', en: 'Browse Formulations', ko: '상품 둘러보기' },
    freeShippingUnlocked: { zh: '已享香港順豐免費配送', en: 'Complimentary HK SF Express shipping unlocked', ko: '홍콩 SF Express 무료배송 적용됨' },
    freeShippingRemaining: { zh: '再消費 {amount} 即可享香港順豐免運', en: 'Add {amount} more for free HK SF Express shipping', ko: '{amount} 추가 구매 시 홍콩 SF Express 무료배송' },
    subtotal: { zh: '小計', en: 'Subtotal', ko: '상품 합계' },
    shipping: { zh: '香港運費', en: 'HK Shipping', ko: '홍콩 배송비' },
    free: { zh: '免費', en: 'Free', ko: '무료' },
    total: { zh: '應付總額', en: 'Total (HKD)', ko: '총 결제 금액' },
    proceedCheckout: { zh: '前往香港本地結帳', en: 'Proceed to HK Checkout', ko: '홍콩 현지 결제 진행' },
    backToBag: { zh: '返回購物袋', en: 'Back to Bag', ko: '장바구니로 돌아가기' },
    checkoutTitle: { zh: '香港快速結帳', en: 'Hong Kong Express Checkout', ko: '홍콩 현지 간편 결제' },
    recipientSection: { zh: '收件人與香港地址', en: 'Recipient & Hong Kong Delivery', ko: '수령인 및 홍콩 배송지' },
    nameLabel: { zh: '收件人姓名', en: 'Full Name', ko: '수령인 성함' },
    emailLabel: { zh: '電子郵件', en: 'Email Address', ko: '이메일 주소' },
    phoneLabel: { zh: '香港聯絡電話 (+852)', en: 'Hong Kong Mobile (+852)', ko: '홍콩 연락처 (+852)' },
    districtLabel: { zh: '香港地區', en: 'HK District', ko: '홍콩 지역구' },
    addressLabel: { zh: '詳細地址 / 順豐智能櫃編號', en: 'Street Address / SF Locker Code', ko: '상세 주소 / SF 스마트락커 코드' },
    deliverySection: { zh: '配送方式', en: 'Delivery Method', ko: '배송 방법' },
    paymentSection: { zh: '選擇香港本地付款方式', en: 'Select Hong Kong Payment Method', ko: '홍콩 현지 결제 수단 선택' },
    fpsInstruction: {
      zh: '轉數快 FPS 商戶識別碼：16890421 (DUFREEZ HK LTD) · 下單後自動產生專屬付款參考碼。',
      en: 'FPS Merchant ID: 16890421 (DUFREEZ HK LTD) · Instant verified payment reference generated upon confirmation.',
      ko: 'FPS 가맹점 ID: 16890421 (DUFREEZ HK LTD) · 결제 확인 즉시 전용 입금 참조 코드가 발급됩니다.',
    },
    walletInstruction: {
      zh: '點擊確認支付將以港幣即時授權並生成安全交易憑證，支援香港本地錢包。',
      en: 'Authorizes seamlessly in HKD with instant settlement confirmation for your chosen Hong Kong wallet.',
      ko: '선택하신 홍콩 로컬 월렛으로 HKD 실시간 결제 승인이 완료됩니다.',
    },
    cardLast4Label: { zh: '卡號末四碼（演示安全標記化）', en: 'Card Last 4 Digits (Tokenized Demo)', ko: '카드 끝 4자리 (토큰화 데모)' },
    placeOrder: { zh: '確認付款並下單', en: 'Complete HKD Payment', ko: 'HKD 결제 완료하기' },
    processing: { zh: '正在安全處理香港付款...', en: 'Processing HK payment...', ko: '홍콩 결제 안전 처리 중...' },
    orderConfirmed: { zh: '訂單已確認 — 準備香港冷鏈出庫', en: 'Order Confirmed — Preparing HK Cold-Chain Dispatch', ko: '주문 완료 — 홍콩 콜드체인 출고 준비 중' },
    orderNumber: { zh: '訂單編號', en: 'Order Number', ko: '주문 번호' },
    trackingNumber: { zh: '順豐運單號', en: 'SF Express Waybill', ko: 'SF Express 운송장 번호' },
    paymentRef: { zh: '付款參考號', en: 'Payment Reference', ko: '결제 참조 번호' },
    trackNow: { zh: '即時追蹤此訂單物流', en: 'Track This Shipment Live', ko: '이 주문 실시간 배송 추적하기' },
    continueShopping: { zh: '繼續選購', en: 'Continue Shopping', ko: '쇼핑 계속하기' },
  },
  tracking: {
    title: { zh: '香港訂單與順豐物流即時追蹤', en: 'Real-Time Hong Kong Order & Shipment Tracking', ko: '홍콩 주문 및 SF Express 실시간 배송 조회' },
    subtitle: {
      zh: '輸入您的 dufreez.com 訂單編號（例如 DF-2026-1042）或順豐運單號（例如 SFHK88291044），查看即時冷鏈配送進度。',
      en: 'Enter your dufreez.com order number (e.g. DF-2026-1042) or SF Express waybill (e.g. SFHK88291044) for live cold-chain transit updates.',
      ko: 'dufreez.com 주문번호(예: DF-2026-1042) 또는 SF Express 운송장 번호(예: SFHK88291044)를 입력해 실시간 배송 현황을 확인하세요.',
    },
    placeholder: { zh: '輸入訂單號或順豐單號...', en: 'Order # or SF Express waybill...', ko: '주문번호 또는 SF 운송장 번호 입력...' },
    searchBtn: { zh: '查詢物流', en: 'Track Order', ko: '배송 조회' },
    quickDemo: { zh: '快速查詢示範單號：', en: 'Quick lookup sample orders:', ko: '샘플 주문번호 빠른 조회:' },
    notFound: { zh: '查無此訂單或運單編號，請確認後重試。', en: 'No matching order or tracking number found. Please verify and try again.', ko: '일치하는 주문번호 또는 운송장 번호를 찾을 수 없습니다.' },
    courierLabel: { zh: '承運物流', en: 'Courier', ko: '배송사' },
    destinationLabel: { zh: '目的地', en: 'Destination', ko: '배송지' },
    paymentLabel: { zh: '付款方式', en: 'Payment', ko: '결제 수단' },
    timelineTitle: { zh: '配送歷程時間軸', en: 'Shipment Transit Timeline', ko: '실시간 배송 타임라인' },
    itemsTitle: { zh: '訂購商品明細', en: 'Order Items', ko: '주문 상품 내역' },
  },
  admin: {
    brandTitle: { zh: 'DUFREEZ 管理控制台', en: 'DUFREEZ Admin Console', ko: 'DUFREEZ 관리자 콘솔' },
    returnStorefront: { zh: '返回官方商城', en: 'View Storefront', ko: '쇼핑몰 보기' },
    signOut: { zh: '登出管理員', en: 'Sign Out', ko: '로그아웃' },
    tabs: {
      overview: { zh: '營收與數據統計', en: 'Revenue & Analytics', ko: '매출 통계 대시보드' },
      products: { zh: '商品管理與快速上架', en: 'Products & Quick Add', ko: '상품 관리 및 간편 등록' },
      orders: { zh: '訂單與物流追蹤管理', en: 'Orders & Shipments', ko: '주문 및 배송 상태 관리' },
      members: { zh: '會員管理', en: 'Members', ko: '회원 관리' },
      storefront: { zh: '版面・選單與頁尾管理', en: 'Storefront, Menus & Footer', ko: '메인 화면 · 메뉴 · 푸터 관리' },
      architecture: { zh: 'Spring Boot 後端架構', en: 'Spring Boot Backend', ko: 'Spring Boot 백엔드 코드' },
    },
    auth: {
      loginTitle: { zh: 'DUFREEZ 管理員登入', en: 'DUFREEZ Admin Sign In', ko: 'DUFREEZ 관리자 로그인' },
      loginDesc: {
        zh: '請使用授權的 Google 管理員帳號登入，以管理香港商城商品、營收數據與順豐物流。',
        en: 'Sign in with an authorized Google administrator account to manage Hong Kong catalog, revenue analytics, and fulfillment.',
        ko: '승인된 Google 관리자 계정으로 로그인하여 홍콩 쇼핑몰 상품, 매출 통계 및 배송 관리를 이용하세요.',
      },
      googleSignInBtn: { zh: '使用 Google 帳號登入管理後台', en: 'Continue with Google', ko: 'Google 계정으로 관리자 로그인' },
      signingIn: { zh: '正在驗證 Google 帳號...', en: 'Signing in with Google...', ko: 'Google 계정 인증 중...' },
      forbidden: {
        zh: '此 Google 帳號尚無管理員權限，請改用授權管理員帳號登入。',
        en: 'This Google account does not have administrator privileges. Please switch to an authorized admin account.',
        ko: '이 Google 계정에는 관리자 권한이 없습니다. 승인된 관리자 계정으로 다시 로그인해 주세요.',
      },
      switchAccount: { zh: '切換其他 Google 帳號', en: 'Sign out & switch account', ko: '다른 Google 계정으로 전환' },
    },
    kpi: {
      revenue: { zh: '累計營收 (HKD)', en: 'Total Revenue (HKD)', ko: '누적 매출 (HKD)' },
      orders: { zh: '總訂單數', en: 'Total Orders', ko: '총 주문 건수' },
      aov: { zh: '平均客單價', en: 'Average Order Value', ko: '평균 객단가 (AOV)' },
      members: { zh: '活躍會員數', en: 'Active Members', ko: '활성 회원 수' },
    },
    charts: {
      revenueTrend: { zh: '近期每日營收走勢 (HK$)', en: 'Daily Revenue Trend (HK$)', ko: '일별 매출 추이 (HK$)' },
      paymentMix: { zh: '香港本地支付方式佔比', en: 'Hong Kong Payment Method Share', ko: '홍콩 현지 결제 수단 비중' },
      categorySales: { zh: '各商品系列營收分佈', en: 'Revenue by Product Category', ko: '카테고리별 매출 분포' },
    },
    products: {
      quickAdd: { zh: '快速上架新商品', en: 'Quick Add Product', ko: '간편 상품 등록' },
      editProduct: { zh: '編輯商品資料', en: 'Edit Product', ko: '상품 정보 수정' },
      autoFill: { zh: '套用新品範本', en: 'Fill Sample Template', ko: '샘플 템플릿 자동입력' },
      saveProduct: { zh: '儲存並同步至商城', en: 'Save & Publish to Storefront', ko: '저장 및 쇼핑몰 즉시 반영' },
      cancel: { zh: '取消', en: 'Cancel', ko: '취소' },
      deleteConfirm: { zh: '確定刪除', en: 'Confirm Delete', ko: '삭제 확인' },
      uploadPhoto: { zh: '上傳商品圖片', en: 'Upload Product Photo', ko: '상품 사진 업로드' },
      uploadingPhoto: { zh: '正在驗證並上傳圖片...', en: 'Uploading image...', ko: '이미지 검증 및 업로드 중...' },
      dropHint: { zh: '點擊選擇檔案或拖曳圖片至此（JPG / PNG / WebP）', en: 'Click to browse or drag & drop (JPG / PNG / WebP)', ko: '클릭해 파일 선택 또는 드래그 앤 드롭 (JPG / PNG / WebP)' },
      guideTitle: { zh: '商品圖片上傳規範指南', en: 'Product Image Upload Guide', ko: '상품 이미지 업로드 가이드' },
      guideSize: { zh: '建議尺寸：1200 × 900 px（最低 800 × 600 px）', en: 'Recommended Size: 1200 × 900 px (min 800 × 600 px)', ko: '추천 사이즈: 1200 × 900 px (최소 800 × 600 px)' },
      guideRatio: { zh: '建議比例：4 : 3 橫式構圖（與商品卡片一致，避免裁切）', en: 'Aspect Ratio: 4 : 3 landscape (matches storefront cards cleanly)', ko: '권장 비율: 4 : 3 가로형 (쇼핑몰 카드 비율과 일치)' },
      guideFormat: { zh: '支援格式：JPG、PNG、WebP（檔案上限 3 MB，不支援 SVG）', en: 'Formats: JPG, PNG, WebP (Max 3 MB · SVG not accepted)', ko: '지원 형식: JPG, PNG, WebP (최대 3 MB · SVG 불가)' },
      guideTip: { zh: '構圖建議：建議使用淺灰或純白乾淨背景，產品置中並預留 15% 四周留白。', en: 'Framing Tip: Center the product on a bright neutral backdrop with ~15% breathing margin.', ko: '촬영 팁: 밝은 무채색·스톤 배경 중앙에 제품을 배치하고 상하좌우 15% 여백을 권장합니다.' },
      ratioWarning: { zh: '提醒：目前圖片比例與建議 4:3 略有差異，卡片顯示時可能會輕微裁切邊緣。', en: 'Note: Image ratio differs from 4:3; edges may be slightly cropped in catalog cards.', ko: '안내: 권장 4:3 비율과 다소 차이가 있어 목록 카드에서 가장자리가 소폭 크롭될 수 있습니다.' },
      studioPresets: { zh: '或選用內建攝影棚素材', en: 'Or choose a studio preset', ko: '또는 기본 스튜디오 이미지 선택' },
    },
    orders: {
      updateShipment: { zh: '更新物流節點', en: 'Update Shipment', ko: '배송 상태 업데이트' },
      nextStatus: { zh: '新配送狀態', en: 'New Shipment Status', ko: '변경할 배송 상태' },
      hubLocation: { zh: '香港轉運站點', en: 'HK Transit Facility', ko: '홍콩 물류 거점 위치' },
      note: { zh: '物流追蹤備註', en: 'Tracking Event Note', ko: '배송 추적 메모' },
      saveUpdate: { zh: '寫入追蹤時間軸', en: 'Append Tracking Update', ko: '배송 타임라인 반영' },
    },
    members: {
      searchPlaceholder: { zh: '搜尋會員姓名、電郵、電話或地區...', en: 'Search member name, email, phone, or district...', ko: '회원명, 이메일, 연락처, 지역 검색...' },
      addMember: { zh: '新增會員', en: 'Add Member', ko: '회원 추가' },
      editMember: { zh: '編輯會員資料', en: 'Edit Member Profile', ko: '회원 정보 수정' },
      saveMember: { zh: '儲存會員資料', en: 'Save Member', ko: '회원 정보 저장' },
      nameLabel: { zh: '會員姓名', en: 'Full Name', ko: '회원 이름' },
      emailLabel: { zh: '電子郵件', en: 'Email Address', ko: '이메일 주소' },
      phoneLabel: { zh: '聯絡電話', en: 'Phone (+852)', ko: '연락처 (+852)' },
      districtLabel: { zh: '香港地區', en: 'HK District', ko: '홍콩 지역구' },
      langLabel: { zh: '偏好語言', en: 'Preferred Language', ko: '선호 언어' },
      tier: { zh: '會員等級', en: 'Tier', ko: '등급' },
      ordersCount: { zh: '訂單數', en: 'Orders', ko: '주문수' },
      totalSpend: { zh: '累計消費', en: 'Total Spend', ko: '누적 구매액' },
      status: { zh: '帳號狀態', en: 'Status', ko: '상태' },
      role: { zh: '管理權限', en: 'Role', ko: '권한' },
      roleMember: { zh: '一般會員', en: 'Member', ko: '일반 회원' },
      roleAdmin: { zh: '管理員', en: 'Admin', ko: '관리자' },
      active: { zh: '正常', en: 'Active', ko: '활성' },
      suspended: { zh: '停權', en: 'Suspended', ko: '정지' },
    },
    excel: {
      exportBtn: { zh: '匯出 Excel (.xlsx)', en: 'Export Excel', ko: '엑셀 다운로드' },
      importBtn: { zh: '匯入 Excel 更新', en: 'Import Excel', ko: '엑셀 업로드' },
      importing: { zh: '正在匯入更新...', en: 'Importing...', ko: '엑셀 반영 중...' },
      summaryTitle: { zh: 'Excel 批次更新完成', en: 'Excel Batch Update Complete', ko: '엑셀 일괄 업데이트 완료' },
      created: { zh: '新增', en: 'Created', ko: '신규 등록' },
      updated: { zh: '更新', en: 'Updated', ko: '업데이트' },
      skipped: { zh: '略過', en: 'Skipped', ko: '건너뜀' },
      hintProducts: {
        zh: '匯出 .xlsx 修改價格、庫存或新增 SKU 後重新上傳，系統將自動依 SKU 批次更新。',
        en: 'Export .xlsx to edit prices, stock, or add SKUs, then upload to upsert by SKU.',
        ko: '엑셀(.xlsx)을 다운로드해 가격·재고 수정 또는 신규 SKU를 추가한 뒤 업로드하면 SKU 기준으로 자동 반영됩니다.',
      },
      hintMembers: {
        zh: '匯出 .xlsx 修改會員等級、地區或新增會員後重新上傳，系統將依 Email 批次更新。',
        en: 'Export .xlsx to edit tiers, districts, or add members, then upload to upsert by Email.',
        ko: '엑셀(.xlsx)을 다운로드해 등급·연락처 수정 또는 신규 회원을 추가한 뒤 업로드하면 이메일 기준으로 자동 반영됩니다.',
      },
    },
    storefront: {
      saveAll: { zh: '儲存並即時更新商城', en: 'Save & Publish Storefront', ko: '저장 및 쇼핑몰 즉시 반영' },
      saving: { zh: '正在儲存設定...', en: 'Saving changes...', ko: '변경 사항 저장 중...' },
      savedSuccess: {
        zh: '商城版面、分類、主選單與頁尾設定已儲存並即時生效。',
        en: 'Storefront layout, categories, header menu, and footer updates are now live.',
        ko: '메인 화면, 카테고리, 헤더 메뉴 및 푸터 설정이 저장되어 쇼핑몰에 즉시 반영되었습니다.',
      },
      subtabs: {
        sections: { zh: '主頁上下內容與圖片配置', en: 'Hero & Bottom Sections', ko: '메인 상·하단 및 이미지 배치' },
        categories: { zh: '精選配方分類管理', en: 'Product Categories', ko: '시그니처 품목 카테고리' },
        header: { zh: '頁首主選單管理', en: 'Header Menu', ko: '헤더 주메뉴 관리' },
        footer: { zh: '底部頁尾管理', en: 'Footer Settings', ko: '하단 푸터 관리' },
      },
      editLangLabel: { zh: '目前編輯語言', en: 'Editing Language', ko: '편집 언어 선택' },
      imageLeft: { zh: '圖片在左・文字在右', en: 'Image Left / Text Right', ko: '이미지 좌측 · 텍스트 우측' },
      imageRight: { zh: '文字在左・圖片在右', en: 'Text Left / Image Right', ko: '텍스트 좌측 · 이미지 우측' },
      uploadBanner: { zh: '上傳新圖片 (JPG/PNG/WebP, 3MB內)', en: 'Upload Image (JPG/PNG/WebP, max 3MB)', ko: '새 이미지 업로드 (JPG/PNG/WebP, 최대 3MB)' },
      bannerGuide: {
        zh: '建議尺寸 1400 × 900 px（16:10 或 4:3 橫圖），檔案大小上限 3 MB。',
        en: 'Recommended 1400 × 900 px (16:10 or 4:3 landscape), max 3 MB.',
        ko: '권장 사이즈: 1400 × 900 px (16:10 또는 4:3 가로형), 최대 3 MB.',
      },
    },
    architecture: {
      title: { zh: 'Spring Boot 3.4 + Java 21 企業級後端藍圖', en: 'Spring Boot 3.4 + Java 21 Backend Blueprint', ko: 'Spring Boot 3.4 + Java 21 백엔드 아키텍처' },
      subtitle: {
        zh: '即時預覽環境由 Node/Express REST API 完整驅動以確保瀏覽器零延遲體驗；下方提供與本系統 /api/v1 介面完全對應的 Spring Boot 專案原始碼，可直接檢視與下載部署至 JVM / MySQL / PostgreSQL。',
        en: 'The live preview runs on a full-stack Express REST backend matching the exact /api/v1 contract. Inspect and download the corresponding Spring Boot 3.4 / Java 21 source files below for JVM deployment.',
        ko: '현재 실시간 프리뷰는 브라우저 즉시 실행을 위해 동일한 /api/v1 스펙의 Express 백엔드로 구동되며, 아래에서 동일한 API 규격의 Spring Boot 3.4 + Java 21 백엔드 소스 코드를 바로 확인·다운로드하실 수 있습니다.',
      },
      downloadFile: { zh: '下載此檔案', en: 'Download File', ko: '파일 다운로드' },
      copyCode: { zh: '複製程式碼', en: 'Copy Code', ko: '코드 복사' },
      copied: { zh: '已複製', en: 'Copied', ko: '복사됨' },
    },
  },
  footer: {
    tagline: {
      zh: '香港中環皇后大道中 88 號 12 樓 · 客戶服務：concierge@dufreez.com · +852 2810 4920',
      en: '12/F, 88 Queen’s Road Central, Hong Kong · Concierge: concierge@dufreez.com · +852 2810 4920',
      ko: '홍콩 퀸즈로드 센트럴 88, 12층 · 고객센터: concierge@dufreez.com · +852 2810 4920',
    },
    rights: {
      zh: '© 2026 DUFREEZ Hong Kong Limited (dufreez.com). 保留一切權利。',
      en: '© 2026 DUFREEZ Hong Kong Limited (dufreez.com). All rights reserved.',
      ko: '© 2026 DUFREEZ Hong Kong Limited (dufreez.com). All rights reserved.',
    },
  },
};

export function t(text: LocalizedText, lang: Language): string {
  return text[lang] || text.en;
}

export function formatHkd(amount: number): string {
  return `HK$${amount.toLocaleString('en-HK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
