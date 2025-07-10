import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudentAnalytics } from "../StudentAnalytics";

// Mock the student progress analytics service
jest.mock("@/lib/services/student-progress-analytics", () => ({
  studentProgressAnalytics: {},
}));

describe("StudentAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the student analytics component", async () => {
    render(<StudentAnalytics />);

    // Check for main title
    expect(screen.getByText("Student Analytics")).toBeInTheDocument();
    expect(
      screen.getByText("Comprehensive analysis of student learning progress and engagement")
    ).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("displays key metrics cards", async () => {
    render(<StudentAnalytics />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Check for key metric cards
    expect(screen.getByText("Total Students")).toBeInTheDocument();
    expect(screen.getByText("Average Progress")).toBeInTheDocument();
    expect(screen.getByText("Attendance Rate")).toBeInTheDocument();
    expect(screen.getByText("Students at Risk")).toBeInTheDocument();
  });

  it("shows timeframe selection buttons", async () => {
    render(<StudentAnalytics />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Check for timeframe buttons
    expect(screen.getByRole("button", { name: "7 Days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 Days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "90 Days" })).toBeInTheDocument();
  });

  it("displays analytics tabs", async () => {
    render(<StudentAnalytics />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Check for analytics tabs
    expect(screen.getByRole("tab", { name: "Progress Analysis" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Performance Trends" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Course Analytics" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Risk Assessment" })).toBeInTheDocument();
  });

  it("allows switching between timeframes", async () => {
    const user = userEvent.setup();
    render(<StudentAnalytics />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Click on 7 Days button
    const sevenDaysButton = screen.getByRole("button", { name: "7 Days" });
    await user.click(sevenDaysButton);

    // The button should be selected/active
    expect(sevenDaysButton).toHaveClass("bg-primary");

    // Click on 90 Days button
    const ninetyDaysButton = screen.getByRole("button", { name: "90 Days" });
    await user.click(ninetyDaysButton);

    // The button should be selected/active
    expect(ninetyDaysButton).toHaveClass("bg-primary");
  });

  it("shows progress distribution chart", async () => {
    render(<StudentAnalytics />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show progress distribution section
    expect(screen.getByText("Progress Distribution")).toBeInTheDocument();
    expect(
      screen.getByText("How students are distributed across progress levels")
    ).toBeInTheDocument();
  });

  it("displays learning pace analysis", async () => {
    render(<StudentAnalytics />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show learning pace section
    expect(screen.getByText("Learning Pace Analysis")).toBeInTheDocument();
    expect(screen.getByText("Student distribution by learning speed")).toBeInTheDocument();
  });

  it("shows at-risk students information", async () => {
    const user = userEvent.setup();
    render(<StudentAnalytics />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Click on Risk Assessment tab
    await user.click(screen.getByRole("tab", { name: "Risk Assessment" }));

    // Should show risk assessment content
    expect(screen.getByText("Students at Risk Analysis")).toBeInTheDocument();
    expect(
      screen.getByText("Identification and categorization of at-risk students")
    ).toBeInTheDocument();
  });

  it("displays course analytics when tab is selected", async () => {
    const user = userEvent.setup();
    render(<StudentAnalytics />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Click on Course Analytics tab
    await user.click(screen.getByRole("tab", { name: "Course Analytics" }));

    // Should show course analytics content
    expect(screen.getByText("Course Popularity & Satisfaction")).toBeInTheDocument();
    expect(
      screen.getByText("Student enrollment and satisfaction by course type")
    ).toBeInTheDocument();
  });

  it("shows performance trends when tab is selected", async () => {
    const user = userEvent.setup();
    render(<StudentAnalytics />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Click on Performance Trends tab
    await user.click(screen.getByRole("tab", { name: "Performance Trends" }));

    // Should show performance trends content
    expect(screen.getByText("Performance Trends Over Time")).toBeInTheDocument();
    expect(screen.getByText("Progress, attendance, and engagement trends")).toBeInTheDocument();
  });
});