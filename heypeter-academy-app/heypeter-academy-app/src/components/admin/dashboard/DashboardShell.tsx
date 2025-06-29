interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="h-full px-4 py-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}