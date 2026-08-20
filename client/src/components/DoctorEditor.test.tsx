import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DoctorEditor } from "./DoctorEditor";

describe("DoctorEditor", () => {
  it("loads and submits an existing non-new relationship unchanged", () => {
    const onSave = vi.fn();
    render(<DoctorEditor doctor={{ id: 12, clientId: 2, name: "Dr. Warm", specialty: "Cardiology", relationship: "warm" }} clients={[{ id: 2, name: "City Hospital" }]} onSave={onSave} />);
    expect((screen.getByRole("combobox", { name: "Doctor relationship" }) as HTMLSelectElement).value).toBe("warm");
    fireEvent.click(screen.getByRole("button", { name: "Update doctor" }));
    expect(onSave).toHaveBeenCalledWith({ id: 12, clientId: 2, name: "Dr. Warm", specialty: "Cardiology", relationship: "warm" });
  });
});
