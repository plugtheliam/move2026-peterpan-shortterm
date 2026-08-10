"use client";

import { useEffect, useMemo, useState } from "react";
import type { CrawlData, Listing } from "./lib/crawler";

const registerOrder = ["전체", "확정 가능", "본문에 가능", "미표시"] as const;
const passOrder = ["조건통과", "상세미확인", "탈락"] as const;
const LOCAL_KEY = "move2026-peterpan-shortterm-recrawl-v3";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

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

export default function Home() {
  const [data, setData] = useState<CrawlData | null>(null);
  const [selectedRegister, setSelectedRegister] =
    useState<(typeof registerOrder)[number]>("전체");
  const [selectedPass, setSelectedPass] =
    useState<"전체" | (typeof passOrder)[number]>("전체");
  const [sortMode, setSortMode] = useState("priority");
  const [activeImage, setActiveImage] = useState<Record<number, number>>({});
  const [isRecrawling, setIsRecrawling] = useState(false);
  const [recrawlMessage, setRecrawlMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCAL_KEY);
    if (stored) {
      try {
        const savedData = JSON.parse(stored) as CrawlData;
        if (savedData?.allListings?.length) {
          setData(savedData);
          return;
        }
        window.localStorage.removeItem(LOCAL_KEY);
      } catch {
        window.localStorage.removeItem(LOCAL_KEY);
      }
    }

    fetch(`${BASE_PATH}/data/listings.json`)
      .then((response) => response.json())
      .then((nextData: CrawlData) => {
        setData(nextData);
        setLoadError("");
      })
      .catch(() => {
        setLoadError("매물 자료를 불러오지 못했습니다. 새로고침해 주세요.");
      });
  }, []);

  const sourceListings = data?.allListings ?? data?.listings ?? [];

  const listings = useMemo(() => {
    const filtered = sourceListings.filter((item) => {
      const registerMatch =
        selectedRegister === "전체" || item.registerStatus === selectedRegister;
      const passMatch = selectedPass === "전체" || item.passStatus === selectedPass;
      return registerMatch && passMatch;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "newest") return (b.buildYear ?? 0) - (a.buildYear ?? 0);
      if (sortMode === "size") return b.realSize - a.realSize;
      if (sortMode === "rent") return a.monthlyManwon - b.monthlyManwon;
      if (sortMode === "detail") {
        return Number(b.dataDepth === "상세") - Number(a.dataDepth === "상세");
      }
      return (
        Number(b.passStatus === "조건통과") - Number(a.passStatus === "조건통과") ||
        Number(b.registerStatus === "확정 가능") -
          Number(a.registerStatus === "확정 가능") ||
        Number(b.registerStatus === "본문에 가능") -
          Number(a.registerStatus === "본문에 가능") ||
        b.realSize - a.realSize
      );
    });
  }, [sourceListings, selectedRegister, selectedPass, sortMode]);

  const stats = useMemo(() => {
    const items = sourceListings;
    const confirmed = items.filter(
      (item) => item.registerStatus === "확정 가능",
    ).length;
    const textOnly = items.filter(
      (item) => item.registerStatus === "본문에 가능",
    ).length;
    const qualified = items.filter((item) => item.passStatus === "조건통과").length;
    const detail = items.filter((item) => item.dataDepth === "상세").length;
    const imageCount = items.reduce(
      (sum, item) => sum + (item.images?.length ?? 0),
      0,
    );
    const roadviewCount = items.reduce(
      (sum, item) => sum + (item.roadviews?.length ?? 0),
      0,
    );

    return { confirmed, textOnly, qualified, detail, imageCount, roadviewCount };
  }, [sourceListings]);

  async function recrawl() {
    setIsRecrawling(true);
    setRecrawlMessage("재수집 중입니다. 페이지는 계속 볼 수 있습니다.");
    try {
      const response = await fetch(`${BASE_PATH}/api/recrawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 240, detailLimit: 100 }),
      });
      if (!response.ok) throw new Error("재수집 요청 실패");
      const nextData = (await response.json()) as CrawlData;
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
          <p className="eyebrow">Peterpanz Seoul Short-Term Scout</p>
          <h1>서울 단기임대 원천 데이터 200+ 검토판</h1>
          <p className="lead">
            서울 단기임대·보증금 500만원 이하·월세 360만원 이하 원천 풀을
            넓게 모으고, 상세 확인이 된 매물은 15평·연식 조건까지 판정합니다.
            재수집은 백그라운드로 실행되고 결과는 이 브라우저에 저장됩니다.
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
            <span>피터팬 사진</span>
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
            <option value="size">전용면적 큰순</option>
            <option value="rent">월세 낮은순</option>
          </select>
        </div>
      </section>

      {recrawlMessage ? <div className="recrawlNote">{recrawlMessage}</div> : null}

      <section className="filterBand" aria-label="상태 필터">
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
          <span>조건 통과</span>
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
          상세 보강 전 목록 매물은 사용승인일·전입신고가 비어 있을 수 있습니다.
          피터팬 버튼으로 상세를 열어 최종 확인하세요.
        </p>
      </section>

      <section className="listingGrid" aria-label="매물 목록">
        {listings.map((listing, index) => {
          const imageIndex = activeImage[listing.id] ?? 0;
          const heroImage =
            listing.images?.[imageIndex] ?? listing.roadviews?.[0]?.image;

          return (
            <article className="listing" key={listing.id}>
              <div className="media">
                {heroImage ? (
                  <img src={heroImage} alt={`${listing.address} 매물 이미지`} />
                ) : (
                  <div className="emptyImage">사진 없음</div>
                )}
                <div className="mediaMeta">
                  <span>#{index + 1}</span>
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
                    <span className={`badge ${passClass(listing.passStatus)}`}>
                      {listing.passStatus}
                    </span>
                    <span
                      className={`badge ${registerClass(listing.registerStatus)}`}
                    >
                      {listing.registerStatus}
                    </span>
                  </div>
                </div>

                <div className="metrics">
                  <div>
                    <span>전용</span>
                    <strong>
                      {listing.realSize ? listing.realSize.toFixed(2) : "-"}㎡
                    </strong>
                    <small>
                      {listing.realPyeong ? listing.realPyeong.toFixed(2) : "-"}평
                    </small>
                  </div>
                  <div>
                    <span>보증금/월세</span>
                    <strong>
                      {listing.depositManwon}/{listing.monthlyManwon}
                    </strong>
                    <small>만원</small>
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

                {listing.excludedReasons?.length ? (
                  <div className="reasonLine">
                    {listing.excludedReasons.map((reason) => (
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
                  <p>
                    <strong>후기</strong> {listing.reviewFinding}
                  </p>
                </div>

                {listing.images?.length ? (
                  <div className="gallery" aria-label="피터팬 사진 전체">
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
                  <a href={listing.url} target="_blank" rel="noreferrer">
                    피터팬
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
