import { describe, expect, it } from "vitest";
import { buildGoogleDriveAuthorizationUrl, decryptGoogleRefreshToken, encryptGoogleRefreshToken, GOOGLE_DRIVE_CALLBACK_URL } from "./googleDriveBackup";

describe("Google Drive backup security", () => {
  it("encrypts stored refresh tokens and targets the authorized FFM callback", () => {
    const encrypted = encryptGoogleRefreshToken("refresh-token-for-test-only");
    expect(encrypted).not.toContain("refresh-token-for-test-only");
    expect(decryptGoogleRefreshToken(encrypted)).toBe("refresh-token-for-test-only");
    const url = buildGoogleDriveAuthorizationUrl("state-value");
    expect(url).toContain(encodeURIComponent(GOOGLE_DRIVE_CALLBACK_URL));
    expect(url).toContain("drive.file");
  });
});
