"use client";

import { useSyncExternalStore, useEffect, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { routes } from "@/shared/config/routes";

function subscribeAuthHydration(onStoreChange: () => void) {
  if (useAuthStore.persist.hasHydrated()) {
    return () => {};
  }
  return useAuthStore.persist.onFinishHydration(onStoreChange);
}

function getAuthHydratedSnapshot() {
  return useAuthStore.persist.hasHydrated();
}

function getAuthHydratedServerSnapshot() {
  return false;
}

export function DashboardAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const hydrated = useSyncExternalStore(
    subscribeAuthHydration,
    getAuthHydratedSnapshot,
    getAuthHydratedServerSnapshot,
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace(routes.auth.login);
    }
  }, [hydrated, token, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-white">
        <div
          className="size-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900 dark:border-slate-200 dark:border-t-slate-900"
          aria-hidden
        />
      </div>
    );
  }

  if (!token) return null;

  return <>{children}</>;
}
