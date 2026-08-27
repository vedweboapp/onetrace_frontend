"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { setApiErrorTextResolver } from "@/core/errors/api-error-text";
import {
  API_ERROR_ENTITY_KEYS,
  API_ERROR_FIELD_KEYS,
  API_ERROR_MESSAGE_KEYS,
  normalizeApiErrorMessageForLookup,
  setApiErrorMessageLocalizer,
} from "@/core/errors/api-error-localize.util";

const GENERIC_PHRASE_RE =
  /^(Validation failed|Request failed|An error occurred|Bad Request|Error)$/i;

const ENTITY_FIELD_EXISTS_RE =
  /^(.+?)\s+with this\s+(.+?)\s+already exists$/i;

/**
 * Wires next-intl `ApiErrors` into toast + form field error display so backend
 * English strings follow Appearance → Language (en / es).
 */
export function ApiErrorI18nBridge() {
  const t = useTranslations("ApiErrors");

  useEffect(() => {
    const localizeLine = (raw: string): string => {
      const trimmed = raw.trim();
      if (!trimmed) return trimmed;

      const normalized = normalizeApiErrorMessageForLookup(trimmed);
      const exactKey = API_ERROR_MESSAGE_KEYS[normalized];
      if (exactKey && t.has(`messages.${exactKey}`)) {
        return t(`messages.${exactKey}`);
      }

      const existsMatch = ENTITY_FIELD_EXISTS_RE.exec(normalized);
      if (existsMatch && t.has("messages.entityFieldExists")) {
        const entityRaw = existsMatch[1].trim().toLowerCase();
        const fieldRaw = existsMatch[2].trim().toLowerCase();
        const entityKey = API_ERROR_ENTITY_KEYS[entityRaw];
        const fieldKey = API_ERROR_FIELD_KEYS[fieldRaw];
        const entity =
          entityKey && t.has(`entities.${entityKey}`)
            ? t(`entities.${entityKey}`)
            : existsMatch[1].trim();
        const field =
          fieldKey && t.has(`fields.${fieldKey}`)
            ? t(`fields.${fieldKey}`)
            : existsMatch[2].trim();
        return t("messages.entityFieldExists", { entity, field });
      }

      return trimmed;
    };

    setApiErrorMessageLocalizer(localizeLine);

    setApiErrorTextResolver(({ errorCode, message, errors }) => {
      const errs = (errors ?? []).map((e) => e.trim()).filter(Boolean);
      const specificErrors = errs.filter((e) => !GENERIC_PHRASE_RE.test(e));

      if (specificErrors.length > 0) {
        return specificErrors.map(localizeLine).join("\n");
      }

      if (errorCode && t.has(errorCode)) {
        return t(errorCode);
      }

      if (message?.trim() && !GENERIC_PHRASE_RE.test(message.trim())) {
        return localizeLine(message.trim());
      }

      if (errs.length > 0) {
        return errs.map(localizeLine).join("\n");
      }

      return t("fallback");
    });

    return () => {
      setApiErrorMessageLocalizer(null);
      setApiErrorTextResolver(null);
    };
  }, [t]);

  return null;
}
