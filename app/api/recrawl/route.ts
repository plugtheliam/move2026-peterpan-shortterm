import { crawlPeterpan } from "../../lib/crawler";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    limit?: number;
    detailLimit?: number;
  };

  const data = await crawlPeterpan({
    limit: body.limit ?? 360,
    detailLimit: body.detailLimit ?? 140,
  });

  return Response.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
