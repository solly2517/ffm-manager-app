import { describe, expect, it } from "vitest";
import { canAccessFfmBackup, OFFICIAL_FFM_BACKUP_URL } from "./backupAccess";

describe("Administrator backup access", () => {
  it("exposes the official backup entry point only to Administrators", () => {
    expect(canAccessFfmBackup(true)).toBe(true);
    expect(canAccessFfmBackup(false)).toBe(false);
    expect(OFFICIAL_FFM_BACKUP_URL).toBe("https://manus.im/backup");
  });
});
