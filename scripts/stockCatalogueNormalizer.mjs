const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const compactKey = (value) => clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
const limit = (value, length) => clean(value).slice(0, length);

const NON_IMPLANT_PATTERN = /\b(instruments?|instrumentation|kits?|trays?|containers?|case|drill(?:ing)?|drill bits?|sleeves?|driver|screwdrivers?|guide|guide wires?|handles?|holders?|inserters?|extractors?|reamers?|rasps?|sizers?|broaches?|wrenches?|bender|saw|hammer|gauges?|forceps|coupling|aiming arm|depth gauges?|pin wrench|alignment tool|alignment rod|wheel lock|chisels?|calipers?|\bstands?\b|trocar)\b/i;
const IMPLANT_PATTERN = /\b(implant|plate|screw(?!driver)|nail(?!\s+(?:inserter|cutting|guide))|wire(?!\s+(?:guide|bender))|pin(?!\s+wrench)|stem|cup|liner|head|femoral|tibial|acetabular|glenoid|component|prosthesis|anchor|button|cage|rod|spacer|fixator|ring|clamp|strut|blade|bolt|bar|mesh|wedge|osteotomy|suture|ligament|tendon|interference)\b/i;

function productManufacturer(productLine) {
  return limit(clean(productLine).split(/[—-]/)[0], 180) || "AL-Tamam";
}

function formatSpecs(specs) {
  return Object.entries(specs ?? {})
    .map(([key, value]) => [clean(key), clean(value)])
    .filter(([key, value]) => key && value)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ");
}

function sourceFor(productLine, page, sourceLabel) {
  return limit(`${sourceLabel} | ${clean(productLine)}${Number.isFinite(Number(page)) ? ` | p. ${page}` : ""}`, 260);
}

function splitReference(rawReference) {
  const raw = clean(rawReference);
  const tokens = raw.split(" ").filter(Boolean);
  const labelIndex = tokens.findIndex((token, index) => index > 0 && /[a-z]/.test(token));
  if (labelIndex === -1) return { productCode: raw, referenceLabel: "" };
  return { productCode: tokens.slice(0, labelIndex).join(" "), referenceLabel: tokens.slice(labelIndex).join(" ") };
}

function clinicalFamilyName(family, referenceLabel, specs) {
  const normalizedFamily = clean(family);
  const note = clean(specs?.NOTE);
  const looksLikeReferenceOnly = /^(\(?MOI\b|[A-Z]{2,}\s*\d|[A-Z0-9-]+\s*[-_]\s*\d)/.test(normalizedFamily) || /^\([^)]*\)$/.test(normalizedFamily);
  if (referenceLabel && (looksLikeReferenceOnly || /^(general|cannulated|screws?)$/i.test(normalizedFamily))) return referenceLabel;
  if (note && (looksLikeReferenceOnly || /^(general|cannulated|screws?)$/i.test(normalizedFamily))) return note;
  return normalizedFamily || referenceLabel;
}

export function normalizeStockCatalogue(catalogue, { sourceLabel = "AL-Tamam Stock Management embedded catalogue" } = {}) {
  const records = [];
  const seenCodes = new Set();
  const manufacturerCounts = new Map();
  const exclusions = { nonImplant: 0, unsupportedProduct: 0, invalidReference: 0, duplicateReference: 0 };
  let candidateReferences = 0;

  for (const [productLine, solutions] of Object.entries(catalogue ?? {})) {
    for (const [solution, families] of Object.entries(solutions ?? {})) {
      for (const [family, variants] of Object.entries(families ?? {})) {
        for (const variant of Array.isArray(variants) ? variants : []) {
          const specSummary = formatSpecs(variant.specs);
          const references = [variant.refSS, variant.refTIT].map(splitReference).filter((reference) => reference.productCode);
          candidateReferences += references.length;
          for (const reference of references) {
            const productCode = reference.productCode;
            const productName = clinicalFamilyName(family, reference.referenceLabel, variant.specs);
            const clinicalText = [productLine, solution, family, productName, reference.referenceLabel, specSummary, variant.material].map(clean).filter(Boolean).join(" ");
            if (NON_IMPLANT_PATTERN.test(clinicalText)) {
              exclusions.nonImplant += 1;
              continue;
            }
            if (!IMPLANT_PATTERN.test(clinicalText)) {
              exclusions.unsupportedProduct += 1;
              continue;
            }
            const codeKey = compactKey(productCode);
            if (!codeKey || productCode.length > 160) {
              exclusions.invalidReference += 1;
              continue;
            }
            if (seenCodes.has(codeKey)) {
              exclusions.duplicateReference += 1;
              continue;
            }
            seenCodes.add(codeKey);
            const manufacturer = productManufacturer(productLine);
            const exactName = [productName, specSummary].filter(Boolean).join(" — ");
            const description = [
              `Product line: ${clean(productLine)}`,
              `Solution: ${clean(solution)}`,
              `Exact reference: ${productCode}`,
              specSummary && `Specifications: ${specSummary}`,
              clean(variant.material) && `Material: ${clean(variant.material)}`,
              Number.isFinite(Number(variant.page)) && `Source page: ${variant.page}`,
            ].filter(Boolean).join(" | ");
            records.push({
              name: limit(exactName || family, 220),
              manufacturer,
              productCode: limit(productCode, 160),
              description: limit(description, 2000),
              source: sourceFor(productLine, variant.page, sourceLabel),
            });
            manufacturerCounts.set(manufacturer, (manufacturerCounts.get(manufacturer) ?? 0) + 1);
          }
        }
      }
    }
  }

  const report = {
    sourceLabel,
    candidateReferences,
    validRecords: records.length,
    exclusions,
    manufacturerCounts: Object.fromEntries([...manufacturerCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
  };
  return { records, report };
}

export function normalizeProductCode(value) {
  return compactKey(value);
}
