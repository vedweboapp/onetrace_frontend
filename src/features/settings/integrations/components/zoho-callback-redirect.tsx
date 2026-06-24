"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";

function ZohoCallbackRedirectInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "help");
    router.replace(`${routes.dashboard.settingsZohoConnection}?${params.toString()}`);
  }, [router, searchParams]);

  return null;
}

/** Legacy `/zoho/callback` route — forwards OAuth params to the connection Help tab. */
export function ZohoCallbackRedirect() {
  return (
    <React.Suspense fallback={null}>
      <ZohoCallbackRedirectInner />
    </React.Suspense>
  );
}
