"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { setApiErrorTextResolver } from "@/core/errors/api-error-text";

export function ApiErrorI18nBridge() {
  const t = useTranslations("ApiErrors");

  useEffect(() => {
    setApiErrorTextResolver(({ errorCode, message, errors }) => {
      const errs = (errors ?? []).map((e) => e.trim()).filter(Boolean);
      const specificErrors = errs.filter(
        (e) => !/^(Validation failed|Request failed|An error occurred|Bad Request|Error)$/i.test(e),
      );

      if (specificErrors.length > 0) {
        return specificErrors.join("\n");
      }

      if (errorCode && t.has(errorCode)) {
        return t(errorCode);
      }

      if (message?.trim() && !/^(Validation failed|Request failed|An error occurred|Bad Request|Error)$/i.test(message.trim())) {
        return message.trim();
      }

      if (errs.length > 0) {
        return errs.join("\n");
      }

      return t("fallback");
    });

    return () => setApiErrorTextResolver(null);
  }, [t]);

  return null;
}
