import { describe, expect, it } from "vitest";
import { formatFfmDate } from "./ffmDate";

describe("formatFfmDate", () => {
  it("uses an explicit separator-based dd/MM/yyyy label independently of mobile locale", () => {
    expect(formatFfmDate("2026-08-23T12:00:00.000Z")).toBe("23/08/2026");
  });
});
