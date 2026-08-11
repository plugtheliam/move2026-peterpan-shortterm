type PeterpanListItem = {
  hidx: number;
  attribute?: {
    status_code?: string;
    naverVerification?: boolean;
    is_recommend?: boolean;
    is_jjin?: boolean;
    hasOwnerMark?: boolean;
  };
  info?: {
    subject?: string;
    thumbnail?: string;
    room_type?: string;
    room_count?: number;
    bedroom_count?: number;
    bathroom_count?: number;
    supplied_size?: number;
    supplied_pyeong?: number;
    real_size?: number;
    real_pyeong?: number;
    created_at?: string;
    live_start_date?: string;
    special_pick?: { name?: string; description?: string; allow?: boolean };
  };
  type?: {
    contract_type?: string;
    trade_type?: string;
    building_form?: string;
    building_type?: string;
    building_type_text?: string;
    building_code?: string;
  };
  price?: {
    monthly_fee?: number;
    deposit?: number;
    maintenance_cost?: number;
  };
  floor?: {
    target?: number;
    total?: number;
    floor_text?: string;
    floor_text_detail?: string;
  };
  location?: {
    coordinate?: { latitude?: string; longitude?: string };
    address?: {
      sido?: string;
      sigungu?: string;
      dong?: string;
      text?: string;
      aptName?: string | null;
    };
  };
  additional_options?: Record<string, unknown>;
  images?: Record<string, Array<{ path?: string; type?: string; order?: number }>>;
};

export type Roadview = {
  id: number;
  image: string;
  shotDate: string;
  street?: string;
  address?: string;
  link: string;
};

export type Listing = {
  id: number;
  url: string;
  title: string;
  summary: string;
  address: string;
  jibunAddress: string;
  roadAddress: string;
  lat: number;
  lon: number;
  buildingType: string;
  roomType: string;
  floor: string;
  depositManwon: number;
  monthlyManwon: number;
  maintenanceManwon: number;
  realSize: number;
  realPyeong: number;
  suppliedSize?: number;
  suppliedPyeong?: number;
  buildingDate: string;
  buildYear: number | null;
  registerStatus: "확정 가능" | "본문에 가능" | "미표시";
  moveText?: string;
  peterpanCreatedAt?: string;
  liveStartDate?: string;
  liveEndDate?: string;
  illegalBuilding?: number | null;
  images: string[];
  roadviews: Roadview[];
  kakaoRoadviewLink: string;
  kakaoMapLink: string;
  kakaoSearchLink: string;
  naverMapLink: string;
  googleMapLink: string;
  hogangnonoSearchLink: string;
  reviewFinding: string;
  passStatus: "조건통과" | "탈락" | "상세미확인";
  excludedReasons: string[];
  dataDepth: "상세" | "목록";
  rawSignals: Record<string, unknown>;
};

export type CrawlData = {
  generatedAt: string;
  source: string;
  query: Record<string, unknown>;
  totalApiCount: number;
  collectedCount: number;
  qualifiedCount: number;
  excludedCount: number;
  allListings: Listing[];
  listings: Listing[];
  excluded: Listing[];
};

const SEOUL_BOUNDS = {
  minLat: 37.42,
  maxLat: 37.7,
  minLon: 126.76,
  maxLon: 127.18,
};
const DEFAULT_MAX_DEPOSIT = 5_000_000;
const DEFAULT_MAX_MONTHLY = 3_600_000;
const COLLECTION_MAX_DEPOSIT = 10_000_000;
const COLLECTION_MAX_MONTHLY = 5_000_000;
const COLLECTION_MIN_REAL_SIZE = 49.58;
const COLLECTION_LARGE_REAL_SIZE = 52.89;
const COLLECTION_MAX_REAL_SIZE = 132.24;
const COLLECTION_MIN_REAL_PYEONG = 15;
const COLLECTION_MAX_REAL_PYEONG = 40;
const COLLECTION_BUILDING_TYPES = ["빌라/주택", "오피스텔", "아파트", "원/투룸"] as const;
type ContractMode = "short" | "monthly" | "all";

const BASE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Referer: "https://www.peterpanz.com/",
};

