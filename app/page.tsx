"use client";

import { useEffect, useMemo, useState } from "react";
import type { CrawlData, Listing } from "./lib/crawler";
import subwayStations from "./data/korea-subway-stations.json";

const registerOrder = ["전체", "확정 가능", "본문에 가능", "미표시"] as const;
const passOrder = ["조건통과", "상세미확인", "탈락"] as const;
const reviewOrder = ["숨김 제외", "찜", "숨김", "전체"] as const;
const sourceOrder = ["전체", "피터팬", "삼삼엠투"] as const;
const regionOrder = ["서울특별시", "경기도", "부산광역시", "대구광역시"] as const;
const regionLabels: Record<(typeof regionOrder)[number], string> = {
  서울특별시: "서울",
  경기도: "경기",
  부산광역시: "부산",
  대구광역시: "대구",
};
const buildingOrder = [
  "전체",
  "아파트·오피스텔",
  "오피스텔",
  "아파트",
  "빌라/주택",
  "원/투룸",
] as const;
const LOCAL_KEY = "move2026-peterpan-shortterm-recrawl-v17";
const LEGACY_LOCAL_KEYS = [
  "move2026-peterpan-shortterm-recrawl-v16",
  "move2026-peterpan-shortterm-recrawl-v15",
  "move2026-peterpan-shortterm-recrawl-v14",
  "move2026-peterpan-shortterm-recrawl-v13",
  "move2026-peterpan-shortterm-recrawl-v12",
  "move2026-peterpan-shortterm-recrawl-v11",
  "move2026-peterpan-shortterm-recrawl-v10",
  "move2026-peterpan-shortterm-recrawl-v9",
  "move2026-peterpan-shortterm-recrawl-v8",
  "move2026-peterpan-shortterm-recrawl-v7",
  "move2026-peterpan-shortterm-recrawl-v6",
  "move2026-peterpan-shortterm-recrawl-v5",
];
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const DEFAULT_CRITERIA = {
  minRealPyeong: 15,
  maxDepositManwon: 500,
  maxMonthlyManwon: 360,
};
const RELAXED_CRITERIA = {
  minRealPyeong: 16,
  maxDepositManwon: 1000,
  maxMonthlyManwon: 500,
};
const COLLECTION_MAX_REAL_PYEONG = 40;
const COLLECTION_LIMIT = 5000;
const DETAIL_LIMIT = 2800;
const SAMSAM_LIMIT = 700;
const SAMSAM_DETAIL_LIMIT = 700;

type ListingAction = {
  favorite: boolean;
  hidden: boolean;
  updatedAt: string;
};

type ListingActions = Record<string, ListingAction>;
type RatingItem = {
  label: string;
  score: number;
  detail: string;
};
type ListingRating = {
  overall: number;
  upfrontManwon: number;
  nearestStation: {
    name: string;
    distanceMeters: number;
  } | null;
  items: RatingItem[];
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return value.replaceAll("-", ".").slice(0, 10);
}

function registerClass(status: Listing["registerStatus"]) {
  if (status === "확정 가능") return "good";
  if (status === "본문에 가능") return "hint";
  return "plain";
}

function passClass(status: Listing["passStatus"]) {
  if (status === "조건통과") return "good";
  if (status === "상세미확인") return "hint";
  return "plain";
}

function visibleDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreLabel(score: number) {
  if (score >= 4.5) return "excellent";
  if (score >= 3.5) return "good";
  if (score >= 2.5) return "ok";
  return "weak";
}

function pyeongScore(value: number) {
  if (value >= 20) return 5;
  if (value >= 17) return 4;
  if (value >= 15) return 3;
  if (value > 0) return 2;
  return 1;
}

function monthlyPriceScore(value: number) {
  if (value <= 150) return 5;
  if (value <= 250) return 4;
  if (value <= 360) return 3;
  if (value <= 450) return 2;
  return 1;
}

function upfrontManwon(listing: Listing) {
  const samsamTotal = Number(listing.rawSignals?.totalStayManwon ?? 0);
  if (listing.source === "삼삼엠투" && samsamTotal > 0) return samsamTotal;
  const contractType = String(listing.rawSignals?.contractType ?? "");
  const monthCount = contractType === "단기임대" ? 3 : 1;
  return listing.depositManwon + listing.monthlyManwon * monthCount;
}

function upfrontScore(value: number) {
  if (value <= 700) return 5;
  if (value <= 1000) return 4;
  if (value <= 1500) return 3;
  if (value <= 2200) return 2;
  return 1;
}

function distanceMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  const earthRadius = 6371000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function nearestStation(listing: Listing) {
  if (!listing.lat || !listing.lon) return null;
  let nearest: { name: string; distanceMeters: number } | null = null;
  for (const station of subwayStations) {
    const distance = distanceMeters(listing, station);
    if (!nearest || distance < nearest.distanceMeters) {
      nearest = { name: station.name, distanceMeters: Math.round(distance) };
    }
  }
  return nearest;
}

function stationScore(distance: number | null) {
  if (distance === null) return 3;
  if (distance <= 350) return 5;
  if (distance <= 650) return 4;
  if (distance <= 900) return 3;
  if (distance <= 1200) return 2;
  return 1;
}

function registerScore(status: Listing["registerStatus"]) {
  return status === "미표시" ? 3 : 5;
}

