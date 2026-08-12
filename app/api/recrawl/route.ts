import { crawlMoveListings } from "../../lib/crawler";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    limit?: number;
    detailLimit?: number;
    samsamLimit?: number;
    samsamDetailLimit?: number;
  };

  const data = await crawlMoveListings({
    limit: body.limit ?? 5000,
    detailLimit: body.detailLimit ?? 2800,
    samsamLimit: body.samsamLimit ?? 700,
    samsamDetailLimit: body.samsamDetailLimit ?? 700,
  });

  return Response.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
