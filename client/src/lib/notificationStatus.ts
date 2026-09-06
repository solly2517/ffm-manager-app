export function notificationStatusText(unreadCount: number) {
  return unreadCount > 0
    ? `${unreadCount} unread alert${unreadCount === 1 ? "" : "s"}`
    : "All operational alerts are marked as read";
}
