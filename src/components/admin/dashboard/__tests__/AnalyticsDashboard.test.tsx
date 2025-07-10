import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalyticsDashboard } from "../AnalyticsDashboard";

// Mock the analytics services
jest.mock("@/lib/services/class-efficiency-analytics", () => ({
  classEfficiencyAnalytics: {
    getClassEfficiencyMetrics: jest.fn().mockResolvedValue({
      utilization: {
        overallUtilization: 78.5,
      },
      efficiency: {
        attendanceEfficiency: 87.2,
      },
      revenue: {
        revenuePerHour: 125,
      },
      optimization: {
        overallOptimizationScore: 82.3,
      },
    }),
  },
}));

jest.mock("@/lib/services/teacher-performance-analytics", () => ({
  teacherPerformanceAnalytics: {},
}));

jest.mock("@/lib/services/student-progress-analytics", () => ({
  studentProgressAnalytics: {},
}));

describe("AnalyticsDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the analytics dashboard with main sections", async () => {
    render(<AnalyticsDashboard />);

    // Check for main title
    expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
    expect(
      screen.getByText("Comprehensive insights into student progress, teacher performance, and system analytics")
    ).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading analytics...")).not.toBeInTheDocument();
    });

    // Check for KPI cards
    expect(screen.getByText("Total Students")).toBeInTheDocument();
    expect(screen.getByText("Total Teachers")).toBeInTheDocument();
    expect(screen.getByText("System Utilization")).toBeInTheDocument();
    expect(screen.getByText("Monthly Revenue")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    render(<AnalyticsDashboard />);
    expect(screen.getByText("Loading analytics...")).toBeInTheDocument();
  });

  it("displays tabs for different analytics sections", async () => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.queryByText("Loading analytics...")).not.toBeInTheDocument();
    });

    // Check for analytics tabs
    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Student Analytics" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Teacher Analytics" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "System Analytics" })).toBeInTheDocument();
  });

  it("allows switching between different analytics tabs", async () => {
    const user = userEvent.setup();
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.queryByText("Loading analytics...")).not.toBeInTheDocument();
    });

    // Click on Student Analytics tab
    await user.click(screen.getByRole("tab", { name: "Student Analytics" }));
    
    // Should show student analytics content
    await waitFor(() => {
      expect(screen.getByText("Student Analytics")).toBeInTheDocument();
    });

    // Click on Teacher Analytics tab
    await user.click(screen.getByRole("tab", { name: "Teacher Analytics" }));
    
    // Should show teacher analytics content
    await waitFor(() => {
      expect(screen.getByText("Teacher Analytics")).toBeInTheDocument();
    });
  });

  it("handles refresh functionality", async () => {
    const user = userEvent.setup();
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.queryByText("Loading analytics...")).not.toBeInTheDocument();
    });

    // Find and click refresh button
    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    await user.click(refreshButton);

    // Should show loading again briefly
    expect(screen.getByText("Loading analytics...")).toBeInTheDocument();
  });

  it("displays last updated timestamp", async () => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.queryByText("Loading analytics...")).not.toBeInTheDocument();
    });

    // Check for last updated badge
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it("shows export functionality", async () => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.queryByText("Loading analytics...")).not.toBeInTheDocument();
    });

    // Check for export button
    const exportButton = screen.getByRole("button", { name: /export/i });
    expect(exportButton).toBeInTheDocument();
  });

  it("displays quick insights cards", async () => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.queryByText("Loading analytics...")).not.toBeInTheDocument();
    });

    // Check for quick insight cards
    expect(screen.getByText("Attendance Rate")).toBeInTheDocument();
    expect(screen.getByText("Classes This Month")).toBeInTheDocument();
    expect(screen.getByText("Risk Alerts")).toBeInTheDocument();
  });
});