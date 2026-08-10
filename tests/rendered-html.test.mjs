import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

function isDynamicPass(listing, criteria) {
  const contractType = String(listing.rawSignals?.contractType ?? "");
  if (listing.dataDepth !== "상세") return false;
  if (listing.address && !listing.address.startsWith("서울특별시")) return false;
  if (contractType !== "단기임대" && contractType !== "월세") return false;
  if ((listing.realPyeong ?? 0) < criteria.minRealPyeong) return false;
  if (listing.depositManwon > criteria.maxDepositManwon) return false;
  if (listing.monthlyManwon > criteria.maxMonthlyManwon) return false;
  if (listing.buildYear !== null && listing.buildYear < 2000) return false;
  if (!listing.buildingDate) return false;
  return true;
}

test("server-renders the Move 2026 shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Move 2026 서울 단기임대 검토판/);
  assert.match(html, /매물 자료를 불러오는 중입니다/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("ships a broad slider-ready Peterpan data set", async () => {
  const data = JSON.parse(
    await readFile(new URL("../public/data/listings.json", import.meta.url), "utf8"),
  );

  const detailed = data.allListings.filter((listing) => listing.dataDepth === "상세");
  const withCreated = data.allListings.filter(
    (listing) => listing.peterpanCreatedAt || listing.liveStartDate,
  );
  const withPeterpanLink = data.allListings.filter((listing) =>
    /^https:\/\/www\.peterpanz\.com\/house\/\d+/.test(listing.url),
  );
  const defaultPass = data.allListings.filter((listing) =>
    isDynamicPass(listing, {
      minRealPyeong: 15,
      maxDepositManwon: 500,
      maxMonthlyManwon: 360,
    }),
  );
  const relaxedPass = data.allListings.filter((listing) =>
    isDynamicPass(listing, {
      minRealPyeong: 5,
      maxDepositManwon: 1000,
      maxMonthlyManwon: 500,
    }),
  );
  const expandedBudgetPass = data.allListings.filter((listing) =>
    isDynamicPass(listing, {
      minRealPyeong: 15,
      maxDepositManwon: 1000,
      maxMonthlyManwon: 500,
    }),
  );

  assert.equal(data.collectedCount, 600);
  assert.equal(detailed.length, 220);
  assert.equal(defaultPass.length, 18);
  assert.equal(expandedBudgetPass.length, 22);
  assert.equal(relaxedPass.length, 43);
  assert.equal(data.query.collectionMaxDepositManwon, 1000);
  assert.equal(data.query.collectionMaxMonthlyManwon, 500);
  assert.equal(data.query.collectionMaxRealPyeong, 40);
  assert.equal(withCreated.length, data.allListings.length);
  assert.equal(withPeterpanLink.length, data.allListings.length);
});
