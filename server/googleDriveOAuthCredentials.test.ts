import { describe, expect, it } from "vitest";

describe("Google Drive OAuth credentials", () => {
  it("are accepted by Google’s token endpoint without exposing the client secret", async () => {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

    expect(clientId, "GOOGLE_DRIVE_CLIENT_ID must be configured").toBeTruthy();
    expect(clientSecret, "GOOGLE_DRIVE_CLIENT_SECRET must be configured").toBeTruthy();

    const body = new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      code: "ffm-credential-probe",
      grant_type: "authorization_code",
      redirect_uri: "https://ffmmanager-9wxfbeae.manus.space/api/oauth/google-drive/callback",
    });
    const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
    const payload = await response.json() as { error?: string };

    expect(payload.error).not.toBe("invalid_client");
    expect(payload.error).toBe("invalid_grant");
  }, 20_000);
});
