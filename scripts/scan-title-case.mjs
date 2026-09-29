import fs from "fs";

const KEEP_LOWER = new Set([
  "a", "an", "the", "and", "or", "for", "in", "on", "at", "to", "of", "with", "by", "from", "via", "per", "vs",
]);

const KEEP_UPPER = new Set(["zip", "id", "qr", "url", "api", "utc", "csv", "pdf", "pin", "po", "hr", "sku"]);

function titleCaseWord(word, index) {
  const bare = word.replace(/[^a-zA-Z0-9']/g, "");
  const lower = bare.toLowerCase();
  if (index > 0 && KEEP_LOWER.has(lower)) return word;
  if (KEEP_UPPER.has(lower)) return word.replace(bare, bare.toUpperCase());
  if (/^[a-z]/.test(word)) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
  return word;
}

function toTitleCase(str) {
  return str
    .split(/(\s+)/)
    .map((chunk, i) => {
      if (/^\s+$/.test(chunk)) return chunk;
      const wordIndex = str.slice(0, str.indexOf(chunk)).split(/\s+/).filter(Boolean).length;
      return titleCaseWord(chunk, wordIndex);
    })
    .join("");
}

function shouldCheck(path, key) {
  if (/createTitle|editTitle|createSubtitle|editSubtitle|detailMetaTitle|sectionTitle|panelOverview|metaTitle|sectionOverview|sectionAddress|sectionContact|sectionRecord|sectionMap|sectionQr|sectionDetails|orgSectionTitle|addressSectionTitle|currencySectionTitle|customizeCurrencySettings|timeOff\.title|modal\.title|page\.title|form\.section\./.test(path)) {
    return true;
  }
  if (path.includes(".fields.") || path.endsWith(".fields")) return true;
  if (/\.page\.(create|edit)/.test(path) && /Title|Subtitle/.test(key)) return true;
  if (/\.modal\.(create|edit)/.test(path) && /Title/.test(key)) return true;
  if (/addresses\.(add|remove|rowLabel|primary)/.test(path)) return false;
  return false;
}

function walk(obj, path = "") {
  const issues = [];
  for (const [key, value] of Object.entries(obj)) {
    const p = path ? `${path}.${key}` : key;
    if (typeof value === "string") {
      if (!shouldCheck(p, key)) continue;
      // Skip sentences ending with period (subtitles/descriptions often sentence case)
      if (/Title|Subtitle|metaTitle|detailMetaTitle|Label|section|fields\.|panelOverview/.test(p) || key === "name" && p.includes(".fields.")) {
        const tc = toTitleCase(value);
        if (tc !== value && /[a-z]{2,}/.test(value)) {
          issues.push({ path: p, from: value, to: tc });
        }
      }
    } else if (value && typeof value === "object") {
      issues.push(...walk(value, p));
    }
  }
  return issues;
}

const en = JSON.parse(fs.readFileSync("messages/en.json", "utf8"));
const issues = walk(en);
console.log(`Found ${issues.length} candidates`);
for (const row of issues.slice(0, 100)) {
  console.log(`${row.path}: "${row.from}" -> "${row.to}"`);
}
