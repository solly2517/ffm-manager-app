export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Navigate to the local sign-in page. Kept as a function (not a plain link)
// so every call site that used to kick off the old OAuth redirect keeps
// working without changes.
export const startLogin = (returnTo?: string) => {
  const safeReturnTo = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined;
  const url = safeReturnTo ? `/login?returnTo=${encodeURIComponent(safeReturnTo)}` : "/login";
  window.location.href = url;
};
