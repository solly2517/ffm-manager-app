export const OFFICIAL_FFM_BACKUP_URL = "https://manus.im/backup";

export function canAccessFfmBackup(isAdministrator: boolean) {
  return isAdministrator;
}
