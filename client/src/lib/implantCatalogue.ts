export function getCatalogueSearchInput(value: string): { query: string } | undefined {
  const query = value.trim();
  return query.length >= 2 ? { query } : undefined;
}
