import React from "react";
import { render, screen } from "@testing-library/react";
import { KPICard } from "../KPICard";
import { Users } from "lucide-react";

describe("KPICard", () => {
  it("renders with basic props", () => {
    render(
      <KPICard
        title="Total Users"
        value={150}
        description="Active users in the system"
      />
    );

    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("Active users in the system")).toBeInTheDocument();
  });

  it("renders with icon", () => {
    render(
      <KPICard
        title="Total Users"
        value={150}
        icon={Users}
      />
    );

    // Icon should be rendered
    const card = screen.getByText("Total Users").closest(".flex");
    expect(card?.querySelector("svg")).toBeInTheDocument();
  });

  it("renders with positive trend", () => {
    render(
      <KPICard
        title="Total Users"
        value={150}
        trend={{ value: 12.5, isPositive: true }}
      />
    );

    expect(screen.getByText("+12.5%")).toBeInTheDocument();
    expect(screen.getByText("+12.5%")).toHaveClass("text-green-600");
    expect(screen.getByText("from last month")).toBeInTheDocument();
  });

  it("renders with negative trend", () => {
    render(
      <KPICard
        title="Total Users"
        value={150}
        trend={{ value: 5.3, isPositive: false }}
      />
    );

    expect(screen.getByText("-5.3%")).toBeInTheDocument();
    expect(screen.getByText("-5.3%")).toHaveClass("text-red-600");
  });

  it("accepts custom className", () => {
    const { container } = render(
      <KPICard
        title="Total Users"
        value={150}
        className="custom-class"
      />
    );

    const card = container.querySelector(".custom-class");
    expect(card).toBeInTheDocument();
  });

  it("renders string values", () => {
    render(
      <KPICard
        title="Status"
        value="Active"
        description="System status"
      />
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});