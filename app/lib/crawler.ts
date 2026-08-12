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
  source: "피터팬" | "삼삼엠투";
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

const COLLECTION_REGIONS = [
  {
    name: "서울",
    sido: "서울특별시",
    bounds: {
      minLat: 37.42,
      maxLat: 37.7,
      minLon: 126.76,
      maxLon: 127.18,
    },
    center: { lat: 37.566628, lng: 126.978038 },
  },
  {
    name: "경기도",
    sido: "경기도",
    bounds: {
      minLat: 36.89,
      maxLat: 38.31,
      minLon: 126.37,
      maxLon: 127.85,
    },
    center: { lat: 37.4138, lng: 127.5183 },
  },
  {
    name: "부산",
    sido: "부산광역시",
    bounds: {
      minLat: 35.03,
      maxLat: 35.4,
      minLon: 128.75,
      maxLon: 129.37,
    },
    center: { lat: 35.1796, lng: 129.0756 },
  },
  {
    name: "대구",
    sido: "대구광역시",
    bounds: {
      minLat: 35.75,
      maxLat: 36.03,
      minLon: 128.35,
      maxLon: 128.8,
    },
    center: { lat: 35.8714, lng: 128.6014 },
  },
] as const;
const COLLECTION_SIDOS = new Set(COLLECTION_REGIONS.map((region) => region.sido));
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
const PRIORITY_BUILDING_TYPES = ["오피스텔", "아파트"] as const;
const SAMSAM_SOURCE_ID_OFFSET = 33_000_000;
const SAMSAM_START_DATE = "2026-08-30";
const SAMSAM_END_DATE = "2026-11-22";
const SAMSAM_WEEKS = 12;
const SAMSAM_IMAGE_BASE = "https://dsti6pxai92pb.cloudfront.net/";
const FOCUS_AREAS = [
  {
    name: "부산 센텀역",
    region: COLLECTION_REGIONS[2],
    bounds: {
      minLat: 35.155,
      maxLat: 35.185,
      minLon: 129.105,
      maxLon: 129.15,
    },
    center: { lat: 35.1689, lng: 129.1316 },
  },
  {
    name: "부산 해운대역",
    region: COLLECTION_REGIONS[2],
    bounds: {
      minLat: 35.15,
      maxLat: 35.176,
      minLon: 129.14,
      maxLon: 129.185,
    },
    center: { lat: 35.1631, lng: 129.158 },
  },
] as const;
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

function itemSido(item: PeterpanListItem) {
  return item.location?.address?.sido ?? "";
}

function interleaveBySido(items: PeterpanListItem[]) {
  const groups = new Map<string, PeterpanListItem[]>();
  for (const sido of COLLECTION_REGIONS.map((region) => region.sido)) {
    groups.set(sido, []);
  }
  for (const item of items) {
    const group = groups.get(itemSido(item));
    if (group) group.push(item);
  }

  const result: PeterpanListItem[] = [];
  let moved = true;
  while (moved) {
    moved = false;
    for (const sido of groups.keys()) {
      const item = groups.get(sido)?.shift();
      if (item) {
        result.push(item);
        moved = true;
      }
    }
  }
  return result;
}

function interleaveItemBuckets(buckets: PeterpanListItem[][]) {
  const queues = buckets.map((bucket) => [...bucket]);
  const result: PeterpanListItem[] = [];
  let moved = true;
  while (moved) {
    moved = false;
    for (const queue of queues) {
      const item = queue.shift();
      if (item) {
        result.push(item);
        moved = true;
      }
    }
  }
  return result;
}

function uniqueItems(items: PeterpanListItem[]) {
  const byId = new Map<number, PeterpanListItem>();
  for (const item of items) {
    if (!byId.has(item.hidx)) byId.set(item.hidx, item);
  }
  return [...byId.values()];
}

