import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider, useLanguage } from "./LanguageContext";

function LanguageProbe() {
  const { language, isRtl, setLanguage, t } = useLanguage();
  return (
    <div>
      <p>{`${language}:${isRtl}`}</p>
      <p>{t("dashboard")}</p>
      <button type="button" onClick={() => setLanguage("ar")}>Arabic</button>
      <button type="button" onClick={() => setLanguage("en")}>English</button>
    </div>
  );
}

describe("LanguageProvider", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  });

  it("defaults to English and sets left-to-right document metadata", async () => {
    render(<LanguageProvider><LanguageProbe /></LanguageProvider>);

    expect(screen.getByText("en:false")).toBeTruthy();
    expect(screen.getByText("Dashboard")).toBeTruthy();
    await waitFor(() => {
      expect(document.documentElement.lang).toBe("en");
      expect(document.documentElement.dir).toBe("ltr");
    });
  });

  it("persists Arabic and switches document direction to right-to-left", async () => {
    render(<LanguageProvider><LanguageProbe /></LanguageProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Arabic" }));

    expect(screen.getByText("ar:true")).toBeTruthy();
    expect(screen.getByText("لوحة التحكم")).toBeTruthy();
    await waitFor(() => {
      expect(localStorage.getItem("ffm-language")).toBe("ar");
      expect(document.documentElement.lang).toBe("ar");
      expect(document.documentElement.dir).toBe("rtl");
    });
  });
});
