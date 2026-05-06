"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import img1 from "@/assets/images/image 1.png";
import img2 from "@/assets/images/image 2.png";
import img3 from "@/assets/images/image 4.png";

const SLIDES = [{ image: img1 }, { image: img2 }, { image: img3 }];

export function AuthMarketingCarousel() {
  const t = useTranslations("Auth");
  const [active, setActive] = React.useState(0);
  const [animating, setAnimating] = React.useState(false);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setAnimating(true);
      window.setTimeout(() => {
        setActive((p) => (p + 1) % SLIDES.length);
        setAnimating(false);
      }, 350);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#070b12]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center gap-2.5 px-5 sm:px-8 py-5 sm:py-6">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-md bg-red-500 text-[13px] text-white"
          style={{ fontWeight: 900, letterSpacing: "0.05em" }}
        >
          R5
        </span>

        <span
          className="text-[14px] sm:text-[15px] text-white"
          style={{ fontWeight: 700, letterSpacing: "0.08em" }}
        >
          RED 5
        </span>

        <span className="ml-auto flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11px] sm:text-[12px] text-white/70">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          {t("heroLiveSync")}
        </span>
      </div>

      {/* ── Headline + text (FIXED responsiveness) ── */}
      <div className="px-5 sm:px-8 pt-1">
        <div className="max-w-xl">
          <h1
            className="text-white"
            style={{
              fontSize: "clamp(26px, 3vw, 44px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {t("heroTitleLine1")}
            <br />
            <span style={{ color: "#94a3b8", fontWeight: 700 }}>
              {t("heroTitleLine2")}
            </span>
          </h1>

          <p
            className="mt-4 text-white/60 max-w-md"
            style={{
              fontSize: "clamp(13px, 1.1vw, 15px)",
              fontWeight: 400,
              lineHeight: 1.6,
            }}
          >
            {t("heroSubtitle")}
          </p>
        </div>
      </div>

      {/* ── Carousel image (FULL WIDTH preserved) ── */}
      <div className="relative mx-4 sm:mx-5 mt-6 sm:mt-7 flex-1 overflow-hidden rounded-xl border border-white/10">
        {SLIDES.map((slide, i) => (
          <img
            key={i}
            src={
              typeof slide.image === "string"
                ? slide.image
                : (slide.image as { src: string }).src
            }
            alt={`Blueprint slide ${i + 1}`}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: i === active ? (animating ? 0 : 1) : 0,
              transform:
                i === active
                  ? animating
                    ? "scale(1.03)"
                    : "scale(1)"
                  : "scale(1.03)",
              transition: "opacity 0.35s ease, transform 0.35s ease",
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Bottom gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070b12] via-[#070b12]/20 to-transparent" />

        {/* Top vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#070b12]/40 via-transparent to-transparent" />
      </div>

      {/* ── Dots ── */}
      <div className="flex items-center gap-2.5 px-5 sm:px-8 py-4 sm:py-5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setAnimating(true);
              window.setTimeout(() => {
                setActive(i);
                setAnimating(false);
              }, 350);
            }}
            aria-label={`Slide ${i + 1}`}
            style={{
              height: "5px",
              width: i === active ? "26px" : "6px",
              borderRadius: "9999px",
              background: i === active ? "#22d3ee" : "rgba(255,255,255,0.25)",
              transition: "width 0.3s ease, background 0.3s ease",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}