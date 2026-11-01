import type { ReactNode } from "react";
import { WorkspaceShell } from "@/app/components/layout/workspace-shell";

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <WorkspaceShell
      activeSection="dashboard"
      title="Dashboard"
      description="Ruang kendali untuk memulai dan mengelola pemetaan pengetahuan."
    >
      {children}
    </WorkspaceShell>
  );
}
