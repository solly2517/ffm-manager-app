export type SidebarNavigationKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

export function getSidebarTargetIndex(currentIndex: number, itemCount: number, key: string): number | null {
  if (itemCount === 0 || currentIndex < 0 || currentIndex >= itemCount) return null;

  switch (key as SidebarNavigationKey) {
    case "ArrowDown":
      return Math.min(currentIndex + 1, itemCount - 1);
    case "ArrowUp":
      return Math.max(currentIndex - 1, 0);
    case "Home":
      return 0;
    case "End":
      return itemCount - 1;
    default:
      return null;
  }
}
