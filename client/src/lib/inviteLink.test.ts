import { describe, expect, it } from "vitest";
import { buildPublicInviteLink, PUBLIC_FFM_ORIGIN } from "./inviteLink";

describe("public invitation links", () => {
  it("uses the public domain when created from a protected preview origin", () => {
    expect(buildPublicInviteLink({ origin: "https://3000-preview.manus.computer", hostname: "3000-preview.manus.computer" }, "/invite/token")).toBe(`${PUBLIC_FFM_ORIGIN}/invite/token`);
  });

  it("preserves the live public origin", () => {
    expect(buildPublicInviteLink({ origin: PUBLIC_FFM_ORIGIN, hostname: "ffmmanager-9wxfbeae.manus.space" }, "/invite/token")).toBe(`${PUBLIC_FFM_ORIGIN}/invite/token`);
  });
});
