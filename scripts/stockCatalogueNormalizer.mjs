const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const compactKey = (value) => clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
const limit = (value, length) => clean(value).slice(0, length);

const NON_IMPLANT_PATTERN = /\b(instrument|instruments|instrumentation|kit|kits|tray|case|drill|drilling|driver|guide|handle|holder|inserter|extractor|reamer|rasp|sizer|broach|wrench|bender|saw)\b/i;

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

export function normalizeStockCatalogue(catalogue, { sourceLabel = "AL-Tamam Stock Management embedded catalogue" } = {}) {
  const records = [];
  const seenCodes = new Set();
  const manufacturerCounts = new Map();
  const exclusions = { nonImplant: 0, invalidReference: 0, duplicateReference: 0 };
  let candidateReferences = 0;

  for (const [productLine, solutions] of Object.entries(catalogue ?? {})) {
    for (const [solution, families] of Object.entries(solutions ?? {})) {
      for (const [family, variants] of Object.entries(families ?? {})) {
        for (const variant of Array.isArray(variants) ? variants : []) {
          const specSummary = formatSpecs(variant.specs);
          const clinicalText = [productLine, solution, family, specSummary, variant.material].map(clean).filter(Boolean).join(" ");
          const referenceCodes = [variant.refSS, variant.refTIT].map(clean).filter(Boolean);
          candidateReferences += referenceCodes.length;
          if (NON_IMPLANT_PATTERN.test(clinicalText)) {
            exclusions.nonImplant += referenceCodes.length;
            continue;
          }
          for (const productCode of referenceCodes) {
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
            const exactName = [clean(family), specSummary].filter(Boolean).join(" — ");
            const description = [
              `Product line: ${clean(productLine)}`,
              `Solution: ${clean(solution)}`,
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