function buildingYearScore(buildYear: number | null) {
  if (!buildYear) return 2;
  const age = Math.max(0, new Date().getFullYear() - buildYear);
  if (age < 5) return 5;
  if (age < 10) return 4;
  if (age < 15) return 3;
  if (age < 20) return 2;
  if (age < 25) return 1;
  return 0;
}

function buildingTypeScore(value: string) {
  if (value.includes("아파트")) return 5;
  if (value.includes("오피스텔")) return 4;
  if (value.includes("빌라") || value.includes("주택")) return 3;
  return 2;
}

function rateListing(listing: Listing): ListingRating {
  const station = nearestStation(listing);
  const upfront = upfrontManwon(listing);
  const items: RatingItem[] = [
    {
      label: "평수",
      score: pyeongScore(listing.realPyeong),
      detail: `전용 ${listing.realPyeong ? listing.realPyeong.toFixed(2) : "-"}평`,
    },
    {
      label: "가격",
      score: monthlyPriceScore(listing.monthlyManwon),
      detail: `월세 ${listing.monthlyManwon}만원`,
    },
    {
      label: "초기 필요금",
      score: upfrontScore(upfront),
      detail: `${upfront.toLocaleString("ko-KR")}만원`,
    },
    {
      label: "전철역",
      score: stationScore(station?.distanceMeters ?? null),
      detail: station
        ? `${station.name}역 약 ${station.distanceMeters.toLocaleString("ko-KR")}m`
        : "좌표 없음",
    },
    {
      label: "전입",
      score: registerScore(listing.registerStatus),
      detail: listing.registerStatus,
    },
    {
      label: "승인연도",
      score: buildingYearScore(listing.buildYear),
      detail: listing.buildYear ? `${listing.buildYear}년` : "미표시",
    },
    {
      label: "건물형태",
      score: buildingTypeScore(listing.buildingType),
      detail: listing.buildingType,
    },
  ];
  const overall =
    Math.round(
      (items.reduce((sum, item) => sum + item.score, 0) / items.length) * 10,
    ) / 10;
  return { overall, upfrontManwon: upfront, nearestStation: station, items };
}

function dynamicReasons(listing: Listing, criteria: typeof DEFAULT_CRITERIA) {
  const reasons: string[] = [];
  const contractType = String(listing.rawSignals?.contractType ?? "");
  const isSamsam = listing.source === "삼삼엠투";

  if (
    listing.address &&
    !listing.address.startsWith("서울특별시") &&
    !listing.address.startsWith("경기도") &&
    !listing.address.startsWith("부산광역시") &&
    !listing.address.startsWith("대구광역시")
  ) {
    reasons.push("대상지역 아님");
  }
  if (contractType !== "단기임대" && contractType !== "월세") {
    reasons.push("월세/단기임대 아님");
  }
  if ((listing.realPyeong ?? 0) < criteria.minRealPyeong) {
    reasons.push(`전용 ${criteria.minRealPyeong.toFixed(1)}평 미만`);
  }
  if (listing.depositManwon > criteria.maxDepositManwon) {
    reasons.push("보증금 초과");
  }
  if (listing.monthlyManwon > criteria.maxMonthlyManwon) {
    reasons.push("월세 초과");
  }
  if (listing.buildYear !== null && listing.buildYear < 2000) {
    reasons.push("2000년 이전");
  }
  if (!isSamsam && listing.dataDepth === "상세" && !listing.buildingDate) {
    reasons.push("사용승인일 미표시");
  }

  return reasons;
}

function dynamicPassStatus(
  listing: Listing,
  criteria: typeof DEFAULT_CRITERIA,
): Listing["passStatus"] {
  if (listing.dataDepth !== "상세") return "상세미확인";
  return dynamicReasons(listing, criteria).length ? "탈락" : "조건통과";
}

function getSourceListings(data: CrawlData | null) {
  return data?.allListings ?? data?.listings ?? [];
}

function defaultPassCount(data: CrawlData | null) {
  return getSourceListings(data).filter(
    (item) => dynamicPassStatus(item, DEFAULT_CRITERIA) === "조건통과",
  ).length;
}

function detailedCount(data: CrawlData | null) {
  return getSourceListings(data).filter((item) => item.dataDepth === "상세")
    .length;
}

function isUsableCrawlData(data: CrawlData | null) {
  return getSourceListings(data).length > 0 && defaultPassCount(data) > 0;
}

