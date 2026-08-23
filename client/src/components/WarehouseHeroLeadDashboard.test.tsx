import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    operations: {
      warehouseHeroLeadActivity: { useQuery: () => ({ data: [], isLoading: false, error: null }) },
      exportWarehouseHeroLeadActivityCsv: { useQuery: () => ({ isFetching: false, error: null, refetch: vi.fn() }) },
    },
  },
}));

import { WarehouseHeroLeadDashboard } from "./WarehouseHeroLeadDashboard";

describe("WarehouseHeroLeadDashboard", () => {
  it("returns to the dashboard through the supplied navigation handler", () => {
    const onBack = vi.fn();
    render(<WarehouseHeroLeadDashboard onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Back to Dashboard" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