function clean(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function pyeong(squareMeters?: number) {
  return squareMeters ? Math.round((squareMeters / 3.305785) * 100) / 100 : 0;
}

function manwon(value?: number) {
  return Math.round((value ?? 0) / 10000);
}

function encodeMapQuery(value: string) {
  return encodeURIComponent(value || "서울");
}

function imageToOrigin(url: string) {
  return url.replace(/_thumb(\.[a-zA-Z]+)$/i, "_origin$1");
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

type ListUrlOptions = {
  pageIndex: number;
  orderId?: string;
  minRealSize?: number;
  maxRealSize?: number;
  contractMode?: ContractMode;
  maxDeposit?: number;
  maxMonthly?: number;
  buildingTypes?: readonly string[];
};

function buildListUrl({
  pageIndex,
  orderId,
  minRealSize,
  maxRealSize,
  contractMode = "short",
  maxDeposit = DEFAULT_MAX_DEPOSIT,
  maxMonthly = DEFAULT_MAX_MONTHLY,
  buildingTypes = COLLECTION_BUILDING_TYPES,
}: ListUrlOptions) {
  const filterParts = [
    `latitude:${SEOUL_BOUNDS.minLat}~${SEOUL_BOUNDS.maxLat}`,
    `longitude:${SEOUL_BOUNDS.minLon}~${SEOUL_BOUNDS.maxLon}`,
    `buildingType;${JSON.stringify(buildingTypes)}`,
    `checkDeposit:0~${maxDeposit}`,
    `checkMonth:0~${maxMonthly}`,
  ];

  if (contractMode === "short") filterParts.push('contractType;["단기임대"]');
  if (contractMode === "monthly") filterParts.push('contractType;["월세"]');
  if (minRealSize !== undefined || maxRealSize !== undefined) {
    filterParts.push(`checkRealSize:${minRealSize ?? 0}~${maxRealSize ?? ""}`);
  }

  const filter = filterParts.join("||");

  const params = new URLSearchParams({
    filter,
    zoomLevel: "14",
    center: JSON.stringify({ lat: 37.566628, lng: 126.978038 }),
    viewMode: "list",
    pageSize: "100",
    pageIndex: String(pageIndex),
    order_id: orderId ?? "",
    search: "",
    response_version: "5.3",
    filter_version: "5.1",
    order_by: "0",
  });

  return `https://api.peterpanz.com/houses/area/pc?${params.toString()}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: BASE_HEADERS });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status}: ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchText(url: string) {
  const response = await fetch(url, { headers: BASE_HEADERS });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status}: ${url}`);
  }
  return response.text();
}

function flattenHouses(data: { houses?: Record<string, Record<string, PeterpanListItem[]>> }) {
  const rows: PeterpanListItem[] = [];
  for (const group of Object.values(data.houses ?? {})) {
    for (const value of Object.values(group ?? {})) {
      if (Array.isArray(value)) rows.push(...value);
    }
  }
  return rows;
}

function extractDetailJson(html: string): Record<string, unknown> | null {
  const match =
    html.match(/const house = (\{.*?\});\s*\n/s) ??
    html.match(/var aptInfo = (\{.*?\});\s*\n/s);
  if (!match) return null;
  return JSON.parse(match[1]) as Record<string, unknown>;
}

