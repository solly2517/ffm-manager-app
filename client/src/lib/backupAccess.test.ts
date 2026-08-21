import { describe, expect, it } from "vitest";
import { canAccessFfmBackup, GOOGLE_DRIVE_FFM_BACKUPS_FOLDER_URL, OFFICIAL_FFM_BACKUP_URL } from "./backupAccess";

describe("Administrator backup access", () => {
  it("exposes the official backup entry point only to Administrators", () => {
    expect(canAccessFfmBackup(true)).toBe(true);
    expect(canAccessFfmBackup(false)).toBe(false);
    expect(OFFICIAL_FFM_BACKUP_URL).toBe("https://manus.im/backup");
    expect(GOOGLE_DRIVE_FFM_BACKUPS_FOLDER_URL).toContain("drive.google.com/drive/folders/");
  });
});
