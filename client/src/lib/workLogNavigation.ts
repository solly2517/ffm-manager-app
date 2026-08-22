export const WORK_LOG_PATH = "/work-log";

export function opensWorkLog(workspace: string) {
  return workspace === "plan" || workspace === "work-log";
}
