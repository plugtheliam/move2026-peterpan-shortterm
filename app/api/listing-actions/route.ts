import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ListingAction = {
  favorite: boolean;
  hidden: boolean;
  updatedAt: string;
};

type ListingActionState = Record<string, ListingAction>;

const EMPTY_STATE: ListingActionState = {};

function statePath() {
  return (
    process.env.MOVE2026_ACTIONS_PATH ??
    join(process.cwd(), ".data", "listing-actions.json")
  );
}

function normalizeState(value: unknown): ListingActionState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return EMPTY_STATE;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([id, action]) => {
      if (!action || typeof action !== "object" || Array.isArray(action)) {
        return null;
      }
      const item = action as Partial<ListingAction>;
      return [
        id,
        {
          favorite: Boolean(item.favorite),
          hidden: Boolean(item.hidden),
          updatedAt:
            typeof item.updatedAt === "string"
              ? item.updatedAt
              : new Date().toISOString(),
        },
      ] as const;
    })
    .filter((entry): entry is readonly [string, ListingAction] =>
      Boolean(entry),
    );

  return Object.fromEntries(entries);
}

async function readState() {
  try {
    const raw = await readFile(statePath(), "utf8");
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return EMPTY_STATE;
    }
    throw error;
  }
}

async function writeState(state: ListingActionState) {
  const file = statePath();
  await mkdir(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temp, file);
}

export async function GET() {
  const actions = await readState();
  return Response.json(
    { actions },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    id?: unknown;
    favorite?: unknown;
    hidden?: unknown;
  };
  const id = String(body.id ?? "").trim();

  if (!id) {
    return Response.json({ error: "매물 ID가 필요합니다." }, { status: 400 });
  }

  const actions = await readState();
  const current = actions[id] ?? {
    favorite: false,
    hidden: false,
    updatedAt: new Date().toISOString(),
  };
  const next = {
    favorite:
      typeof body.favorite === "boolean" ? body.favorite : current.favorite,
    hidden: typeof body.hidden === "boolean" ? body.hidden : current.hidden,
    updatedAt: new Date().toISOString(),
  };

  if (!next.favorite && !next.hidden) {
    delete actions[id];
  } else {
    actions[id] = next;
  }

  await writeState(actions);

  return Response.json(
    { actions, action: actions[id] ?? null },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
