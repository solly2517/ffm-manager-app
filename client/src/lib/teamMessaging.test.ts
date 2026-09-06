import { describe, expect, it } from "vitest";
import { canSendTeamMessage, formatMemberRole } from "./teamMessaging";

describe("Delegate team messaging", () => {
  it("allows a Delegate to send a non-empty message to any selected team recipient", () => {
    expect(canSendTeamMessage("8250133", "Please review today's visit.")).toBe(true);
  });

  it("blocks only incomplete or currently sending messages", () => {
    expect(canSendTeamMessage("", "Hello")).toBe(false);
    expect(canSendTeamMessage("30001", "   ")).toBe(false);
    expect(canSendTeamMessage("30001", "Hello", true)).toBe(false);
  });

  it("formats all team role labels clearly", () => {
    expect(formatMemberRole("warehouse_hero")).toBe("warehouse hero");
    expect(formatMemberRole("delegate")).toBe("delegate");
  });
});
