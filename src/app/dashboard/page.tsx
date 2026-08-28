"use client";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { KPICards } from "@/components/dashboard/KPICards";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { LeadVolumeChart, StatusDonut, TopSources, CalendarHeatmap } from "@/components/dashboard/Charts";
import { AIInsights } from "@/components/dashboard/AIInsights";
import { Bell, Calendar, RefreshCw, ChevronDown, Target, Menu } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const TABS = ["Overview", "Leads", "Analytics", "AI Insights"] as const;
type Tab = typeof TABS[number];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [refreshing, setRefreshing] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Every panel below fetches its own data on mount, so bumping this key
  // remounts them and they refetch. Refresh used to be `await sleep(800)` and
  // nothing else: the icon spun, the button felt responsive, and not one
  // request was made. Beside a hardcoded "Last synced: just now", that is a
  // dashboard that can show week-old numbers and insist they are current.
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setLastSynced(new Date());
    // The panels refetch on remount; this only governs how long the icon
    // spins, so it stays short and does not pretend to track completion.
    setTimeout(() => setRefreshing(false), 600);
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
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center border transition-colors duration-150"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-elevated)" }}
              aria-label="Open menu"
            >
              <Menu size={16} />
            </button>

            <div>
              <h1
                className="text-sm lg:text-base font-bold font-display"
                style={{ letterSpacing: "-0.01em" }}
              >
                Command Centre
              </h1>
              <p className="hidden sm:block text-xs font-mono-data" style={{ color: "var(--text-muted)" }}>
                {lastSynced
                  ? `Last synced: ${lastSynced.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}`
                  : "Last synced: on page load"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="hidden md:flex items-center gap-2 text-sm px-4 py-2 border transition-colors duration-150"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-elevated)" }}
            >
              <Calendar size={13} />
              <span className="font-mono-data text-xs">Mar 2026</span>
              <ChevronDown size={12} />
            </button>

            <button
              onClick={handleRefresh}
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
              <span
                className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--primary)" }}
              />
            </button>

            <div
              className="w-9 h-9 flex items-center justify-center text-xs font-bold text-white cursor-pointer"
              style={{ background: "var(--primary)" }}
            >
              RC
            </div>
          </div>
        </header>

        {/* Tab bar — horizontally scrollable on mobile */}
        <div
          className="flex items-center border-b flex-shrink-0 overflow-x-auto scrollbar-none"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-0 px-4 lg:px-6 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 lg:px-5 py-3.5 text-sm font-medium transition-all duration-150 relative font-mono-data text-xs uppercase tracking-wider whitespace-nowrap"
                style={{ color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)" }}
              >
                {tab}
                {activeTab === tab && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: "var(--primary)" }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" style={{ background: "var(--bg-base)" }}>
          {/* Welcome banner */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-4 lg:p-5 mb-5 lg:mb-6 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg, rgba(37,99,235,0.07) 0%, rgba(56,189,248,0.03) 100%)",
              borderColor: "rgba(37,99,235,0.2)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 0% 50%, rgba(37,99,235,0.08) 0%, transparent 55%)" }}
            />
            <div className="relative z-10">
              <h2
                className="font-bold text-sm lg:text-base font-display mb-1"
                style={{ letterSpacing: "-0.01em" }}
              >
                Good morning, Rachel{" "}
                <span aria-label="wave" role="img">👋</span>
              </h2>
              <p className="text-xs lg:text-sm" style={{ color: "var(--text-secondary)", fontWeight: 300 }}>
                You have{" "}
                <span className="font-bold" style={{ color: "var(--primary-light)" }}>
                  6 new leads
                </span>{" "}
                since yesterday. 2 need immediate follow-up.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="relative z-10 flex items-center gap-2 text-xs lg:text-sm px-4 py-2 lg:px-5 lg:py-2.5 font-semibold text-white flex-shrink-0 self-start sm:self-auto"
              style={{ background: "var(--primary)", boxShadow: "0 0 20px rgba(37,99,235,0.3)" }}
            >
              <Target size={13} />
              Quick Follow-Up
            </motion.button>
          </motion.div>

          {/* KPIs */}
          <div className="mb-5 lg:mb-6">
            <KPICards key={refreshKey} />
          </div>

          {(activeTab === "Overview" || activeTab === "Analytics") && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <div className="lg:col-span-2"><LeadVolumeChart key={refreshKey} /></div>
                <StatusDonut key={refreshKey} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5 lg:mb-6">
                <TopSources key={refreshKey} />
                <div className="lg:col-span-2"><CalendarHeatmap key={refreshKey} /></div>
              </div>
            </>
          )}

          {(activeTab === "Overview" || activeTab === "Leads") && (
            <div className="mb-5 lg:mb-6"><LeadsTable key={refreshKey} /></div>
          )}

          {(activeTab === "Overview" || activeTab === "AI Insights") && (
            <div className="mb-5 lg:mb-6"><AIInsights key={refreshKey} /></div>
          )}
        </main>
      </div>
    </div>
  );
}
