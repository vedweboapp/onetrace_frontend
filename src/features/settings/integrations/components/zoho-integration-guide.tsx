"use client";

import Image, { type StaticImageData } from "next/image";
import { useTranslations } from "next-intl";
import stepConnectImage from "@/assets/images/2.png";
import stepAuthenticateImage from "@/assets/images/3.png";
import stepAllowAccessImage from "@/assets/images/4.png";
import stepFieldMappingImage from "@/assets/images/5.png";
import stepIntegrationSuccessImage from "@/assets/images/6.png";
import { cn } from "@/core/utils/http.util";

type GuideStep = {
  id: string;
  titleKey: string;
  bodyKey: string;
  image: StaticImageData;
  imageAltKey: string;
};

const GUIDE_STEPS: GuideStep[] = [
  {
    id: "connect",
    titleKey: "steps.connect.title",
    bodyKey: "steps.connect.body",
    image: stepConnectImage,
    imageAltKey: "steps.connect.imageAlt",
  },
  {
    id: "authenticate",
    titleKey: "steps.authenticate.title",
    bodyKey: "steps.authenticate.body",
    image: stepAuthenticateImage,
    imageAltKey: "steps.authenticate.imageAlt",
  },
  {
    id: "allow",
    titleKey: "steps.allow.title",
    bodyKey: "steps.allow.body",
    image: stepAllowAccessImage,
    imageAltKey: "steps.allow.imageAlt",
  },
  {
    id: "success",
    titleKey: "steps.success.title",
    bodyKey: "steps.success.body",
    image: stepIntegrationSuccessImage,
    imageAltKey: "steps.success.imageAlt",
  },
  {
    id: "mapping",
    titleKey: "steps.mapping.title",
    bodyKey: "steps.mapping.body",
    image: stepFieldMappingImage,
    imageAltKey: "steps.mapping.imageAlt",
  },
];

function GuideStepCard({
  stepLabel,
  title,
  body,
  image,
  imageAlt,
  note,
}: {
  stepLabel: string;
  title: string;
  body: string;
  image: StaticImageData;
  imageAlt: string;
  note?: string;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-950/40">
      <div className="border-b border-slate-200/90 px-4 py-3 dark:border-slate-800 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{stepLabel}</p>
        <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{body}</p>
        {note ? (
          <p className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50/80 px-3 py-2 text-sm leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100">
            {note}
          </p>
        ) : null}
      </div>
      <div className="bg-slate-50/60 p-3 dark:bg-slate-900/30 sm:p-4">
        <div
          className={cn(
            "relative mx-auto w-full overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900",
            "max-w-3xl",
          )}
        >
          <Image
            src={image}
            alt={imageAlt}
            className="h-auto w-full object-contain"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      </div>
    </article>
  );
}

export function ZohoIntegrationGuide() {
  const t = useTranslations("Dashboard.integrations.zohoIntegrationGuide");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t("intro")}</p>
      </header>

      <div className="space-y-5">
        {GUIDE_STEPS.map((step, index) => (
          <GuideStepCard
            key={step.id}
            stepLabel={t("stepLabel", { number: index + 1 })}
            title={t(step.titleKey)}
            body={t(step.bodyKey)}
            image={step.image}
            imageAlt={t(step.imageAltKey)}
            note={step.id === "success" ? t("mappingNote") : undefined}
          />
        ))}
      </div>

      <section className="rounded-xl border border-emerald-200/90 bg-emerald-50/70 px-4 py-4 dark:border-emerald-900/50 dark:bg-emerald-950/25 sm:px-5">
        <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">{t("finish.title")}</p>
        <p className="mt-2 text-sm leading-relaxed text-emerald-900/90 dark:text-emerald-100/90">{t("finish.body")}</p>
      </section>
    </div>
  );
}
