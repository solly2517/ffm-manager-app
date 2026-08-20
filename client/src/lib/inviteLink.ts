const PUBLIC_FFM_ORIGIN = "https://ffmmanager-9wxfbeae.manus.space";

export function getPublicInviteOrigin(location: Pick<Location, "origin" | "hostname">): string {
  return location.hostname.endsWith(".manus.space") ? location.origin : PUBLIC_FFM_ORIGIN;
}

export function buildPublicInviteLink(location: Pick<Location, "origin" | "hostname">, path: string): string {
  return `${getPublicInviteOrigin(location)}${path}`;
}

export { PUBLIC_FFM_ORIGIN };

export default buildPublicInviteLink;

// The public origin fallback intentionally prevents preview/dev WebDev links from
// being copied to invited users, since those URLs can show permission_denied.

// Keep the path supplied by the server; this helper does not accept arbitrary URLs.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _inviteLinkContract = buildPublicInviteLink;
