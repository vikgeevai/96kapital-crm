"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Target, LayoutDashboard, Users, BarChart3, Bell, Settings,
  LogOut, ChevronLeft, ChevronRight, Bot, FileDown, Upload, X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard",  href: "/dashboard",            badge: null },
  { icon: Users,           label: "Leads",       href: "/dashboard/leads",       badge: null },
  { icon: BarChart3,       label: "Analytics",   href: "/dashboard/analytics",   badge: null },
  { icon: Bot,             label: "AI Insights", href: "/dashboard/ai",          badge: null },
  { icon: Bell,            label: "Alerts",      href: "/dashboard/alerts",      badge: null },
  { icon: FileDown,        label: "Export",      href: "/dashboard/export",      badge: null },
  { icon: Upload,          label: "Import",      href: "/dashboard/import",      badge: null },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function SidebarContent({ collapsed, onClose }: { collapsed?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [newLeadsCount, setNewLeadsCount] = useState<number | null>(null);

  useEffect(() => {
    // The session cookie authenticates this; it is httpOnly and same-origin,
    // so it is sent automatically. The previous version read
    // NEXT_PUBLIC_CRM_API_KEY and bailed out with `if (!apiKey) return`, which
    // meant that the moment that env var went away the badge would vanish
    // permanently — with no request, no error and nothing in the console to
    // say why.
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/leads/new-count", { cache: "no-store" });
        if (!res.ok) {
          console.error(`[sidebar] new-count failed: HTTP ${res.status}`);
          return;
        }
        const { count } = await res.json();
        setNewLeadsCount(count);
      } catch (err) {
        console.error("[sidebar] new-count request failed:", err);
      }
    };

    void fetchCount();
    const interval = setInterval(() => void fetchCount(), 60_000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b shrink-0 overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--primary)", boxShadow: "0 0 16px rgba(37,99,235,0.3)" }}
          >
            <Target size={15} color="white" />
          </div>
          {!collapsed && (
            <span
              className="font-bold text-sm whitespace-nowrap"
              style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
            >
              <span style={{ color: "var(--accent-light)" }}>96</span> Kapital CRM
            </span>
          )}
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ icon: Icon, label, href, badge }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          // Override Leads badge with live new-lead count
          const liveBadge =
            href === "/dashboard/leads" && newLeadsCount !== null && newLeadsCount > 0
              ? String(newLeadsCount)
              : badge;
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 relative overflow-hidden"
              )}
              style={{
                background: active ? "rgba(37,99,235,0.12)" : "transparent",
                borderLeft: active ? "2px solid var(--primary)" : "2px solid transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                }
              }}
              title={collapsed ? label : undefined}
            >
              <Icon size={17} className="flex-shrink-0" style={{ color: active ? "var(--primary-light)" : "inherit" }} />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && liveBadge && (
                <span
                  className="ml-auto text-xs font-mono-data px-1.5 py-0.5"
                  style={{ background: "rgba(37,99,235,0.15)", color: "var(--primary-light)" }}
                >
                  {liveBadge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="py-4 px-2 border-t space-y-0.5 shrink-0" style={{ borderColor: "var(--border)" }}>
        <Link
          href="/dashboard/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings size={17} className="flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          onClick={() => void handleLogout()}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.07)"; (e.currentTarget as HTMLElement).style.color = "#fca5a5"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
          title={collapsed ? "Log out" : undefined}
        >
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </>
  );
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className="relative hidden lg:flex flex-col h-screen border-r transition-all duration-300 flex-shrink-0"
        style={{
          width: collapsed ? "64px" : "220px",
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
        }}
      >
        <SidebarContent collapsed={collapsed} />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200 z-10"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border)",
            color: "var(--text-muted)",
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside
            className="fixed inset-y-0 left-0 z-50 flex flex-col w-[280px] border-r lg:hidden"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
          >
            <SidebarContent onClose={onMobileClose} />
          </aside>
        </>
      )}
    </>
  );
}
