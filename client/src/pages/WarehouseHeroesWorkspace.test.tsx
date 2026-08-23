import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exportRefetch: vi.fn(),
}));

vi.mock("@/components/Map", () => ({
  MapView: () => <div data-testid="map-placeholder" />,
}));

vi.mock("@/lib/trpc", () => {
  const emptyQuery = { data: [], isLoading: false, error: null, isFetching: false, refetch: vi.fn() };
  const idleMutation = { isPending: false, error: null, mutate: vi.fn() };
  return {
    trpc: {
      operations: {
        warehouseHeroes: { useQuery: () => emptyQuery },
        warehouseHeroLocations: { useQuery: () => emptyQuery },
        warehouseDeliveryProofs: { useQuery: () => emptyQuery },
        exportWarehouseDeliveryProofsCsv: { useQuery: () => ({ ...emptyQuery, refetch: mocks.exportRefetch }) },
        warehouseHandovers: { useQuery: () => emptyQuery },
        acknowledgeWarehouseHandover: { useMutation: () => idleMutation },
      },
      admin: {
        managers: { useQuery: () => emptyQuery },
        warehouseHeroes: { useQuery: () => emptyQuery },
        managerWarehouseHeroAssignments: { useQuery: () => emptyQuery },
        assignWarehouseHero: { useMutation: () => idleMutation },
        unassignWarehouseHero: { useMutation: () => idleMutation },
        createInvitation: { useMutation: () => idleMutation },
      },
    },
  };
});

import { WarehouseHeroesWorkspace } from "./WarehouseHeroesWorkspace";

describe("WarehouseHeroesWorkspace delivery-proof export", () => {
  beforeEach(() => {
    mocks.exportRefetch.mockReset();
  });

  it("renders visible retry feedback when the Manager delivery-proof CSV export request fails", async () => {
    mocks.exportRefetch.mockResolvedValue({ data: undefined, error: { message: "Export service is temporarily unavailable" } });
    render(<WarehouseHeroesWorkspace isAdmin={false} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    await waitFor(() => expect(screen.getByText("Export service is temporarily unavailable")).toBeTruthy());
    expect(mocks.exportRefetch).toHaveBeenCalledTimes(1);
  });

  it("uses the supplied navigation handler when returning from the logistics workspace", () => {
    const onBack = vi.fn();
    const view = render(<WarehouseHeroesWorkspace isAdmin={false} onBack={onBack} />);

    fireEvent.click(within(view.container).getByRole("button", { name: "Back to dashboard" }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
