"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { cn } from "@/core/utils/http.util";
import logoImage from "@/assets/images/logo.png";

type Props = {
  className?: string;
  collapsed?: boolean;
};

export function DashboardAppBrand({ className, collapsed }: Props) {
  const logoPx = collapsed ? 28 : 32;

  return (
    <Link
      href={routes.dashboard.projects}
      className={cn(
        "flex items-center min-w-0 gap-2.5 h-10",
        "outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:focus-visible:ring-slate-600",
        collapsed ? "size-9 justify-center gap-0" : "",
        className
      )}
    >
      {/* Logo */}
      <span
        className={cn(
          "flex shrink-0 items-center justify-center",
          collapsed ? "size-7" : "size-8"
        )}
      >
        <Image
          src={logoImage}
          alt="Red 5"
          width={logoPx}
          height={logoPx}
          className="object-contain translate-y-[4px]" 
          priority
        />
      </span>

      {/* Text */}
      {!collapsed && (
        <span
          className={cn(
            "flex items-center min-w-0 truncate",
            "font-extrabold tracking-tight text-slate-900 dark:text-slate-50",
            "text-lg leading-none" // tighter baseline
          )}
        >
          Red5
        </span>
      )}

      {collapsed && <span className="sr-only">Red 5</span>}
    </Link>
  );
}