import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";
import MarketRadarTab from "../marketRadar/MarketRadarTab";

const setup = () => render(<MarketRadarTab />);

describe("MarketRadarTab", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders without crash and shows summary", () => {
    setup();
    expect(screen.getByText(/How to use Market Radar/i)).toBeInTheDocument();
  });

  it("switches to map tab when clicked", () => {
    setup();
    const mapTab = screen.getByRole("tab", { name: "Map" });
    fireEvent.click(mapTab);
    expect(screen.getByRole("img", { name: /US opportunity map/i })).toBeInTheDocument();
  });

  it("updates key metrics when selecting a new archetype bubble", async () => {
    setup();
    const targetBubble = await screen.findByRole("button", { name: /Hybrid HQs bubble/i });
    fireEvent.click(targetBubble);
    await waitFor(() => {
      expect(screen.getByText("150k")).toBeInTheDocument();
    });
  });

  it("toggles more metrics visibility", () => {
    setup();
    const toggle = screen.getByRole("button", { name: /More metrics/i });
    fireEvent.click(toggle);
    expect(screen.getByText(/ARPU delta/i)).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText(/ARPU delta/i)).not.toBeInTheDocument();
  });

  it("opens competitive drawer with ranked bars", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /See all/i }));
    const drawer = screen.getByRole("dialog", { name: /Competitive landscape/i });
    const firstEntry = within(drawer).getAllByText(/%/i)[0];
    expect(firstEntry.textContent).toContain("%");
    expect(within(drawer).getByText(/Top threat/i)).toBeInTheDocument();
  });

  it("opens details drawer with micro segments", async () => {
    setup();
    fireEvent.click(screen.getAllByRole("button", { name: "View" })[0]);
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /micro-segments/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/Global CS pods/i)).toBeInTheDocument();
  });
});
