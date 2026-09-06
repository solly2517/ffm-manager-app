// Builds an invite link using wherever the app is actually running. There's
// no separate "preview vs production" domain outside Manus's environment,
// so the current origin is always the right one to use.
export function getPublicInviteOrigin(location: Pick<Location, "origin" | "hostname">): string {
  return location.origin;
}

export function buildPublicInviteLink(location: Pick<Location, "origin" | "hostname">, path: string): string {
  return `${getPublicInviteOrigin(location)}${path}`;
}

export default buildPublicInviteLink;
