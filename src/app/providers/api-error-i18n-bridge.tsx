"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { setApiErrorTextResolver } from "@/core/errors/api-error-text";

export function ApiErrorI18nBridge() {
  const t = useTranslations("ApiErrors");

  useEffect(() => {
    setApiErrorTextResolver(({ errorCode, message }) => {
      if (errorCode && t.has(errorCode)) {
        return t(errorCode);
      }
      if (message?.trim()) {
        return message.trim();
      }
      return t("fallback");
    });

    return () => setApiErrorTextResolver(null);
  }, [t]);

  return null;
}
