import { describe, expect, it } from "vitest";
import { buildPublicInviteLink } from "./inviteLink";

describe("public invitation links", () => {
  it("uses the current origin the app is running on", () => {
    expect(buildPublicInviteLink({ origin: "https://ffm.example.com", hostname: "ffm.example.com" }, "/invite/token")).toBe("https://ffm.example.com/invite/token");
  });

  it("works for any deployed domain, not just one hardcoded origin", () => {
    expect(buildPublicInviteLink({ origin: "https://staging.ffm.example.com", hostname: "staging.ffm.example.com" }, "/invite/token")).toBe("https://staging.ffm.example.com/invite/token");
  });
});
