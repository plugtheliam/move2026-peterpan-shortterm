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

function buildListUrl(pageIndex: number, orderId?: string, includeSizeFilter = false) {
  const filterParts = [
    `latitude:${SEOUL_BOUNDS.minLat}~${SEOUL_BOUNDS.maxLat}`,
    `longitude:${SEOUL_BOUNDS.minLon}~${SEOUL_BOUNDS.maxLon}`,
    'buildingType;["빌라/주택","오피스텔","아파트","원/투룸"]',
    'contractType;["단기임대"]',
    "checkDeposit:0~5000000",
    "checkMonth:0~3600000",
  ];

  if (includeSizeFilter) filterParts.push("checkRealSize:49.58~999");

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

async function collectListItems(limit: number, includeSizeFilter: boolean) {
  const pages = Math.ceil(limit / 100);
  const byId = new Map<number, PeterpanListItem>();
  let totalApiCount = 0;
  let orderId = "";

  for (let page = 1; page <= pages; page += 1) {
    const data = await fetchJson<{
      houses?: Record<string, Record<string, PeterpanListItem[]>>;
      totalCount?: number;
      orderId?: number | string;
    }>(buildListUrl(page, orderId, includeSizeFilter));

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

export async function crawlPeterpan(options: { limit?: number; detailLimit?: number } = {}): Promise<CrawlData> {
  const limit = Math.max(100, Math.min(options.limit ?? 240, 500));
  const detailLimit = Math.max(0, Math.min(options.detailLimit ?? 80, limit));
  const byId = new Map<number, PeterpanListItem>();

  const likelyQualified = await collectListItems(100, true);
  const broadPool = await collectListItems(limit, false);

  for (const item of likelyQualified.items) byId.set(item.hidx, item);
  for (const item of broadPool.items) {
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
      "피터팬 공개 목록 API, 일부 매물 상세 HTML, 카카오 로드뷰 공개 노드 API",
    query: {
      location: "서울",
      contract: "단기임대",
      maxDepositManwon: 500,
      maxMonthlyManwon: 360,
      rawCollectLimit: limit,
      detailLimit,
      finalFilter: "전용 49.58㎡ 이상, 사용승인 2000년 이후",
    },
    totalApiCount: broadPool.totalApiCount,
    collectedCount: listings.length,
    qualifiedCount: qualified.length,
    excludedCount: excluded.length,
    allListings: listings,
    listings: qualified,
    excluded,
  };
}
