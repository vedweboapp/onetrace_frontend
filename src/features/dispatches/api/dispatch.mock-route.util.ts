import { NextResponse } from "next/server";
import { resolveBackendOrigin } from "@/core/config/api-url.util";
import { DISPATCH_USE_MOCK } from "./dispatch.mock.config";

export function dispatchMockRoutesEnabled(): boolean {
  return DISPATCH_USE_MOCK;
}

export function dispatchMockJsonSuccess<T>(message: string, data: T, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: true, message, data, ...extra });
}

export function dispatchMockJsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function proxyDispatchToBackend(request: Request, relativePath: string): Promise<NextResponse> {
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
