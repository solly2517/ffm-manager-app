export function isJsonContentType(contentType: string | null): boolean {
  return Boolean(contentType && contentType.toLowerCase().includes("application/json"));
}

export async function responseDiagnostic(response: Response): Promise<{ message: string; route?: string }> {
  if (isJsonContentType(response.headers.get("content-type"))) return { message: "" };
  const snippet = (await response.clone().text()).replace(/\s+/g, " ").slice(0, 240);
  return { message: `API returned non-JSON response (${response.status}): ${snippet}` };
}
