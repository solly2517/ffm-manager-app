import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ loading: false, isAuthenticated: true }),
}));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("@/components/LanguageSwitcher", () => ({ LanguageSwitcher: () => <span>Language selector</span> }));

import Help from "./Help";

describe("Arabic printable Help guide", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("switches the Help guide to Arabic and opens the browser print dialog", () => {
    vi.useFakeTimers();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<LanguageProvider><Help /></LanguageProvider>);

    expect(screen.getByRole("button", { name: "Print Arabic user guide" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Print Arabic user guide" }));
    expect(screen.getByText("كيف يمكننا مساعدتك؟")).toBeTruthy();
    vi.runAllTimers();
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
    vi.useRealTimers();
  });

  it("finds an Arabic Travel Expenses topic and filters the Help Center by category", () => {
    localStorage.setItem("ffm-language", "ar");
    render(<LanguageProvider><Help /></LanguageProvider>);

    fireEvent.change(screen.getByPlaceholderText("ابحث عن المصروفات أو خطة الزيارة أو التقرير…"), { target: { value: "مصروفات" } });
    expect(screen.getByText("تقديم مصروفات السفر")).toBeTruthy();
    expect(screen.queryByText("الزيارة والموقع")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("ابحث عن المصروفات أو خطة الزيارة أو التقرير…"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "العمل الميداني" }));
    expect(screen.getByText("خطة الزيارات والتقرير اليومي")).toBeTruthy();
    expect(screen.queryByText("تقديم مصروفات السفر")).toBeNull();
  });
});
