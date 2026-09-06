// Validates a "return to this page after signing in" path so it can't be
// used to redirect off-site (open-redirect protection). Only same-site,
// root-relative paths are allowed; anything else falls back to "/".
export function safeOAuthReturnTo(returnTo: string | undefined | null): string {
  if (!returnTo) return "/";
  if (!returnTo.startsWith("/")) return "/";
  if (returnTo.startsWith("//")) return "/";
  return returnTo;
}
