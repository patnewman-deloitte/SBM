import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import AcquisitionDemoApp from "../AcquisitionDemoApp";

type RenderResult = ReturnType<typeof render>;

const setup = (): RenderResult => render(<AcquisitionDemoApp />);

const exportFromRadar = async () => {
  setup();
  const button = await screen.findByTestId("export-market-to-studio");
  fireEvent.click(button);
  await waitFor(() => {
    expect(window.location.hash).toMatch(/#\/studio\//);
  });
};

describe("Acquisition demo shell", () => {
  beforeEach(() => {
    window.location.hash = "#/radar";
    window.localStorage.clear();
    document.body.innerHTML = "";
  });

  it("renders Market Radar summary", () => {
    setup();
    expect(screen.getByText(/How to use Market Radar/i)).toBeInTheDocument();
  });

  it("switches to map view when tab clicked", () => {
    setup();
    fireEvent.click(screen.getByRole("tab", { name: "Map" }));
    expect(screen.getByRole("img", { name: /US opportunity map/i })).toBeInTheDocument();
  });

  it("exports to Segment Studio and hydrates read-in payload", async () => {
    await exportFromRadar();
    expect(await screen.findByText(/Segment Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Window: 13w/i)).toBeInTheDocument();
    expect(screen.getAllByText(/AIPIC cohort/i)[0]).toBeInTheDocument();
    expect(screen.getByTestId("net-eligible").textContent).toContain("210");
  });

  it("updates net eligible and readiness when tuning studio controls", async () => {
    await exportFromRadar();
    await screen.findByText(/Rules builder/i);
    const netValue = screen.getByTestId("net-eligible").textContent ?? "";
    const includeInput = screen.getByPlaceholderText("Add include");
    fireEvent.change(includeInput, { target: { value: "Lifecycle" } });
    fireEvent.keyDown(includeInput, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByTestId("net-eligible").textContent).not.toBe(netValue);
    });
    const readiness = screen.getByTestId("readiness-score").textContent ?? "";
    fireEvent.click(screen.getByLabelText("Contact permissions"));
    await waitFor(() => {
      expect(screen.getByTestId("readiness-score").textContent).not.toBe(readiness);
    });
    const afterInclude = screen.getByTestId("net-eligible").textContent ?? "";
    fireEvent.click(screen.getByLabelText("Dedup grain person"));
    await waitFor(() => {
      expect(screen.getByTestId("net-eligible").textContent).not.toBe(afterInclude);
    });
  });

  it("shows destination counts responding to holdout slider", async () => {
    await exportFromRadar();
    await screen.findByText(/Destinations preview/i);
    const beforeEmail = screen.getByTestId("dest-email").textContent ?? "";
    const holdout = screen.getByLabelText("Holdout slider");
    fireEvent.change(holdout, { target: { value: "15" } });
    await waitFor(() => {
      expect(screen.getByTestId("dest-email").textContent).not.toBe(beforeEmail);
    });
  });
});
