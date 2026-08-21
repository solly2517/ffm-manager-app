export const OFFICIAL_FFM_BACKUP_URL = "https://manus.im/backup";
export const GOOGLE_DRIVE_FFM_BACKUPS_FOLDER_URL = "https://drive.google.com/drive/folders/1-bkRfhqNqzwzG9lw08Ub8bDf-RGvVE55";

export function canAccessFfmBackup(isAdministrator: boolean) {
  return isAdministrator;
}
