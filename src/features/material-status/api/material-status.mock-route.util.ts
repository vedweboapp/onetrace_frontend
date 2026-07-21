import { NextResponse } from "next/server";
import { resolveBackendOrigin } from "@/core/config/api-url.util";
import { MATERIAL_STATUS_USE_MOCK } from "./material-status.mock.config";

export function materialStatusMockRoutesEnabled(): boolean {
  return MATERIAL_STATUS_USE_MOCK;
}

export function materialStatusMockJsonSuccess<T>(message: string, data: T, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: true, message, data, ...extra });
}

export function materialStatusMockJsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function proxyMaterialStatusToBackend(
  request: Request,
  relativePath: string,
): Promise<NextResponse> {
  const incoming = new URL(request.url);
  const target = new URL(`${resolveBackendOrigin()}/api/v1/${relativePath}`);
  target.search = incoming.search;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  const init: RequestInit = { method: request.method, headers, cache: "no-store" };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }
  const upstream = await fetch(target, init);
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
  });
}