function extractImagesFromHtml(html: string) {
  const matches = [
    ...html.matchAll(/https?:\\?\/\\?\/img\.peterpanz\.com\\?\/photo\\?\/[^"'<>\s\\]+/g),
    ...html.matchAll(/https:\/\/img\.peterpanz\.com\/photo\/[^"'<>\s]+/g),
  ];

  return unique(
    matches
      .map((match) => match[0].replaceAll("\\/", "/"))
      .map(imageToOrigin),
  );
}

async function fetchRoadviews(lat: number, lon: number): Promise<Roadview[]> {
  if (!lat || !lon) return [];
  const url =
    "https://rv.map.kakao.com/roadview-search/v2/nodes?" +
    new URLSearchParams({
      PX: String(lon),
      PY: String(lat),
      RAD: "80",
      PAGE_SIZE: "3",
      INPUT: "wgs",
      TYPE: "w",
      SERVICE: "glpano",
    }).toString();

  try {
    const data = await fetchJson<{
      street_view?: {
        streetList?: Array<{
          id: number;
          img_path: string;
          shot_date: string;
          wgsy: number;
          wgsx: number;
          st_name?: string;
          addr?: string;
        }>;
      };
    }>(url);

    return (data.street_view?.streetList ?? []).slice(0, 3).map((item) => ({
      id: item.id,
      image: `https://map.daumcdn.net/map_roadview${item.img_path}.jpg`,
      shotDate: item.shot_date,
      street: item.st_name,
      address: item.addr,
      link: `https://map.kakao.com/link/roadview/${item.wgsy},${item.wgsx}`,
    }));
  } catch {
    return [];
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function buildListing(item: PeterpanListItem, detail?: Record<string, unknown>, detailImages: string[] = []): Listing {
  const hidx = item.hidx;
  const sido = stringValue(detail?.sido) || item.location?.address?.sido || "";
  const sigungu = stringValue(detail?.sigungu) || item.location?.address?.sigungu || "";
  const dong = stringValue(detail?.dong) || item.location?.address?.dong || "";
  const address = clean([sido, sigungu, dong].filter(Boolean).join(" "));
  const jibunAddress = stringValue(detail?.jibun_address) || address;
  const roadAddress = stringValue(detail?.road_address);
  const title = clean(stringValue(detail?.subject) || item.info?.subject || `매물 ${hidx}`);
  const description =
    stringValue(detail?.description) || stringValue(detail?.pp_details) || "";
  const descBlob = `${title}\n${description}`;
  const textRegister = /전입\s*신고|전입가능|전입 가능/.test(descBlob);
  const realSize =
    numberValue(detail?.real_size) ?? item.info?.real_size ?? 0;
  const suppliedSize =
    numberValue(detail?.supplied_size) ?? item.info?.supplied_size;
  const buildingDate = stringValue(detail?.building_date);
  const buildYearMatch = buildingDate.match(/\d{4}/);
  const buildYear = buildYearMatch ? Number(buildYearMatch[0]) : null;
  const deposit = numberValue(detail?.deposit) ?? item.price?.deposit ?? 0;
  const monthly = numberValue(detail?.monthly_fee) ?? item.price?.monthly_fee ?? 0;
  const maintenance =
    numberValue(detail?.maintenance_cost) ?? item.price?.maintenance_cost ?? 0;
  const lat = Number(stringValue(detail?.latitude) || item.location?.coordinate?.latitude || 0);
  const lon = Number(stringValue(detail?.longitude) || item.location?.coordinate?.longitude || 0);
  const listImages = Object.values(item.images ?? {})
    .flat()
    .map((image) => image.path)
    .filter(Boolean)
    .map((image) => imageToOrigin(image as string));
  const thumbnail = item.info?.thumbnail ? [imageToOrigin(item.info.thumbnail)] : [];
  const images = unique([...detailImages, ...listImages, ...thumbnail]);
  const canRegister = numberValue(detail?.can_register);
  const registerStatus =
    canRegister === 1 ? "확정 가능" : textRegister ? "본문에 가능" : "미표시";

  const excludedReasons: string[] = [];
  if (sido !== "서울특별시") excludedReasons.push("서울 아님");
  if (deposit > 5_000_000) excludedReasons.push("보증금 초과");
  if (monthly > 3_600_000) excludedReasons.push("월세 초과");
  if (realSize < 49.58) excludedReasons.push("전용 15평 미만");
  const contractType = stringValue(detail?.contract_type) || item.type?.contract_type || "";
  if (contractType !== "단기임대" && contractType !== "월세") {
    excludedReasons.push("월세/단기임대 아님");
  }
  if (buildYear !== null && buildYear < 2000) excludedReasons.push("2000년 이전");
  if (detail && !buildingDate) excludedReasons.push("사용승인일 미표시");

  const passStatus =
    !detail ? "상세미확인" : excludedReasons.length ? "탈락" : "조건통과";

  return {
    id: hidx,
    url: `https://www.peterpanz.com/house/${hidx}`,
    title,
    summary: clean(description.slice(0, 450)),
    address,
    jibunAddress,
    roadAddress,
    lat,
    lon,
    buildingType:
      stringValue(detail?.building_type_text) ||
      item.type?.building_type_text ||
      item.type?.building_type ||
      "-",
    roomType: stringValue(detail?.room_type) || item.info?.room_type || "-",
    floor:
      stringValue(detail?.floor_text_detail) ||
      stringValue(detail?.floor_text) ||
      item.floor?.floor_text_detail ||
      item.floor?.floor_text ||
      "-",
    depositManwon: manwon(deposit),
    monthlyManwon: manwon(monthly),
    maintenanceManwon: manwon(maintenance),
    realSize,
    realPyeong: numberValue(detail?.real_size_pyeong) ?? item.info?.real_pyeong ?? pyeong(realSize),
    suppliedSize,
    suppliedPyeong:
      numberValue(detail?.supplied_size_pyeong) ??
      item.info?.supplied_pyeong ??
      pyeong(suppliedSize),
    buildingDate,
    buildYear,
    registerStatus,
    moveText: stringValue(detail?.move_text),
    peterpanCreatedAt: stringValue(detail?.created_at) || item.info?.created_at,
    liveStartDate:
      stringValue(detail?.live_start_date) || item.info?.live_start_date,
    liveEndDate: stringValue(detail?.live_end_date),
    illegalBuilding: numberValue(detail?.illegal_building) ?? null,
    images,
    roadviews: [],
    kakaoRoadviewLink: `https://map.kakao.com/link/roadview/${lat},${lon}`,
    kakaoMapLink: `https://map.kakao.com/link/map/${encodeMapQuery(address)},${lat},${lon}`,
    kakaoSearchLink: `https://map.kakao.com/link/search/${encodeMapQuery(jibunAddress)}`,
    naverMapLink: `https://map.naver.com/p/search/${encodeMapQuery(jibunAddress)}`,
    googleMapLink: `https://www.google.com/maps/search/?api=1&query=${encodeMapQuery(jibunAddress)}`,
    hogangnonoSearchLink: `https://hogangnono.com/search?q=${encodeMapQuery(jibunAddress)}`,
    reviewFinding:
      "공개 HTML 기준 자동 추출 가능한 지번 거주후기는 확인 불가. 카카오맵/호갱노노 검색 링크 제공.",
    passStatus,
    excludedReasons,
    dataDepth: detail ? "상세" : "목록",
    rawSignals: {
      naverVerification: item.attribute?.naverVerification,
      statusCode: item.attribute?.status_code,
      contractType,
      tradeType: item.type?.trade_type,
      buildingCode: item.type?.building_code,
      specialPick: item.info?.special_pick,
      additionalOptions: item.additional_options,
      canRegister,
    },
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
) {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function collectListItems(
  limit: number,
  options: Omit<ListUrlOptions, "pageIndex" | "orderId"> = {},
) {
  const pages = Math.ceil(limit / 100);
  const byId = new Map<number, PeterpanListItem>();
  let totalApiCount = 0;
  let orderId = "";

  for (let page = 1; page <= pages; page += 1) {
    const data = await fetchJson<{
      houses?: Record<string, Record<string, PeterpanListItem[]>>;
      totalCount?: number;
      orderId?: number | string;
    }>(
      buildListUrl({
        pageIndex: page,
        orderId,
        ...options,
      }),
    );

    if (page === 1) {
      totalApiCount = data.totalCount ?? 0;
      orderId = String(data.orderId ?? "");
    }

    for (const item of flattenHouses(data)) {
      if (!byId.has(item.hidx)) byId.set(item.hidx, item);
      if (byId.size >= limit) break;
    }

    if (byId.size >= totalApiCount) break;
  }

  return { totalApiCount, items: [...byId.values()].slice(0, limit) };
}

async function collectLargeAreaItems(limit: number) {
  const byId = new Map<number, PeterpanListItem>();
  let totalApiCount = 0;

  for (const buildingType of COLLECTION_BUILDING_TYPES) {
    for (const contractMode of ["monthly", "short"] as const) {
      const segment = await collectListItems(Math.min(limit, 300), {
        minRealSize: COLLECTION_LARGE_REAL_SIZE,
        maxRealSize: COLLECTION_MAX_REAL_SIZE,
        contractMode,
        maxDeposit: COLLECTION_MAX_DEPOSIT,
        maxMonthly: COLLECTION_MAX_MONTHLY,
        buildingTypes: [buildingType],
      });
      totalApiCount += segment.totalApiCount;
      for (const item of segment.items) {
        if (!byId.has(item.hidx)) byId.set(item.hidx, item);
        if (byId.size >= limit) break;
      }
    }
  }

  return { totalApiCount, items: [...byId.values()].slice(0, limit) };
}

export async function crawlPeterpan(options: { limit?: number; detailLimit?: number } = {}): Promise<CrawlData> {
  const limit = Math.max(100, Math.min(options.limit ?? 240, 800));
  const detailLimit = Math.max(0, Math.min(options.detailLimit ?? 80, limit));
  const byId = new Map<number, PeterpanListItem>();

  const likelyQualified = await collectListItems(300, {
    minRealSize: COLLECTION_MIN_REAL_SIZE,
    maxRealSize: COLLECTION_MAX_REAL_SIZE,
    contractMode: "all",
  });
  const collectionSizePool = await collectListItems(limit, {
    minRealSize: COLLECTION_MIN_REAL_SIZE,
    maxRealSize: COLLECTION_MAX_REAL_SIZE,
    contractMode: "all",
    maxDeposit: COLLECTION_MAX_DEPOSIT,
    maxMonthly: COLLECTION_MAX_MONTHLY,
  });
  const largeAreaPool = await collectLargeAreaItems(limit);
  const broadShortPool = await collectListItems(limit, {
    contractMode: "short",
    maxDeposit: COLLECTION_MAX_DEPOSIT,
    maxMonthly: COLLECTION_MAX_MONTHLY,
  });
  const broadAllPool = await collectListItems(limit, {
    contractMode: "all",
    maxDeposit: COLLECTION_MAX_DEPOSIT,
    maxMonthly: COLLECTION_MAX_MONTHLY,
  });

  const priorityCandidates = likelyQualified.items.filter((item) => {
    const contractType = item.type?.contract_type;
    return (
      (contractType === "단기임대" || contractType === "월세") &&
      (item.info?.real_size ?? 0) >= COLLECTION_MIN_REAL_SIZE &&
      (item.price?.deposit ?? 0) <= DEFAULT_MAX_DEPOSIT &&
      (item.price?.monthly_fee ?? 0) <= DEFAULT_MAX_MONTHLY
    );
  });

  const sliderReachCandidates = [
    ...largeAreaPool.items,
    ...collectionSizePool.items,
    ...broadShortPool.items,
    ...broadAllPool.items,
  ].filter((item) => {
    const contractType = item.type?.contract_type;
    const realPyeong = item.info?.real_pyeong ?? pyeong(item.info?.real_size);
    return (
      item.location?.address?.sido === "서울특별시" &&
      (contractType === "단기임대" || contractType === "월세") &&
      realPyeong >= COLLECTION_MIN_REAL_PYEONG &&
      realPyeong <= COLLECTION_MAX_REAL_PYEONG &&
      (item.price?.deposit ?? 0) <= COLLECTION_MAX_DEPOSIT &&
      (item.price?.monthly_fee ?? 0) <= COLLECTION_MAX_MONTHLY
    );
  });

  const largeAreaCandidates = largeAreaPool.items
    .filter((item) => {
      const contractType = item.type?.contract_type;
      const realPyeong = item.info?.real_pyeong ?? pyeong(item.info?.real_size);
      return (
        item.location?.address?.sido === "서울특별시" &&
        (contractType === "단기임대" || contractType === "월세") &&
        realPyeong >= pyeong(COLLECTION_LARGE_REAL_SIZE) &&
        realPyeong <= COLLECTION_MAX_REAL_PYEONG &&
        (item.price?.deposit ?? 0) <= COLLECTION_MAX_DEPOSIT &&
        (item.price?.monthly_fee ?? 0) <= COLLECTION_MAX_MONTHLY
      );
    })
    .sort((a, b) => {
      const aReal = a.info?.real_pyeong ?? pyeong(a.info?.real_size);
      const bReal = b.info?.real_pyeong ?? pyeong(b.info?.real_size);
      return bReal - aReal;
    });

  for (const item of priorityCandidates) byId.set(item.hidx, item);
  for (const item of largeAreaCandidates) byId.set(item.hidx, item);
  for (const item of sliderReachCandidates) byId.set(item.hidx, item);
  for (const item of likelyQualified.items) byId.set(item.hidx, item);
  for (const item of collectionSizePool.items) {
    if (!byId.has(item.hidx)) byId.set(item.hidx, item);
    if (byId.size >= limit) break;
  }
  for (const item of broadShortPool.items) {
    if (!byId.has(item.hidx)) byId.set(item.hidx, item);
    if (byId.size >= limit) break;
  }
  for (const item of broadAllPool.items) {
    if (!byId.has(item.hidx)) byId.set(item.hidx, item);
    if (byId.size >= limit) break;
  }

  const rawItems = [...byId.values()].slice(0, limit);
  const detailIds = new Set(rawItems.slice(0, detailLimit).map((item) => item.hidx));
  const detailMap = new Map<number, { detail?: Record<string, unknown>; images: string[] }>();

  await mapWithConcurrency(
    rawItems.filter((item) => detailIds.has(item.hidx)),
    8,
    async (item) => {
      try {
        const html = await fetchText(`https://www.peterpanz.com/house/${item.hidx}`);
        detailMap.set(item.hidx, {
          detail: extractDetailJson(html) ?? undefined,
          images: extractImagesFromHtml(html),
        });
      } catch {
        detailMap.set(item.hidx, { images: [] });
      }
    },
  );

  const listings = rawItems.map((item) => {
    const detail = detailMap.get(item.hidx);
    return buildListing(item, detail?.detail, detail?.images ?? []);
  });

  const roadviewTargets = listings
    .filter((item) => item.passStatus === "조건통과" || item.registerStatus !== "미표시")
    .slice(0, 80);

  await mapWithConcurrency(roadviewTargets, 8, async (item) => {
    item.roadviews = await fetchRoadviews(item.lat, item.lon);
  });

  const qualified = listings.filter((item) => item.passStatus === "조건통과");
  const excluded = listings.filter((item) => item.passStatus === "탈락");

  return {
    generatedAt: new Date().toISOString(),
    source:
      "피터팬 공개 목록 API, 전용 15평 이상 우선 풀, 16평 이상 건물유형별 세그먼트 풀, 슬라이더 완화 후보 풀, 일부 매물 상세 HTML, 카카오 로드뷰 공개 노드 API",
    query: {
      location: "서울",
      contract: "단기임대 또는 월세",
      maxDepositManwon: 500,
      maxMonthlyManwon: 360,
      collectionMaxDepositManwon: 1000,
      collectionMaxMonthlyManwon: 500,
      collectionMaxRealPyeong: 40,
      rawCollectLimit: limit,
      detailLimit,
      finalFilter:
        "전용 49.58㎡ 이상, 보증금 500만원 이하, 월세 360만원 이하, 사용승인 2000년 이후, 계약유형 단기임대 또는 월세",
      collectionFilter:
        "전용 15~40평, 보증금 1000만원 이하, 월세 500만원 이하 후보를 함께 수집하고, 16평 이상은 건물유형별/월세·단기임대별로 별도 수집",
      note: "공급면적은 통과 판정에 사용하지 않음",
    },
    totalApiCount: Math.max(
      likelyQualified.totalApiCount,
      collectionSizePool.totalApiCount,
      largeAreaPool.totalApiCount,
      broadShortPool.totalApiCount,
      broadAllPool.totalApiCount,
    ),
    collectedCount: listings.length,
    qualifiedCount: qualified.length,
    excludedCount: excluded.length,
    allListings: listings,
    listings: qualified,
    excluded,
  };
}