function splitRegionGrid(
  region: (typeof COLLECTION_REGIONS)[number],
  rows: number,
  columns: number,
) {
  const latStep = (region.bounds.maxLat - region.bounds.minLat) / rows;
  const lonStep = (region.bounds.maxLon - region.bounds.minLon) / columns;
  const areas: Array<{
    name: string;
    region: (typeof COLLECTION_REGIONS)[number];
    bounds: (typeof COLLECTION_REGIONS)[number]["bounds"];
    center: (typeof COLLECTION_REGIONS)[number]["center"];
  }> = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const minLat = region.bounds.minLat + latStep * row;
      const maxLat = row === rows - 1 ? region.bounds.maxLat : minLat + latStep;
      const minLon = region.bounds.minLon + lonStep * column;
      const maxLon = column === columns - 1 ? region.bounds.maxLon : minLon + lonStep;
      areas.push({
        name: `${region.name} ${row + 1}-${column + 1}`,
        region,
        bounds: { minLat, maxLat, minLon, maxLon },
        center: {
          lat: (minLat + maxLat) / 2,
          lng: (minLon + maxLon) / 2,
        },
      });
    }
  }

  return areas;
}

type ListUrlOptions = {
  pageIndex: number;
  orderId?: string;
  region?: (typeof COLLECTION_REGIONS)[number];
  bounds?: (typeof COLLECTION_REGIONS)[number]["bounds"];
  center?: (typeof COLLECTION_REGIONS)[number]["center"];
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
  region = COLLECTION_REGIONS[0],
  bounds = region.bounds,
  center = region.center,
  minRealSize,
  maxRealSize,
  contractMode = "short",
  maxDeposit = DEFAULT_MAX_DEPOSIT,
  maxMonthly = DEFAULT_MAX_MONTHLY,
  buildingTypes = COLLECTION_BUILDING_TYPES,
}: ListUrlOptions) {
  const filterParts = [
    `latitude:${bounds.minLat}~${bounds.maxLat}`,
    `longitude:${bounds.minLon}~${bounds.maxLon}`,
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
    center: JSON.stringify(center),
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

async function fetchSamsamJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Referer: "https://web.33m2.co.kr/en/guest/main",
      "os-type": "WEB",
      "Client-Language": "ko",
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`33m2 fetch failed ${response.status}: ${url}`);
  }
  return response.json() as Promise<T>;
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
  const detailSido = stringValue(detail?.sido);
  const listSido = item.location?.address?.sido || "";
  const shouldUseListAddress =
    Boolean(listSido) && !COLLECTION_SIDOS.has(detailSido);
  const sido = shouldUseListAddress ? listSido : detailSido || listSido;
  const sigungu = shouldUseListAddress
    ? item.location?.address?.sigungu || stringValue(detail?.sigungu)
    : stringValue(detail?.sigungu) || item.location?.address?.sigungu || "";
  const dong = shouldUseListAddress
    ? item.location?.address?.dong || stringValue(detail?.dong)
    : stringValue(detail?.dong) || item.location?.address?.dong || "";
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
  if (!COLLECTION_SIDOS.has(sido)) excludedReasons.push("대상지역 아님");
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
    source: "피터팬",
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

type SamsamRoomListItem = {
  rid: number;
  roomName?: string;
  propertyType?: string;
  addrLot?: string;
  addrStreet?: string;
  state?: string;
  province?: string;
  town?: string;
  lat?: number;
  lng?: number;
  deposit?: number;
  usingFee?: number;
  mgmtFee?: number;
  cleanFee?: number;
  pyeongSize?: number;
  squareMeterSize?: number;
  roomUrl?: string;
  picMain?: string;
  pictures?: string[];
};

type SamsamRoomDetail = SamsamRoomListItem & {
  description?: string;
  additionalDescription?: string;
  usageGuide?: string;
  transportation?: string;
  minimumContractWeeks?: number;
  roomCnt?: number;
  bathroomCnt?: number;
  cookroomCnt?: number;
  sittingroomCnt?: number;
  duplexStructure?: boolean;
  reviewScore?: number;
  reviewList?: Array<{ score?: number; content?: string; createdAt?: string }>;
  longTermDiscounts?: Array<{
    weeks?: number;
    discountRate?: number;
    discountedUsingFee?: number;
  }>;
  includeElectricity?: boolean;
  includeWater?: boolean;
  includeGas?: boolean;
  hostUser?: { nickname?: string };
};

function samsamImageUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SAMSAM_IMAGE_BASE}${path.replace(/^\/+/, "")}`;
}

function samsamPropertyType(value?: string) {
  if (value === "APARTMENT" || value === "아파트") return "아파트";
  if (value === "OFFICETEL" || value === "오피스텔") return "오피스텔";
  return value || "-";
}

function buildSamsamListUrl({
  bounds,
  page,
  size,
}: {
  bounds: (typeof COLLECTION_REGIONS)[number]["bounds"];
  page: number;
  size: number;
}) {
  const params = new URLSearchParams({
    swLat: String(bounds.minLat),
    swLng: String(bounds.minLon),
    neLat: String(bounds.maxLat),
    neLng: String(bounds.maxLon),
    page: String(page),
    size: String(size),
    sortBy: "POPULAR",
    startDate: SAMSAM_START_DATE,
    endDate: SAMSAM_END_DATE,
  });

  for (const propertyType of ["OFFICETEL", "APARTMENT"]) {
    params.append("propertyTypes", propertyType);
  }
  for (const pyeongSize of ["RANGE_TEN", "RANGE_TWENTY", "RANGE_THIRTY", "OVER_FORTY"]) {
    params.append("pyeongSizes", pyeongSize);
  }

  return `https://web.33m2.co.kr/v1/map/rooms?${params.toString()}`;
}

