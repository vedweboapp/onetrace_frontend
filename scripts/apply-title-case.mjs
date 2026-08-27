import fs from "fs";

const KEEP_UPPER = new Set(["zip", "id", "qr", "url", "api", "utc", "csv", "pdf", "pin", "po", "hr", "sku", "vat"]);

function toTitleCase(str) {
  return str.replace(/\S+/g, (word) => {
    const match = word.match(/^([^a-zA-Z0-9']*)([a-zA-Z0-9']+)(.*)$/);
    if (!match) return word;
    const [, prefix, bare, suffix] = match;
    const lower = bare.toLowerCase();
    const cased = KEEP_UPPER.has(lower)
      ? bare.toUpperCase()
      : bare.charAt(0).toUpperCase() + bare.slice(1);
    return `${prefix}${cased}${suffix}`;
  });
}

function shouldSkip(path, key, value) {
  if (/^(HomePage|Auth)\./.test(path)) return true;
  if (/Subtitle|Hint|hint|placeholder|Description|description|help|message|emptyDescription|notFoundDescription|deleteConfirmDescription|pageLabel|stepLabel|requiredHighlightLegend|map\.(loading|noAddress|notFound|error)|filtersLoading|loadingClients|noClients|notModifiedYet|requiredField|backToList|body|guide|toggleSection|mappingDescription|hubDescription|aria[A-Z]|openFullMapAria|breadcrumbNav|subtitle/i.test(path)) {
    return true;
  }
  if (/\.actions\.(save|cancel|delete|confirm|retry|export|edit|add)$/.test(path)) return true;
  if (value.endsWith(".") && value.length > 40) return true;
  if (value.includes("…") || value.includes("...")) return true;
  if (/\{[a-z]+\}/.test(value)) return true;
  return false;
}

function shouldTitleCase(path, key) {
  if (/\.fields\.|\.address\.|\.table\.|\.card\.|\.columns\./.test(path)) return true;
  if (/\.common\.detail\./.test(path)) return true;
  if (/createTitle|editTitle|detailMetaTitle|metaTitle|pageTitle|emptyTitle|sectionTitle|SectionTitle|panelOverview|sectionOverview|sectionAddress|sectionContact|sectionRecord|sectionMap|sectionQr|sectionDetails|orgSectionTitle|addressSectionTitle|currencySectionTitle|customizeCurrencySettings|deleteConfirmTitle|connectionDetailsTitle|webhookTitle|resourceValuesTitle|mappingPageTitle|webhookPageTitle|selectProjectTitleTitle|guideTitle|headerTitle|mappingNoteTitle|recordNotFoundTitle|loadErrorTitle|systemMetadata|createdAt|updatedAt|createdBy|modifiedBy/.test(path)) return true;
  if (/\.page\.(create|edit)Title$|\.modal\.(create|edit)Title$/.test(path)) return true;
  if (/timeOff\.title$/.test(path)) return true;
  if (/\.detail\.section/.test(path)) return true;
  if (/\.addresses\.(add|remove|rowLabel)$/.test(path)) return true;
  if (/\.sidebar\.(nav|add)\./.test(path)) return true;
  if (/Label$/.test(key) && !/previewLabel|pageLabel|stepLabel|idLabel|otpLabel|heroTitle|Placeholder/.test(key)) return true;
  if (/\.tabs\./.test(path) && !/description/.test(path)) return true;
  if (/\.publicPin\.|\.publicQr\./.test(path)) return true;
  if (/\.nav\./.test(path)) return true;
  return false;
}

function walkAndFix(obj, path = "") {
  let count = 0;
  for (const [key, value] of Object.entries(obj)) {
    const p = path ? `${path}.${key}` : key;
    if (typeof value === "string") {
      if (!shouldSkip(p, key, value) && shouldTitleCase(p, key)) {
        const tc = toTitleCase(value);
        if (tc !== value) {
          obj[key] = tc;
          count += 1;
        }
      }
    } else if (value && typeof value === "object") {
      count += walkAndFix(value, p);
    }
  }
  return count;
}

const enPath = "messages/en.json";
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const changed = walkAndFix(en);
fs.writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`, "utf8");
console.log(`Updated ${changed} strings in ${enPath}`);
