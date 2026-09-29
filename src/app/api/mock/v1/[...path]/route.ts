import { NextRequest, NextResponse } from "next/server";

function targetBase(req: NextRequest): string {
  const fromHeader = req.headers.get("x-onetrace-target-base")?.trim();
  if (fromHeader) return fromHeader.replace(/\/$/, "");
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://110.225.254.51:5050/api/v1";
}

function apiPath(req: NextRequest): string {
  const raw = req.nextUrl.pathname.replace(/^\/api\/mock\/v1\/?/, "");
  return raw.endsWith("/") ? raw : `${raw}/`;
}

async function readBody(req: NextRequest): Promise<unknown> {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "DELETE") return null;
  try {
    return await req.json();
  } catch {
    return null;
  }
}

async function handle(req: NextRequest) {
  const path = apiPath(req);
  const base = targetBase(req);
  const body = await readBody(req);
  const query = Object.fromEntries(req.nextUrl.searchParams.entries());
  const data =
    req.method === "DELETE"
      ? null
      : body && typeof body === "object" && !Array.isArray(body)
        ? { id: Date.now(), ...(body as Record<string, unknown>) }
        : body ?? [];

  return NextResponse.json(
    {
      success: true,
      message: "Mock API preview — app data is local; copy this request for the real backend.",
      endpoint: `${req.method} ${base}/${path}`,
      query: Object.keys(query).length > 0 ? query : undefined,
      data,
      pagination:
        req.method === "GET"
          ? {
              total_records: Array.isArray(data) ? data.length : 0,
              total_pages: 1,
              current_page: 1,
              page_size: 20,
              next: null,
              previous: null,
            }
          : undefined,
    },
    {
      headers: {
        "X-OneTrace-Mock": "1",
        "X-OneTrace-Target-Endpoint": `${base}/${path}`,
      },
    },
  );
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
