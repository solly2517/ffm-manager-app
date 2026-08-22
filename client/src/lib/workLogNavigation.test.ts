import { describe, expect, it } from "vitest";
import { opensWorkLog, WORK_LOG_PATH } from "./workLogNavigation";

describe("Work Log navigation", () => {
  it("routes the Delegate Work Log tab to the Work Log workspace", () => {
    expect(opensWorkLog("plan")).toBe(true);
    expect(WORK_LOG_PATH).toBe("/work-log");
  });

  it("routes the Manager Work Log sidebar entry to the Work Log workspace", () => {
    expect(opensWorkLog("work-log")).toBe(true);
  });

  it("leaves normal operational workspaces in place", () => {
    expect(opensWorkLog("profile")).toBe(false);
    expect(opensWorkLog("messages")).toBe(false);
  });
});
