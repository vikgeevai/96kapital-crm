"use client";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Bell, RefreshCw, LogOut, Menu } from "lucide-react";
import { useState, ReactNode } from "react";

interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
    window.location.reload();
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-6 border-b flex-shrink-0"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center border transition-colors duration-150 flex-shrink-0"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-elevated)" }}
              aria-label="Open menu"
            >
              <Menu size={16} />
            </button>

            <div className="min-w-0">
              <h1 className="text-sm lg:text-base font-bold font-display truncate" style={{ letterSpacing: "-0.01em" }}>
                {title}
              </h1>
              {subtitle && (
                <p className="hidden sm:block text-xs font-mono-data truncate" style={{ color: "var(--text-muted)" }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
            <button
              onClick={() => void handleRefresh()}
              className="w-9 h-9 flex items-center justify-center border transition-colors duration-150"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-elevated)" }}
              aria-label="Refresh"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button
              className="relative w-9 h-9 flex items-center justify-center border transition-colors duration-150"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-elevated)" }}
              aria-label="Notifications"
            >
              <Bell size={14} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ background: "var(--primary)" }} />
            </button>
            <div className="w-9 h-9 flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--primary)" }}>
              A
            </div>
            <button
              onClick={() => void handleLogout()}
              title="Sign out"
              className="hidden sm:flex w-9 h-9 items-center justify-center border transition-colors duration-150"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-elevated)" }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" style={{ background: "var(--bg-base)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