function buildSamsamListing(room: SamsamRoomDetail): Listing {
  const rid = room.rid;
  const propertyType = samsamPropertyType(room.propertyType);
  const state = room.state || "서울특별시";
  const province = room.province || "";
  const town = room.town || "";
  const address = clean([state, province, town].filter(Boolean).join(" "));
  const jibunAddress = clean(room.addrLot || address);
  const roadAddress = clean(room.addrStreet || "");
  const lat = room.lat ?? 0;
  const lon = room.lng ?? 0;
  const depositManwon = manwon(room.deposit);
  const weeklyUsingFeeManwon = manwon(room.usingFee);
  const weeklyMgmtFeeManwon = manwon(room.mgmtFee);
  const cleanFeeManwon = manwon(room.cleanFee);
  const applicableLongTermDiscount = [...(room.longTermDiscounts ?? [])]
    .filter((discount) => (discount.weeks ?? Number.POSITIVE_INFINITY) <= 4)
    .sort((a, b) => (b.weeks ?? 0) - (a.weeks ?? 0))[0];
  const discountedWeeklyUsingFeeManwon =
    applicableLongTermDiscount?.discountedUsingFee !== undefined
      ? manwon(applicableLongTermDiscount.discountedUsingFee)
      : weeklyUsingFeeManwon;
  const monthlyEquivalentManwon = Math.round(weeklyUsingFeeManwon * 4.345);
  const monthlyEquivalentWithMgmtManwon = Math.round(
    (weeklyUsingFeeManwon + weeklyMgmtFeeManwon) * 4.345,
  );
  const totalStayManwon =
    depositManwon +
    (weeklyUsingFeeManwon + weeklyMgmtFeeManwon) * SAMSAM_WEEKS +
    cleanFeeManwon;
  const fourWeekStayManwon =
    depositManwon +
    (discountedWeeklyUsingFeeManwon + weeklyMgmtFeeManwon) * 4 +
    cleanFeeManwon;
  const realPyeong = room.pyeongSize ?? pyeong(room.squareMeterSize);
  const realSize = room.squareMeterSize ?? realPyeong * 3.305785;
  const reviewCount = room.reviewList?.length ?? 0;
  const reviewScore = room.reviewScore ?? room.reviewList?.[0]?.score;
  const reviewFinding = reviewCount
    ? `33m2 후기 ${reviewCount}개, 평균 ${reviewScore ? reviewScore.toFixed(1) : "미표시"}점.`
    : "33m2 공개 상세 기준 등록 후기는 확인되지 않음.";
  const title = clean(room.roomName || `33m2 매물 ${rid}`);
  const summary = clean(
    [
      room.description,
      room.additionalDescription,
      room.usageGuide,
      room.transportation,
    ]
      .filter(Boolean)
      .join(" "),
  ).slice(0, 450);
  const images = unique(
    [room.picMain, ...(room.pictures ?? [])].filter(Boolean).map((image) =>
      samsamImageUrl(String(image)),
    ),
  );
  const excludedReasons: string[] = [];

  if (state !== "서울특별시") excludedReasons.push("33m2 서울 아님");
  if (propertyType !== "오피스텔" && propertyType !== "아파트") {
    excludedReasons.push("33m2 오피스텔/아파트 아님");
  }
  if (realPyeong < COLLECTION_MIN_REAL_PYEONG) {
    excludedReasons.push("전용 15평 미만");
  }
  if ((room.minimumContractWeeks ?? 1) > SAMSAM_WEEKS) {
    excludedReasons.push("12주 계약 불가");
  }

  return {
    id: SAMSAM_SOURCE_ID_OFFSET + rid,
    source: "삼삼엠투",
    url: room.roomUrl || `https://web.33m2.co.kr/guest/room/${rid}`,
    title,
    summary,
    address,
    jibunAddress,
    roadAddress,
    lat,
    lon,
    buildingType: propertyType,
    roomType: `${room.roomCnt ?? "-"}룸`,
    floor: "-",
    depositManwon,
    monthlyManwon: monthlyEquivalentManwon,
    maintenanceManwon: Math.round(weeklyMgmtFeeManwon * 4.345),
    realSize,
    realPyeong,
    suppliedSize: undefined,
    suppliedPyeong: undefined,
    buildingDate: "",
    buildYear: null,
    registerStatus: "미표시",
    moveText: `${SAMSAM_START_DATE}~${SAMSAM_END_DATE} · 12주 기준`,
    peterpanCreatedAt: undefined,
    liveStartDate: SAMSAM_START_DATE,
    liveEndDate: SAMSAM_END_DATE,
    illegalBuilding: null,
    images,
    roadviews: [],
    kakaoRoadviewLink: `https://map.kakao.com/link/roadview/${lat},${lon}`,
    kakaoMapLink: `https://map.kakao.com/link/map/${encodeMapQuery(address)},${lat},${lon}`,
    kakaoSearchLink: `https://map.kakao.com/link/search/${encodeMapQuery(jibunAddress)}`,
    naverMapLink: `https://map.naver.com/p/search/${encodeMapQuery(jibunAddress)}`,
    googleMapLink: `https://www.google.com/maps/search/?api=1&query=${encodeMapQuery(jibunAddress)}`,
    hogangnonoSearchLink: `https://hogangnono.com/search?q=${encodeMapQuery(jibunAddress)}`,
    reviewFinding,
    passStatus: excludedReasons.length ? "탈락" : "조건통과",
    excludedReasons,
    dataDepth: "상세",
    rawSignals: {
      sourceRid: rid,
      contractType: "단기임대",
      propertyType: room.propertyType,
      startDate: SAMSAM_START_DATE,
      endDate: SAMSAM_END_DATE,
      stayWeeks: SAMSAM_WEEKS,
      weeklyUsingFeeManwon,
      weeklyMgmtFeeManwon,
      discountedWeeklyUsingFeeManwon,
      cleanFeeManwon,
      totalStayManwon,
      fourWeekStayManwon,
      appliedLongTermDiscountWeeks: applicableLongTermDiscount?.weeks,
      appliedLongTermDiscountRate: applicableLongTermDiscount?.discountRate,
      monthlyEquivalentManwon,
      monthlyEquivalentWithMgmtManwon,
      longTermDiscounts: room.longTermDiscounts ?? [],
      reviewScore,
      reviewCount,
      minimumContractWeeks: room.minimumContractWeeks,
      includeElectricity: room.includeElectricity,
      includeWater: room.includeWater,
      includeGas: room.includeGas,
      hostNickname: room.hostUser?.nickname,
    },
  };
}

