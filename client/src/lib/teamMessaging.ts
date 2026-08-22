export function canSendTeamMessage(recipientId: string, body: string, isPending = false) {
  return Boolean(recipientId && body.trim() && !isPending);
}

export function formatMemberRole(role: string) {
  return role.replaceAll("_", " ");
}
