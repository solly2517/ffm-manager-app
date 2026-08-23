import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useUnsavedFormGuard } from "./useUnsavedFormGuard";

function Harness({ dirty, onLeave }: { dirty: boolean; onLeave: () => void }) {
  const { requestLeave } = useUnsavedFormGuard(dirty, "Discard this handover draft?");
  return <button onClick={() => requestLeave(onLeave)}>Leave handover</button>;
}

describe("useUnsavedFormGuard", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });
  it("keeps an unsaved handover draft when the user declines leave confirmation", () => {
    const onLeave = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Harness dirty onLeave={onLeave}/>);
    fireEvent.click(screen.getByRole("button", { name: "Leave handover" }));
    expect(onLeave).not.toHaveBeenCalled();
  });
  it("allows leaving after confirmation or when no draft exists", () => {
    const confirmedLeave = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Harness dirty onLeave={confirmedLeave}/>);
    fireEvent.click(screen.getByRole("button", { name: "Leave handover" }));
    expect(confirmedLeave).toHaveBeenCalledTimes(1);
  });
});
