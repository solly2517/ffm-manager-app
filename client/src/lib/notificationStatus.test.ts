import { describe, expect, it } from "vitest";
import { notificationStatusText } from "./notificationStatus";

describe("notificationStatusText", () => {
  it("confirms that a zero-unread notification state is already read", () => {
    expect(notificationStatusText(0)).toBe("All operational alerts are marked as read");
  });

  it("uses clear singular and plural unread labels", () => {
    expect(notificationStatusText(1)).toBe("1 unread alert");
    expect(notificationStatusText(2)).toBe("2 unread alerts");
  });
});
