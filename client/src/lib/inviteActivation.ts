export function shouldOfferDirectActivation(isAuthenticated: boolean, currentEmail: string | null | undefined, invitedEmail: string) {
  return !isAuthenticated || currentEmail?.trim().toLowerCase() !== invitedEmail.trim().toLowerCase();
}