async function fetchDefaultData() {
  const response = await fetch(`${BASE_PATH}/data/listings.json`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("기본 데이터 요청 실패");
  return response.json() as Promise<CrawlData>;
}

async function fetchListingActions() {
  const response = await fetch(`${BASE_PATH}/api/listing-actions`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("검토 상태 요청 실패");
  const data = (await response.json()) as { actions?: ListingActions };
  return data.actions ?? {};
}

export default function Home() {
  const [data, setData] = useState<CrawlData | null>(null);
  const [selectedRegister, setSelectedRegister] =
    useState<(typeof registerOrder)[number]>("전체");
  const [selectedPass, setSelectedPass] =
    useState<"전체" | (typeof passOrder)[number]>("조건통과");
  const [selectedReview, setSelectedReview] =
    useState<(typeof reviewOrder)[number]>("숨김 제외");
  const [selectedSource, setSelectedSource] =
    useState<(typeof sourceOrder)[number]>("전체");
  const [sortMode, setSortMode] = useState("newest");
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([
    ...regionOrder,
  ]);
  const [selectedBuilding, setSelectedBuilding] =
    useState<(typeof buildingOrder)[number]>("전체");
  const [keyword, setKeyword] = useState("");
  const [listingActions, setListingActions] = useState<ListingActions>({});
  const [activeImage, setActiveImage] = useState<Record<number, number>>({});
  const [isRecrawling, setIsRecrawling] = useState(false);
  const [recrawlMessage, setRecrawlMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    for (const key of LEGACY_LOCAL_KEYS) {
      window.localStorage.removeItem(key);
    }

    let cancelled = false;

    async function loadData() {
      const applyDefaultData = async (message?: string) => {
        const [nextData, nextActions] = await Promise.all([
          fetchDefaultData(),
          fetchListingActions().catch(() => ({})),
        ]);
        if (cancelled) return;
        setData(nextData);
        setListingActions(nextActions);
        setLoadError("");
        if (message) setRecrawlMessage(message);
      };

      try {
        const stored = window.localStorage.getItem(LOCAL_KEY);
        if (stored) {
          try {
            const savedData = JSON.parse(stored) as CrawlData;
            if (isUsableCrawlData(savedData)) {
              setData(savedData);
              setLoadError("");
              return;
            }
            window.localStorage.removeItem(LOCAL_KEY);
            await applyDefaultData(
              "저장된 재수집 결과가 기본 조건 후보를 만들지 못해 기본 데이터로 복구했습니다.",
            );
            return;
          } catch {
            window.localStorage.removeItem(LOCAL_KEY);
          }
        }

        await applyDefaultData();
      } catch {
        if (!cancelled) {
          setLoadError("매물 자료를 불러오지 못했습니다. 새로고침해 주세요.");
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const sourceListings = useMemo(() => getSourceListings(data), [data]);
  const regionListings = useMemo(() => {
    const selected = new Set(selectedRegions);
    return sourceListings.filter((item) => {
      const sido = item.address.split(" ")[0];
      const sourceMatch =
        selectedSource === "전체" || (item.source ?? "피터팬") === selectedSource;
      return selected.has(sido) && sourceMatch;
    });
  }, [sourceListings, selectedRegions, selectedSource]);

  const listings = useMemo(() => {
    const filtered = regionListings.filter((item) => {
      const action = listingActions[String(item.id)];
      const keywordText = keyword.trim().toLowerCase();
      const searchText = [
        item.address,
        item.jibunAddress,
        item.roadAddress,
        item.title,
        item.summary,
        item.buildingType,
        item.roomType,
        item.source,
      ]
        .join(" ")
        .toLowerCase();
      const keywordMatch = !keywordText || searchText.includes(keywordText);
      const buildingMatch =
        selectedBuilding === "전체" ||
        (selectedBuilding === "아파트·오피스텔" &&
          /오피스텔|아파트/.test(item.buildingType)) ||
        (selectedBuilding === "빌라/주택" &&
          /빌라|주택|다가구|단독|연립|상가주택/.test(item.buildingType)) ||
        (selectedBuilding === "원/투룸" &&
          /원룸|투룸|원\/투룸/.test(`${item.buildingType} ${item.roomType}`)) ||
        item.buildingType.includes(selectedBuilding);
      const reviewMatch =
        selectedReview === "전체" ||
        (selectedReview === "숨김 제외" && !action?.hidden) ||
        (selectedReview === "찜" && action?.favorite && !action?.hidden) ||
        (selectedReview === "숨김" && action?.hidden);
      const registerMatch =
        selectedRegister === "전체" || item.registerStatus === selectedRegister;
      const passStatus = dynamicPassStatus(item, criteria);
      const passMatch = selectedPass === "전체" || passStatus === selectedPass;
      return keywordMatch && buildingMatch && reviewMatch && registerMatch && passMatch;
    });

    return [...filtered].sort((a, b) => {
      const aAction = listingActions[String(a.id)];
      const bAction = listingActions[String(b.id)];
      const actionPriority =
        Number(Boolean(bAction?.favorite)) - Number(Boolean(aAction?.favorite));
      if (actionPriority) return actionPriority;
      if (sortMode === "newest") return (b.buildYear ?? 0) - (a.buildYear ?? 0);
      if (sortMode === "size") return b.realSize - a.realSize;
      if (sortMode === "rent") return a.monthlyManwon - b.monthlyManwon;
      if (sortMode === "rating") {
        return rateListing(b).overall - rateListing(a).overall;
      }
      if (sortMode === "detail") {
        return Number(b.dataDepth === "상세") - Number(a.dataDepth === "상세");
      }
      const aPass = dynamicPassStatus(a, criteria);
      const bPass = dynamicPassStatus(b, criteria);
      return (
        Number(bPass === "조건통과") - Number(aPass === "조건통과") ||
        Number(b.registerStatus === "확정 가능") -
          Number(a.registerStatus === "확정 가능") ||
        Number(b.registerStatus === "본문에 가능") -
          Number(a.registerStatus === "본문에 가능") ||
        b.realSize - a.realSize
      );
    });
  }, [
    regionListings,
    selectedRegister,
    selectedPass,
    selectedReview,
    selectedBuilding,
    sortMode,
    criteria,
    listingActions,
    keyword,
  ]);

  const stats = useMemo(() => {
    const items = regionListings;
    const confirmed = items.filter(
      (item) => item.registerStatus === "확정 가능",
    ).length;
    const textOnly = items.filter(
      (item) => item.registerStatus === "본문에 가능",
    ).length;
    const qualified = items.filter(
      (item) => dynamicPassStatus(item, criteria) === "조건통과",
    ).length;
    const detail = items.filter((item) => item.dataDepth === "상세").length;
    const imageCount = items.reduce(
      (sum, item) => sum + (item.images?.length ?? 0),
      0,
    );
    const roadviewCount = items.reduce(
      (sum, item) => sum + (item.roadviews?.length ?? 0),
      0,
    );
    const favoriteCount = items.filter(
      (item) => listingActions[String(item.id)]?.favorite,
    ).length;
    const hiddenCount = items.filter(
      (item) => listingActions[String(item.id)]?.hidden,
    ).length;

    return {
      confirmed,
      textOnly,
      qualified,
      detail,
      imageCount,
      roadviewCount,
      favoriteCount,
      hiddenCount,
    };
  }, [regionListings, criteria, listingActions]);

  const sliderSummary = useMemo(() => {
    const detailed = regionListings.filter((item) => item.dataDepth === "상세");
    const dynamicExcluded = detailed.length - stats.qualified;
    const realValues = detailed
      .map((item) => item.realPyeong)
      .filter((value) => Number.isFinite(value) && value > 0);
    const minReal = realValues.length ? Math.min(...realValues) : null;
    const maxReal = realValues.length ? Math.max(...realValues) : null;
    return {
      detailed: detailed.length,
      dynamicExcluded,
      minReal,
      maxReal,
    };
  }, [regionListings, stats.qualified]);
  const hasAreaDataAboveObservedMax =
    sliderSummary.maxReal !== null &&
    criteria.minRealPyeong > sliderSummary.maxReal;

  function showRelaxedResults() {
    setSelectedSource("전체");
    setSelectedRegions([...regionOrder]);
    setSelectedBuilding("전체");
    setKeyword("");
    setCriteria(RELAXED_CRITERIA);
    setSelectedPass("조건통과");
    setSelectedRegister("전체");
    setSelectedReview("숨김 제외");
  }

  function showDefaultResults() {
    setSelectedSource("전체");
    setSelectedRegions([...regionOrder]);
    setSelectedBuilding("전체");
    setKeyword("");
    setCriteria(DEFAULT_CRITERIA);
    setSelectedPass("조건통과");
    setSelectedRegister("전체");
    setSelectedReview("숨김 제외");
  }

  function showFavoriteResults() {
    setSelectedReview("찜");
    setSelectedPass("전체");
    setSelectedRegister("전체");
    setSortMode("rating");
  }

  function showHaeundaeResults() {
    setSelectedSource("피터팬");
    setSelectedRegions(["부산광역시"]);
    setSelectedBuilding("오피스텔");
    setKeyword("해운대");
    setSelectedPass("전체");
    setSelectedRegister("전체");
    setSelectedReview("숨김 제외");
    setSortMode("rating");
  }

  function showCentumResults() {
    setSelectedSource("피터팬");
    setSelectedRegions(["부산광역시"]);
    setSelectedBuilding("전체");
    setKeyword("센텀");
    setSelectedPass("전체");
    setSelectedRegister("전체");
    setSelectedReview("숨김 제외");
    setSortMode("rating");
  }

  function showSeoulOfficeAptResults() {
    setSelectedSource("전체");
    setSelectedRegions(["서울특별시"]);
    setSelectedBuilding("아파트·오피스텔");
    setKeyword("");
    setSelectedPass("전체");
    setSelectedRegister("전체");
    setSelectedReview("숨김 제외");
    setSortMode("rating");
  }

  function showGyeonggiOfficeAptResults() {
    setSelectedSource("피터팬");
    setSelectedRegions(["경기도"]);
    setSelectedBuilding("아파트·오피스텔");
    setKeyword("");
    setSelectedPass("전체");
    setSelectedRegister("전체");
    setSelectedReview("숨김 제외");
    setSortMode("rating");
  }

  function showSamsamSeoulResults() {
    setSelectedSource("삼삼엠투");
    setSelectedRegions(["서울특별시"]);
    setSelectedBuilding("아파트·오피스텔");
    setKeyword("");
    setCriteria(DEFAULT_CRITERIA);
    setSelectedPass("전체");
    setSelectedRegister("전체");
    setSelectedReview("숨김 제외");
    setSortMode("rating");
  }

  function showHiddenResults() {
    setSelectedReview("숨김");
    setSelectedPass("전체");
    setSelectedRegister("전체");
  }

  function toggleRegion(region: (typeof regionOrder)[number]) {
    setSelectedRegions((current) => {
      if (current.includes(region)) {
        return current.length === 1
          ? current
          : current.filter((item) => item !== region);
      }
      return regionOrder.filter((item) => [...current, region].includes(item));
    });
  }

  async function saveListingAction(
    listingId: number,
    change: Partial<Pick<ListingAction, "favorite" | "hidden">>,
  ) {
    const key = String(listingId);
    const previousActions = listingActions;
    const current = previousActions[key] ?? {
      favorite: false,
      hidden: false,
      updatedAt: new Date().toISOString(),
    };
    const next = {
      ...current,
      ...change,
      updatedAt: new Date().toISOString(),
    };
    const optimistic = { ...previousActions };

    if (!next.favorite && !next.hidden) {
      delete optimistic[key];
    } else {
      optimistic[key] = next;
    }

    setListingActions(optimistic);
    setActionMessage("서버에 저장 중입니다.");

    try {
      const response = await fetch(`${BASE_PATH}/api/listing-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: listingId, ...change }),
      });
      if (!response.ok) throw new Error("검토 상태 저장 실패");
      const data = (await response.json()) as { actions?: ListingActions };
      setListingActions(data.actions ?? optimistic);
      setActionMessage("서버에 저장했습니다.");
    } catch {
      setListingActions(previousActions);
      setActionMessage("서버 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function recrawl() {
    setIsRecrawling(true);
    setRecrawlMessage("재수집 중입니다. 페이지는 계속 볼 수 있습니다.");
    try {
      const response = await fetch(`${BASE_PATH}/api/recrawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: COLLECTION_LIMIT,
          detailLimit: DETAIL_LIMIT,
          samsamLimit: SAMSAM_LIMIT,
          samsamDetailLimit: SAMSAM_DETAIL_LIMIT,
        }),
      });
      if (!response.ok) throw new Error("재수집 요청 실패");
      const nextData = (await response.json()) as CrawlData;
      if (!isUsableCrawlData(nextData)) {
        window.localStorage.removeItem(LOCAL_KEY);
        setRecrawlMessage(
          `재수집 결과가 기본 조건 후보를 만들지 못해 적용하지 않았습니다. 수집 ${nextData.collectedCount ?? getSourceListings(nextData).length}건, 상세 ${detailedCount(nextData)}건, 기본 조건통과 ${defaultPassCount(nextData)}건입니다. 현재 기본 데이터를 유지합니다.`,
        );
        return;
      }
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(nextData));
      setData(nextData);
      setRecrawlMessage(
        `${nextData.collectedCount}건을 다시 수집했습니다. 상세 보강 ${nextData.allListings.filter((item) => item.dataDepth === "상세").length}건.`,
      );
    } catch {
      setRecrawlMessage(
        "재수집이 끝까지 완료되지 않았습니다. 현재 화면은 마지막 저장 데이터를 유지합니다.",
      );
    } finally {
      setIsRecrawling(false);
    }
  }

  function clearSavedData() {
    window.localStorage.removeItem(LOCAL_KEY);
    for (const key of LEGACY_LOCAL_KEYS) {
      window.localStorage.removeItem(key);
    }
    window.location.reload();
  }

  if (!data) {
    return (
      <main className="loading">
        {loadError || "매물 자료를 불러오는 중입니다."}
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <div>
            <p className="eyebrow">Peterpan + 33m2 Rental Scout</p>
          <h1>서울·경기·부산·대구 단기임대 검토판</h1>
          <p className="lead">
            서울·경기·부산·대구 전용 15평 이상 매물 중 보증금 500만원
            이하·월세 360만원 이하인 단기임대와 월세 후보를 함께 검토합니다.
            33m2는 2026년 8월 30일부터 12주 가능한 서울 오피스텔·아파트를
            별도 소스로 함께 봅니다. 공급면적은 통과 기준에 넣지 않고, 찜과
            숨김 상태는 서버에 저장됩니다.
          </p>
        </div>
        <div className="heroStats" aria-label="수집 요약">
          <div>
            <strong>{data.collectedCount ?? sourceListings.length}</strong>
            <span>수집 매물</span>
          </div>
          <div>
            <strong>{stats.detail}</strong>
            <span>상세 보강</span>
          </div>
          <div>
            <strong>{stats.imageCount}</strong>
            <span>매물 사진</span>
          </div>
        </div>
      </section>

      <section className="controlBand" aria-label="필터와 정렬">
        <div className="sourceNote">
          <strong>최근 수집</strong>
          <span>{visibleDate(data.generatedAt)}</span>
          <span>원조회 {data.totalApiCount.toLocaleString("ko-KR")}건</span>
        </div>
        <div className="controls">
          <button
            className="primaryAction"
            disabled={isRecrawling}
            onClick={recrawl}
            type="button"
          >
            {isRecrawling ? "재수집 중" : "재수집하기"}
          </button>
          <button className="quietAction" onClick={clearSavedData} type="button">
            기본 데이터
          </button>
          <select
            aria-label="정렬"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
          >
            <option value="priority">우선순위</option>
            <option value="detail">상세 보강 우선</option>
            <option value="newest">사용승인 최신순</option>
            <option value="rating">내 평가 높은순</option>
            <option value="size">전용면적 큰순</option>
            <option value="rent">월세 낮은순</option>
          </select>
        </div>
      </section>

      {recrawlMessage ? <div className="recrawlNote">{recrawlMessage}</div> : null}
      {actionMessage ? <div className="actionNote">{actionMessage}</div> : null}

      <section className="menuBand" aria-label="빠른 메뉴">
        <button
          className={selectedReview === "숨김 제외" ? "active" : ""}
          onClick={showDefaultResults}
          type="button"
        >
          전체 보기
        </button>
        <button
          className={selectedReview === "찜" ? "active favoriteMenu" : "favoriteMenu"}
          onClick={showFavoriteResults}
          type="button"
        >
          찜한 매물
          <strong>{stats.favoriteCount}</strong>
        </button>
        <button
          className={selectedReview === "숨김" ? "active" : ""}
          onClick={showHiddenResults}
          type="button"
        >
          숨김
          <strong>{stats.hiddenCount}</strong>
        </button>
        <button onClick={showRelaxedResults} type="button">
          16평 넓게 보기
        </button>
        <button onClick={showSeoulOfficeAptResults} type="button">
          서울 아파트·오피스텔
        </button>
        <button onClick={showSamsamSeoulResults} type="button">
          33m2 서울 12주
        </button>
        <button onClick={showGyeonggiOfficeAptResults} type="button">
          경기 아파트·오피스텔
        </button>
        <button onClick={showHaeundaeResults} type="button">
          해운대 오피스텔
        </button>
        <button onClick={showCentumResults} type="button">
          센텀 검색
        </button>
      </section>

      <section className="sliderBand" aria-label="동적 조건">
        <div className="sliderHeader">
          <div>
            <strong>조건 슬라이더</strong>
            <span>
              전용 {criteria.minRealPyeong.toFixed(1)}평 이상 · 보증금{" "}
              {criteria.maxDepositManwon}만원 이하 · 월세{" "}
              {criteria.maxMonthlyManwon}만원 이하
            </span>
            <span>
              상세 수집 전용면적 범위{" "}
              {sliderSummary.minReal !== null && sliderSummary.maxReal !== null
                ? `${sliderSummary.minReal.toFixed(2)}~${sliderSummary.maxReal.toFixed(2)}평`
                : "확인 중"}
            </span>
            <span>
              수집 목표는 전용 최대 {COLLECTION_MAX_REAL_PYEONG}평까지이며,
              현재 수집 결과에 없는 구간은 0건으로 표시될 수 있습니다.
            </span>
          </div>
          <div className="sliderLive">
            <div>
              <strong>{stats.qualified.toLocaleString("ko-KR")}</strong>
              <span>현재 조건통과</span>
            </div>
            <div>
              <strong>{listings.length.toLocaleString("ko-KR")}</strong>
              <span>현재 표시</span>
            </div>
            <button
              className="quietAction"
              type="button"
              onClick={showDefaultResults}
            >
              조건 초기화
            </button>
            <button
              className="quietAction"
              type="button"
              onClick={showRelaxedResults}
            >
              넓게 보기
            </button>
          </div>
        </div>
        <div className="sliders">
          <label>
            <span>전용면적 최소</span>
            <strong>{criteria.minRealPyeong.toFixed(1)}평</strong>
            <input
              type="range"
              min="5"
              max={COLLECTION_MAX_REAL_PYEONG}
              step="0.1"
              value={criteria.minRealPyeong}
              onChange={(event) =>
                setCriteria((current) => ({
                  ...current,
                  minRealPyeong: Number(event.target.value),
                }))
              }
            />
          </label>
          <label>
            <span>보증금 최대</span>
            <strong>{criteria.maxDepositManwon}만원</strong>
            <input
              type="range"
              min="0"
              max="1000"
              step="50"
              value={criteria.maxDepositManwon}
              onChange={(event) =>
                setCriteria((current) => ({
                  ...current,
                  maxDepositManwon: Number(event.target.value),
                }))
              }
            />
          </label>
          <label>
            <span>월세 최대</span>
            <strong>{criteria.maxMonthlyManwon}만원</strong>
            <input
              type="range"
              min="0"
              max="500"
              step="10"
              value={criteria.maxMonthlyManwon}
              onChange={(event) =>
                setCriteria((current) => ({
                  ...current,
                  maxMonthlyManwon: Number(event.target.value),
                }))
              }
            />
          </label>
        </div>
      </section>

      <section className="filterBand" aria-label="상태 필터">
        <div className="segmented sourceSegmented" aria-label="플랫폼 필터">
          {sourceOrder.map((source) => (
            <button
              key={source}
              className={selectedSource === source ? "active" : ""}
              onClick={() => setSelectedSource(source)}
              type="button"
            >
              {source}
            </button>
          ))}
        </div>
        <div className="segmented regionSegmented" aria-label="지역 필터">
          {regionOrder.map((region) => (
            <button
              key={region}
              className={selectedRegions.includes(region) ? "active" : ""}
              onClick={() => toggleRegion(region)}
              type="button"
            >
              {regionLabels[region]}
            </button>
          ))}
        </div>
        <div className="segmented buildingSegmented" aria-label="건물유형 필터">
          {buildingOrder.map((building) => (
            <button
              key={building}
              className={selectedBuilding === building ? "active" : ""}
              onClick={() => setSelectedBuilding(building)}
              type="button"
            >
              {building}
            </button>
          ))}
        </div>
        <label className="keywordSearch">
          <span>검색</span>
          <input
            aria-label="주소, 역, 제목 검색"
            placeholder="해운대, 센텀, 우동..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>
        <div className="segmented" aria-label="검토 상태 필터">
          {reviewOrder.map((status) => (
            <button
              key={status}
              className={selectedReview === status ? "active" : ""}
              onClick={() => setSelectedReview(status)}
              type="button"
            >
              {status}
            </button>
          ))}
        </div>
        <div className="segmented" aria-label="조건 판정 필터">
          {(["전체", ...passOrder] as const).map((status) => (
            <button
              key={status}
              className={selectedPass === status ? "active" : ""}
              onClick={() => setSelectedPass(status)}
              type="button"
            >
              {status}
            </button>
          ))}
        </div>
        <div className="segmented" aria-label="전입 필터">
          {registerOrder.map((status) => (
            <button
              key={status}
              className={selectedRegister === status ? "active" : ""}
              onClick={() => setSelectedRegister(status)}
              type="button"
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      <section className="rankStrip" aria-label="검토 현황">
        <div>
          <span>찜</span>
          <strong>{stats.favoriteCount}</strong>
        </div>
        <div>
          <span>숨김</span>
          <strong>{stats.hiddenCount}</strong>
        </div>
        <div>
          <span>선택지역 조건 통과</span>
          <strong>{stats.qualified}</strong>
        </div>
        <div>
          <span>전입 확정</span>
          <strong>{stats.confirmed}</strong>
        </div>
        <div>
          <span>본문상 전입 가능</span>
          <strong>{stats.textOnly}</strong>
        </div>
        <div>
          <span>로드뷰 썸네일</span>
          <strong>{stats.roadviewCount}</strong>
        </div>
      </section>

      <section className="resultHeader">
        <h2>{listings.length.toLocaleString("ko-KR")}건 표시 중</h2>
        <p>
          {hasAreaDataAboveObservedMax
            ? `현재 상세 수집 데이터는 전용 ${sliderSummary.maxReal?.toFixed(2)}평까지만 확인되어, 그보다 큰 최소면적 조건은 0건이 될 수 있습니다. `
            : "조건 통과는 현재 슬라이더 값으로 즉시 다시 계산됩니다. "}
          상세 확인{" "}
          {sliderSummary.detailed}건 중 {sliderSummary.dynamicExcluded}건은 현재
          조건에서 제외됩니다.
        </p>
      </section>

      <section className="listingGrid" aria-label="매물 목록">
        {listings.length === 0 ? (
          <div className="emptyResults">
            <strong>현재 조건에 맞는 표시 매물이 없습니다.</strong>
            <p>
              슬라이더 값과 상태 필터는 즉시 적용되고 있습니다. 현재 상세 수집된
              전용면적 범위는{" "}
              {sliderSummary.minReal !== null && sliderSummary.maxReal !== null
                ? `${sliderSummary.minReal.toFixed(2)}~${sliderSummary.maxReal.toFixed(2)}평`
                : "아직 충분히 확인되지 않음"}
              입니다. 숨김, 전입 필터, 조건 판정 필터가 함께 좁혀져도 0건이 될
              수 있습니다.
            </p>
            <div className="emptyActions">
              <button type="button" onClick={showRelaxedResults}>
                넓게 보기
              </button>
              <button type="button" onClick={showDefaultResults}>
                기본 조건으로
              </button>
            </div>
          </div>
        ) : null}
        {listings.map((listing, index) => {
          const imageIndex = activeImage[listing.id] ?? 0;
          const heroImage =
            listing.images?.[imageIndex] ?? listing.roadviews?.[0]?.image;
          const passStatus = dynamicPassStatus(listing, criteria);
          const currentReasons = dynamicReasons(listing, criteria);
          const action = listingActions[String(listing.id)];
          const isFavorite = Boolean(action?.favorite);
          const isHidden = Boolean(action?.hidden);
          const rating = rateListing(listing);
          const source = listing.source ?? "피터팬";
          const isSamsam = source === "삼삼엠투";
          const weeklyUsingFee = Number(listing.rawSignals?.weeklyUsingFeeManwon ?? 0);
          const weeklyMgmtFee = Number(listing.rawSignals?.weeklyMgmtFeeManwon ?? 0);
          const totalStay = Number(listing.rawSignals?.totalStayManwon ?? 0);
          const monthlyWithMgmt = Number(
            listing.rawSignals?.monthlyEquivalentWithMgmtManwon ?? 0,
          );

          return (
            <article
              className={`listing${isFavorite ? " favorite" : ""}${
                isHidden ? " hiddenListing" : ""
              }`}
              key={listing.id}
            >
              <div className="media">
                {heroImage ? (
                  <img src={heroImage} alt={`${listing.address} 매물 이미지`} />
                ) : (
                  <div className="emptyImage">사진 없음</div>
                )}
                <div className="mediaMeta">
                  <span>#{index + 1}</span>
                  <span>{source}</span>
                  <span>{listing.dataDepth}</span>
                  <span>{listing.images?.length ?? 0} photos</span>
                </div>
              </div>

              <div className="content">
                <div className="titleRow">
                  <div>
                    <p className="address">{listing.address}</p>
                    <h2>{listing.title}</h2>
                  </div>
                  <div className="badgeStack">
                    {isFavorite ? <span className="badge favorite">찜</span> : null}
                    {isHidden ? <span className="badge hidden">숨김</span> : null}
                    <span className="badge sourceBadge">{source}</span>
                    <span className={`badge ${passClass(passStatus)}`}>
                      {passStatus}
                    </span>
                    <span
                      className={`badge ${registerClass(listing.registerStatus)}`}
                    >
                      {listing.registerStatus}
                    </span>
                  </div>
                </div>

                <div className="reviewActions" aria-label="매물 검토 상태">
                  <button
                    className={isFavorite ? "active" : ""}
                    type="button"
                    onClick={() =>
                      saveListingAction(listing.id, { favorite: !isFavorite })
                    }
                  >
                    {isFavorite ? "찜 해제" : "찜"}
                  </button>
                  <button
                    className={isHidden ? "active danger" : "danger"}
                    type="button"
                    onClick={() =>
                      saveListingAction(listing.id, { hidden: !isHidden })
                    }
                  >
                    {isHidden ? "다시 표기" : "더 이상 표기하지 않기"}
                  </button>
                </div>

                <div className={`ratingPanel ${scoreLabel(rating.overall)}`}>
                  <div className="ratingSummary">
                    <span>내 평가</span>
                    <strong>{rating.overall.toFixed(1)}</strong>
                    <small>/5</small>
                  </div>
                  <div className="ratingContext">
                    <span>
                      초기 필요금 {rating.upfrontManwon.toLocaleString("ko-KR")}
                      만원
                    </span>
                    <span>
                      {rating.nearestStation
                        ? `${rating.nearestStation.name}역 약 ${rating.nearestStation.distanceMeters.toLocaleString("ko-KR")}m`
                        : "가까운 역 좌표 미확인"}
                    </span>
                  </div>
                  <div className="ratingItems">
                    {rating.items.map((item) => (
                      <div key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.score}</strong>
                        <small>{item.detail}</small>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="metrics">
                  <div>
                    <span>전용</span>
                    <strong className="pyeongValue">
                      {listing.realPyeong ? listing.realPyeong.toFixed(2) : "-"}평
                    </strong>
                    <small className="sqmValue">
                      {listing.realSize ? listing.realSize.toFixed(2) : "-"}㎡
                    </small>
                  </div>
                  <div>
                    <span>{isSamsam ? "보증금/월환산" : "보증금/월세"}</span>
                    <strong>
                      {listing.depositManwon}/{listing.monthlyManwon}
                    </strong>
                    <small>{isSamsam ? "만원 · 이용료" : "만원"}</small>
                  </div>
                  <div>
                    <span>사용승인</span>
                    <strong>{listing.buildYear ?? "-"}</strong>
                    <small>{formatDate(listing.buildingDate)}</small>
                  </div>
                  <div>
                    <span>층</span>
                    <strong>{listing.floor}</strong>
                    <small>{listing.buildingType}</small>
                  </div>
                </div>

                {currentReasons.length ? (
                  <div className="reasonLine">
                    {currentReasons.map((reason) => (
                      <span key={reason}>{reason}</span>
                    ))}
                  </div>
                ) : null}

                <div className="details">
                  <p>
                    <strong>지번</strong> {listing.jibunAddress}
                  </p>
                  <p>
                    <strong>도로명</strong> {listing.roadAddress || "-"}
                  </p>
                  <p>
                    <strong>입주</strong> {listing.moveText || "-"} ·{" "}
                    <strong>관리비</strong> {listing.maintenanceManwon}만원
                  </p>
                  {isSamsam ? (
                    <p>
                      <strong>33m2 비용</strong> 주 이용료 {weeklyUsingFee}만원 ·
                      주 관리비 {weeklyMgmtFee}만원 · 월환산 관리비 포함{" "}
                      {monthlyWithMgmt || listing.monthlyManwon}만원 · 12주 총액{" "}
                      {totalStay.toLocaleString("ko-KR")}만원
                    </p>
                  ) : null}
                  <p>
                    <strong>{isSamsam ? "33m2 조회기간" : "피터팬 등록"}</strong>{" "}
                    {formatDate(listing.peterpanCreatedAt ?? listing.liveStartDate)}
                  </p>
                  <p>
                    <strong>계약유형</strong>{" "}
                    {String(listing.rawSignals?.contractType ?? "-")}
                  </p>
                  <p>
                    <strong>후기</strong> {listing.reviewFinding}
                  </p>
                </div>

                {listing.images?.length ? (
                  <div className="gallery" aria-label="매물 사진 전체">
                    {listing.images.slice(0, 24).map((image, photoIndex) => (
                      <button
                        type="button"
                        key={`${listing.id}-${image}`}
                        onClick={() =>
                          setActiveImage((current) => ({
                            ...current,
                            [listing.id]: photoIndex,
                          }))
                        }
                        className={imageIndex === photoIndex ? "selected" : ""}
                        aria-label={`${listing.id} 사진 ${photoIndex + 1}`}
                      >
                        <img src={image} alt="" />
                      </button>
                    ))}
                  </div>
                ) : null}

                {listing.roadviews?.length ? (
                  <div className="roadviews">
                    {listing.roadviews.map((roadview) => (
                      <a
                        key={roadview.id}
                        href={roadview.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img src={roadview.image} alt="카카오 로드뷰 썸네일" />
                        <span>{formatDate(roadview.shotDate)}</span>
                      </a>
                    ))}
                  </div>
                ) : null}

                <div className="links" aria-label="외부 조사 링크">
                  <a
                    className="primaryLink"
                    href={listing.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source}
                  </a>
                  <a
                    href={listing.kakaoRoadviewLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    로드뷰
                  </a>
                  <a href={listing.kakaoSearchLink} target="_blank" rel="noreferrer">
                    카카오맵
                  </a>
                  <a href={listing.naverMapLink} target="_blank" rel="noreferrer">
                    네이버지도
                  </a>
                  <a href={listing.googleMapLink} target="_blank" rel="noreferrer">
                    구글지도
                  </a>
                  <a
                    href={listing.hogangnonoSearchLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    호갱노노
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
