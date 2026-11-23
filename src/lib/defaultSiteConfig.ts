import type { SiteConfig } from '../types.ts';

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  utilityStrip: {
    zh: '香港全區購物滿 HK$480 免費享順豐速運溫控配送 · 支援轉數快 FPS / 八達通 / PayMe',
    en: 'Complimentary SF Express climate-controlled delivery across Hong Kong over HK$480 · FPS / Octopus / PayMe',
    ko: '홍콩 전역 HK$480 이상 구매 시 SF Express 무료 콜드체인 배송 · FPS / 옥토퍼스 / PayMe 지원',
  },
  headerMenu: [
    {
      id: 'nav-shop',
      label: { zh: '探索商品', en: 'Shop', ko: '스토어' },
      actionType: 'section',
      target: '#catalog',
      visible: true,
    },
    {
      id: 'nav-collections',
      label: { zh: '精選系列', en: 'Collections', ko: '컬렉션' },
      actionType: 'section',
      target: '#collections',
      visible: true,
    },
    {
      id: 'nav-tracking',
      label: { zh: '物流追蹤', en: 'Track Order', ko: '배송조회' },
      actionType: 'view',
      target: 'tracking',
      visible: true,
    },
    {
      id: 'nav-story',
      label: { zh: '品牌理念', en: 'Atelier', ko: '브랜드 스토리' },
      actionType: 'section',
      target: '#story',
      visible: true,
    },
    {
      id: 'nav-admin',
      label: { zh: '管理後台', en: 'Admin', ko: '관리자' },
      actionType: 'view',
      target: 'admin',
      visible: true,
    },
  ],
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
    imageUrl: '/src/assets/images/hero_dufreez_campaign_1795270503125.jpg',
    imagePosition: 'right',
    proofItems: [
      {
        label: { zh: '香港同日冷鏈出庫', en: 'Same-Day HK Dispatch', ko: '홍콩 당일 콜드체인 출고' },
        value: { zh: '16:00 前下單', en: 'Before 4:00 PM HKT', ko: 'HKT 16:00 이전 주문' },
      },
      {
        label: { zh: '臨床 72 小時鎖水實測', en: '72h Hydration Retention', ko: '72시간 수분 유지 임상' },
        value: { zh: '+64.8% 屏障提升', en: '+64.8% Barrier Index', ko: '피부 장벽 +64.8%' },
      },
      {
        label: { zh: '香港本地即時支付', en: 'Local HK Checkout', ko: '홍콩 현지 결제 완비' },
        value: { zh: 'FPS · 八達通 · PayMe', en: 'FPS · Octopus · PayMe', ko: 'FPS · 옥토퍼스 · PayMe' },
      },
      {
        label: { zh: '順豐全港配送網絡', en: 'SF Express Network', ko: 'SF Express 홍콩 배송' },
        value: { zh: '1,000+ 智能櫃及上門', en: '1,000+ Lockers & Door', ko: '1,000+ 락커 및 문 앞 배송' },
      },
    ],
  },
  catalogSection: {
    title: { zh: '精選修護配方', en: 'Curated Formulations', ko: '시그니처 포뮬레이션' },
    description: {
      zh: '每款產品皆於香港冷鏈恆溫倉保存，確保高活性植萃成分在開啟瞬間維持最佳效能。',
      en: 'Stored in our Kwai Chung climate-controlled vault to preserve bio-active potency until the moment you unseal.',
      ko: '모든 제품은 홍콩 콰이청 콜드체인 보관소에서 최적 온도로 관리되어 개봉 순간까지 유효 성분의 활성을 유지합니다.',
    },
  },
  categories: [
    { slug: 'serum', label: { zh: '冰感精華', en: 'Cryo Serums', ko: '크라이오 세럼' } },
    { slug: 'cream', label: { zh: '屏障修護霜', en: 'Barrier Creams', ko: '장벽 리페어 크림' } },
    { slug: 'mist', label: { zh: '植萃噴霧', en: 'Botanical Mists', ko: '보태니컬 미스트' } },
    { slug: 'wellness', label: { zh: '內在美學', en: 'Inner Wellness', ko: '이너 뷰티' } },
    { slug: 'ritual', label: { zh: '限定禮盒', en: 'Curated Rituals', ko: '리추얼 세트' } },
  ],
  story: {
    visible: true,
    kicker: {
      zh: '香港中環配方實驗室 · DUFREEZ ATELIER',
      en: 'Central Hong Kong Formulation Lab · DUFREEZ Atelier',
      ko: '홍콩 센트럴 포뮬레이션 아틀리에 · DUFREEZ',
    },
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
    imageUrl: '/src/assets/images/brand_story_lab_1795270503389.jpg',
    imagePosition: 'left',
    metrics: [
      {
        title: { zh: '4°C 低溫萃取', en: '4°C Cold Extraction', ko: '4°C 저온 추출' },
        description: {
          zh: '較傳統熱萃保留高出 3.2 倍活性胜肽',
          en: 'Preserves 3.2× more active peptides vs heat distillation',
          ko: '열추출 대비 3.2배 높은 펩타이드 활성 유지',
        },
      },
      {
        title: { zh: '全港冷鏈覆蓋', en: 'Full HK Cold-Chain', ko: '홍콩 전역 콜드체인' },
        description: {
          zh: '港島・九龍・新界 24–48 小時溫控送達',
          en: '24–48h climate-controlled delivery across HK Island, Kowloon & NT',
          ko: '홍콩섬·구룡·신계 24~48시간 정온 배송',
        },
      },
      {
        title: { zh: '成分全透明溯源', en: '100% Traceable Actives', ko: '100% 원료 이력 추적' },
        description: {
          zh: '每瓶附設批次編號，通過香港及韓國雙重皮膚測試',
          en: 'Batch-numbered and dermatologist tested in HK & Seoul',
          ko: '전 제품 배치 번호 표기 및 홍콩·서울 피부 자극 테스트 완료',
        },
      },
    ],
  },
  footer: {
    brandTitle: 'DUFREEZ · dufreez.com',
    tagline: {
      zh: '香港中環皇后大道中 88 號 12 樓',
      en: '12/F, 88 Queen’s Road Central, Hong Kong',
      ko: '홍콩 퀸즈로드 센트럴 88, 12층',
    },
    businessHours: {
      zh: '週一至週六 10:00–19:00 HKT',
      en: 'Mon–Sat 10:00–19:00 HKT',
      ko: '월–토 10:00–19:00 HKT',
    },
    contactEmail: 'concierge@dufreez.com',
    contactPhone: '+852 2810 4920',
    paymentNotice: 'FPS · Octopus · PayMe · AlipayHK · WeChat Pay HK · Visa/MC',
    rights: {
      zh: '© 2026 DUFREEZ Hong Kong Limited (dufreez.com). 保留一切權利。',
      en: '© 2026 DUFREEZ Hong Kong Limited (dufreez.com). All rights reserved.',
      ko: '© 2026 DUFREEZ Hong Kong Limited (dufreez.com). All rights reserved.',
    },
    links: [
      {
        id: 'ft-shop',
        label: { zh: '探索商品', en: 'Shop', ko: '스토어' },
        actionType: 'section',
        target: '#catalog',
      },
      {
        id: 'ft-tracking',
        label: { zh: '物流追蹤', en: 'Track Order', ko: '배송조회' },
        actionType: 'view',
        target: 'tracking',
      },
      {
        id: 'ft-admin',
        label: { zh: '管理後台', en: 'Admin', ko: '관리자' },
        actionType: 'view',
        target: 'admin',
      },
    ],
  },
};