async function crawlSamsamM2(options: { limit?: number; detailLimit?: number } = {}) {
  const limit = Math.max(20, Math.min(options.limit ?? 700, 1500));
  const detailLimit = Math.max(0, Math.min(options.detailLimit ?? limit, limit));
  const areas = splitRegionGrid(COLLECTION_REGIONS[0], 4, 4);
  const byId = new Map<number, SamsamRoomListItem>();
  let totalApiCount = 0;

  for (const area of areas) {
    for (let page = 1; page <= 12; page += 1) {
      try {
        const result = await fetchSamsamJson<{
          data?: {
            content?: SamsamRoomListItem[];
            last?: boolean;
            totalElements?: number;
          };
        }>(buildSamsamListUrl({ bounds: area.bounds, page, size: 100 }));
        const content = result.data?.content ?? [];
        totalApiCount = Math.max(totalApiCount, result.data?.totalElements ?? content.length);
        for (const item of content) {
          if (item.rid && !byId.has(item.rid)) byId.set(item.rid, item);
        }
        if (content.length === 0 || result.data?.last || byId.size >= limit) break;
      } catch {
        break;
      }
    }
    if (byId.size >= limit) break;
  }

  const listItems = [...byId.values()]
    .filter((item) => (item.state || "서울특별시") === "서울특별시")
    .filter((item) => {
      const propertyType = samsamPropertyType(item.propertyType);
      return propertyType === "오피스텔" || propertyType === "아파트";
    })
    .filter((item) => (item.pyeongSize ?? pyeong(item.squareMeterSize)) >= COLLECTION_MIN_REAL_PYEONG)
    .slice(0, limit);
  const detailItems = await mapWithConcurrency(
    listItems.slice(0, detailLimit),
    8,
    async (item) => {
      try {
        const result = await fetchSamsamJson<{ data?: SamsamRoomDetail }>(
          `https://web.33m2.co.kr/v1/rooms/${item.rid}?uuid=move2026`,
        );
        return result.data ? { ...item, ...result.data } : item;
      } catch {
        return item;
      }
    },
  );
  const listings = detailItems.map(buildSamsamListing);
  const roadviewTargets = listings.filter((item) => item.passStatus === "조건통과").slice(0, 40);

  await mapWithConcurrency(roadviewTargets, 8, async (item) => {
    item.roadviews = await fetchRoadviews(item.lat, item.lon);
  });

  const qualified = listings.filter((item) => item.passStatus === "조건통과");
  const excluded = listings.filter((item) => item.passStatus === "탈락");

  return {
    generatedAt: new Date().toISOString(),
    source: "33m2 공개 지도/상세 API",
    query: {
      source: "33m2",
      location: "서울특별시",
      propertyTypes: ["OFFICETEL", "APARTMENT"],
      minRealPyeong: 15,
      startDate: SAMSAM_START_DATE,
      endDate: SAMSAM_END_DATE,
      stayWeeks: SAMSAM_WEEKS,
      rawCollectLimit: limit,
      detailLimit,
      note: "33m2 사용승인일은 공개 API에서 확인되지 않아 플랫폼 전용 조건통과 판정에서는 제외",
    },
    totalApiCount,
    collectedCount: listings.length,
    qualifiedCount: qualified.length,
    excludedCount: excluded.length,
    allListings: listings,
    listings: qualified,
    excluded,
  } satisfies CrawlData;
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

  for (const region of COLLECTION_REGIONS) {
    for (const buildingType of COLLECTION_BUILDING_TYPES) {
      for (const contractMode of ["monthly", "short"] as const) {
        const segment = await collectListItems(Math.min(limit, 300), {
          region,
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
  }

  return { totalApiCount, items: [...byId.values()].slice(0, limit) };
}

async function collectPriorityBuildingItems(limit: number) {
  const byId = new Map<number, PeterpanListItem>();
  let totalApiCount = 0;

  for (const region of COLLECTION_REGIONS) {
    for (const contractMode of ["monthly", "short"] as const) {
      const segment = await collectListItems(Math.min(limit, 300), {
        region,
        minRealSize: COLLECTION_MIN_REAL_SIZE,
        maxRealSize: COLLECTION_MAX_REAL_SIZE,
        contractMode,
        maxDeposit: COLLECTION_MAX_DEPOSIT,
        maxMonthly: COLLECTION_MAX_MONTHLY,
        buildingTypes: PRIORITY_BUILDING_TYPES,
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

async function collectCriticalBuildingItems(limit: number) {
  const segmentBuckets: PeterpanListItem[][] = [];
  let totalApiCount = 0;
  const criticalAreas = [
    {
      name: COLLECTION_REGIONS[0].name,
      region: COLLECTION_REGIONS[0],
      bounds: COLLECTION_REGIONS[0].bounds,
      center: COLLECTION_REGIONS[0].center,
    },
    ...splitRegionGrid(COLLECTION_REGIONS[1], 4, 4),
  ];

  for (const area of criticalAreas) {
    const regionSegmentLimit = area.region.sido === "경기도" ? 250 : 600;
    for (const buildingType of PRIORITY_BUILDING_TYPES) {
      for (const contractMode of ["monthly", "short"] as const) {
        const segment = await collectListItems(Math.min(limit, regionSegmentLimit), {
          region: area.region,
          bounds: area.bounds,
          center: area.center,
          contractMode,
          maxDeposit: COLLECTION_MAX_DEPOSIT,
          maxMonthly: COLLECTION_MAX_MONTHLY,
          buildingTypes: [buildingType],
        });
        totalApiCount += segment.totalApiCount;
        segmentBuckets.push(segment.items);
      }
    }
  }

  return {
    totalApiCount,
    items: uniqueItems(interleaveItemBuckets(segmentBuckets)).slice(0, limit),
  };
}

async function collectFocusAreaItems(limit: number) {
  const byId = new Map<number, PeterpanListItem>();
  let totalApiCount = 0;

  for (const area of FOCUS_AREAS) {
    for (const contractMode of ["monthly", "short", "all"] as const) {
      const segment = await collectListItems(Math.min(limit, 200), {
        region: area.region,
        bounds: area.bounds,
        center: area.center,
        contractMode,
        maxDeposit: COLLECTION_MAX_DEPOSIT,
        maxMonthly: COLLECTION_MAX_MONTHLY,
        buildingTypes: PRIORITY_BUILDING_TYPES,
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
  const limit = Math.max(100, Math.min(options.limit ?? 240, 5000));
  const detailLimit = Math.max(0, Math.min(options.detailLimit ?? 80, limit));
  const byId = new Map<number, PeterpanListItem>();

  const likelyQualifiedPools = await Promise.all(
    COLLECTION_REGIONS.map((region) =>
      collectListItems(300, {
        region,
        minRealSize: COLLECTION_MIN_REAL_SIZE,
        maxRealSize: COLLECTION_MAX_REAL_SIZE,
        contractMode: "all",
      }),
    ),
  );
  const likelyQualified = {
    totalApiCount: Math.max(...likelyQualifiedPools.map((pool) => pool.totalApiCount)),
    items: likelyQualifiedPools.flatMap((pool) => pool.items),
  };
  const collectionSizePools = await Promise.all(
    COLLECTION_REGIONS.map((region) =>
      collectListItems(limit, {
        region,
        minRealSize: COLLECTION_MIN_REAL_SIZE,
        maxRealSize: COLLECTION_MAX_REAL_SIZE,
        contractMode: "all",
        maxDeposit: COLLECTION_MAX_DEPOSIT,
        maxMonthly: COLLECTION_MAX_MONTHLY,
      }),
    ),
  );
  const collectionSizePool = {
    totalApiCount: Math.max(...collectionSizePools.map((pool) => pool.totalApiCount)),
    items: collectionSizePools.flatMap((pool) => pool.items),
  };
  const largeAreaPool = await collectLargeAreaItems(limit);
  const criticalBuildingPool = await collectCriticalBuildingItems(limit);
  const priorityBuildingPool = await collectPriorityBuildingItems(limit);
  const focusAreaPool = await collectFocusAreaItems(limit);
  const broadShortPools = await Promise.all(
    COLLECTION_REGIONS.map((region) =>
      collectListItems(limit, {
        region,
        contractMode: "short",
        maxDeposit: COLLECTION_MAX_DEPOSIT,
        maxMonthly: COLLECTION_MAX_MONTHLY,
      }),
    ),
  );
  const broadShortPool = {
    totalApiCount: Math.max(...broadShortPools.map((pool) => pool.totalApiCount)),
    items: broadShortPools.flatMap((pool) => pool.items),
  };
  const broadAllPools = await Promise.all(
    COLLECTION_REGIONS.map((region) =>
      collectListItems(limit, {
        region,
        contractMode: "all",
        maxDeposit: COLLECTION_MAX_DEPOSIT,
        maxMonthly: COLLECTION_MAX_MONTHLY,
      }),
    ),
  );
  const broadAllPool = {
    totalApiCount: Math.max(...broadAllPools.map((pool) => pool.totalApiCount)),
    items: broadAllPools.flatMap((pool) => pool.items),
  };

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
    ...criticalBuildingPool.items,
    ...focusAreaPool.items,
    ...priorityBuildingPool.items,
    ...largeAreaPool.items,
    ...collectionSizePool.items,
    ...broadShortPool.items,
    ...broadAllPool.items,
  ].filter((item) => {
    const contractType = item.type?.contract_type;
    const realPyeong = item.info?.real_pyeong ?? pyeong(item.info?.real_size);
    return (
      COLLECTION_SIDOS.has(item.location?.address?.sido ?? "") &&
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
        COLLECTION_SIDOS.has(item.location?.address?.sido ?? "") &&
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

  const focusCandidates = focusAreaPool.items.filter((item) => {
    const contractType = item.type?.contract_type;
    return (
      COLLECTION_SIDOS.has(item.location?.address?.sido ?? "") &&
      (contractType === "단기임대" || contractType === "월세") &&
      (item.price?.deposit ?? 0) <= COLLECTION_MAX_DEPOSIT &&
      (item.price?.monthly_fee ?? 0) <= COLLECTION_MAX_MONTHLY
    );
  });

  const criticalBuildingCandidates = criticalBuildingPool.items.filter((item) => {
    const contractType = item.type?.contract_type;
    return (
      COLLECTION_SIDOS.has(item.location?.address?.sido ?? "") &&
      (contractType === "단기임대" || contractType === "월세") &&
      (item.price?.deposit ?? 0) <= COLLECTION_MAX_DEPOSIT &&
      (item.price?.monthly_fee ?? 0) <= COLLECTION_MAX_MONTHLY
    );
  });

  const priorityBuildingCandidates = priorityBuildingPool.items.filter((item) => {
    const contractType = item.type?.contract_type;
    const realPyeong = item.info?.real_pyeong ?? pyeong(item.info?.real_size);
    return (
      COLLECTION_SIDOS.has(item.location?.address?.sido ?? "") &&
      (contractType === "단기임대" || contractType === "월세") &&
      realPyeong >= COLLECTION_MIN_REAL_PYEONG &&
      realPyeong <= COLLECTION_MAX_REAL_PYEONG &&
      (item.price?.deposit ?? 0) <= COLLECTION_MAX_DEPOSIT &&
      (item.price?.monthly_fee ?? 0) <= COLLECTION_MAX_MONTHLY
    );
  });

  const balancedCriticalBuildingCandidates = interleaveBySido(
    criticalBuildingCandidates,
  );

  for (const item of priorityCandidates) byId.set(item.hidx, item);
  for (const item of balancedCriticalBuildingCandidates) byId.set(item.hidx, item);
  for (const item of focusCandidates) byId.set(item.hidx, item);
  for (const item of priorityBuildingCandidates) byId.set(item.hidx, item);
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

  const rawItems = [...byId.values()]
    .filter((item) => COLLECTION_SIDOS.has(item.location?.address?.sido ?? ""))
    .slice(0, limit);
  const rawIds = new Set(rawItems.map((item) => item.hidx));
  const detailPriorityItems = uniqueItems([
    ...balancedCriticalBuildingCandidates,
    ...focusCandidates,
    ...interleaveBySido(priorityBuildingCandidates),
    ...priorityCandidates,
    ...largeAreaCandidates,
    ...sliderReachCandidates,
    ...rawItems,
  ]).filter((item) => rawIds.has(item.hidx));
  const detailIds = new Set(
    detailPriorityItems.slice(0, detailLimit).map((item) => item.hidx),
  );
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
      location: "서울·경기·부산·대구",
      contract: "단기임대 또는 월세",
      maxDepositManwon: 500,
      maxMonthlyManwon: 360,
      collectionMaxDepositManwon: 1000,
      collectionMaxMonthlyManwon: 500,
      collectionMaxRealPyeong: 40,
      rawCollectLimit: limit,
      detailLimit,
      finalFilter:
        "서울·경기·부산·대구, 전용 49.58㎡ 이상, 보증금 500만원 이하, 월세 360만원 이하, 사용승인 2000년 이후, 계약유형 단기임대 또는 월세",
      collectionFilter:
        "서울·경기·부산·대구 전용 15~40평, 보증금 1000만원 이하, 월세 500만원 이하 후보를 함께 수집하고, 서울·경기 아파트/오피스텔은 전용면적 제한 없이 최우선 수집하며, 16평 이상은 지역별/건물유형별/월세·단기임대별로 별도 수집하고 부산 센텀역·해운대역 주변 오피스텔/아파트를 우선 수집",
      note: "공급면적은 통과 판정에 사용하지 않음",
    },
    totalApiCount: Math.max(
      likelyQualified.totalApiCount,
      collectionSizePool.totalApiCount,
      largeAreaPool.totalApiCount,
      criticalBuildingPool.totalApiCount,
      priorityBuildingPool.totalApiCount,
      focusAreaPool.totalApiCount,
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

export async function crawlMoveListings(
  options: {
    limit?: number;
    detailLimit?: number;
    samsamLimit?: number;
    samsamDetailLimit?: number;
  } = {},
): Promise<CrawlData> {
  const [peterpan, samsam] = await Promise.all([
    crawlPeterpan({ limit: options.limit, detailLimit: options.detailLimit }),
    crawlSamsamM2({
      limit: options.samsamLimit ?? 700,
      detailLimit: options.samsamDetailLimit ?? options.samsamLimit ?? 700,
    }),
  ]);
  const allListings = [...peterpan.allListings, ...samsam.allListings];
  const qualified = allListings.filter((item) => item.passStatus === "조건통과");
  const excluded = allListings.filter((item) => item.passStatus === "탈락");

  return {
    generatedAt: new Date().toISOString(),
    source: `${peterpan.source}; ${samsam.source}`,
    query: {
      ...peterpan.query,
      additionalSources: {
        samsamM2: samsam.query,
      },
    },
    totalApiCount: peterpan.totalApiCount + samsam.totalApiCount,
    collectedCount: allListings.length,
    qualifiedCount: qualified.length,
    excludedCount: excluded.length,
    allListings,
    listings: qualified,
    excluded,
  };
}
