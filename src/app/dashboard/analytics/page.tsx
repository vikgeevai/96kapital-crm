"use client";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/PageShell";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, Users, DollarSign, Clock, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";


const STATUS_COLORS: Record<string, string> = {
  new: "#10b981", contacted: "#3b82f6", qualified: "#8b5cf6",
  junk: "#ef4444", archived: "#6b7280",
};

const CHART_STYLE = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--glass-border)",
  borderRadius: "16px",
  padding: "20px",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text-secondary)", letterSpacing: "0.02em" }}>{children}</h3>;
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl border" style={{ background: "var(--bg-elevated)", borderColor: "var(--glass-border)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <ArrowUpRight size={14} style={{ color: "#10b981" }} />
      </div>
      <p className="text-2xl font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>{value}</p>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
      <p className="font-semibold mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(30);

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Every chart on this page reads `stats?.x ?? []`. Without a status check
    // a 401 or 500 left stats null, so the whole page rendered as a complete
    // set of charts reading zero — indistinguishable from a real quiet month.
    fetch("/api/stats")
      .then(async r => {
        if (!r.ok) throw new Error(`/api/stats returned HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { setStats(d); setLoading(false); })
      .catch(err => {
        console.error("[analytics] could not load stats:", err);
        setLoadError("Could not load analytics. Refresh the page, or sign in again if your session has expired.");
        setLoading(false);
      });
  }, []);

  if (loadError) return (
    <PageShell title="Analytics" subtitle="Business intelligence">
      <div
        className="p-4 border text-sm"
        style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)", color: "#ef4444" }}
      >
        {loadError}
      </div>
    </PageShell>
  );

  if (loading) return (
    <PageShell title="Analytics" subtitle="Business intelligence">
      <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
          <p className="text-sm">Crunching your data…</p>
        </div>
      </div>
    </PageShell>
  );

  const timeSeries = (stats?.timeSeries ?? []).slice(-(timeRange));
  const formattedSeries = timeSeries.map((d: any) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-SG", { day: "numeric", month: "short" }),
  }));

  const byStatus = (stats?.byStatus ?? []).map((r: any) => ({
    name: r.status.charAt(0).toUpperCase() + r.status.slice(1),
    value: r.count,
    color: STATUS_COLORS[r.status] ?? "#6b7280",
  }));

  const byService = (stats?.byService ?? []).map((r: any) => ({
    name: r.service?.length > 22 ? r.service.slice(0, 22) + "…" : r.service,
    count: r.count,
  }));

  const bySource = (stats?.bySource ?? []).map((r: any) => ({ name: r.source, count: r.count }));

  const pipeline = (stats?.revenuePipeline ?? []).map((r: any) => ({
    status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
    value: r.value ?? 0,
    color: STATUS_COLORS[r.status] ?? "#6b7280",
  }));

  const totalRevenue = pipeline.reduce((sum: number, r: any) => sum + r.value, 0);
  const qualifiedRevenue = pipeline.find((r: any) => r.status === "Qualified")?.value ?? 0;

  return (
    <PageShell title="Analytics" subtitle="Business intelligence dashboard">
      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Leads" value={stats?.total?.toString() ?? "0"} sub="All time" icon={Users} color="var(--primary-light)" />
        <StatCard label="This Month" value={stats?.thisMonth?.toString() ?? "0"} sub={new Date().toLocaleString("default", { month: "long", year: "numeric" })} icon={TrendingUp} color="#10b981" />
        <StatCard label="Conversion Rate" value={`${stats?.conversionRate ?? 0}%`} sub="Lead → Qualified" icon={TrendingUp} color="#8b5cf6" />
        <StatCard label="Pipeline Value" value={`$${totalRevenue.toLocaleString()}`} sub="Estimated total" icon={DollarSign} color="#f59e0b" />
      </div>

      {/* Row 1: Lead volume + Status breakdown */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {/* Lead volume */}
        <div className="lg:col-span-2" style={CHART_STYLE}>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Lead Volume</SectionTitle>
            <div className="flex items-center gap-1">
              {([7, 14, 30] as const).map(n => (
                <button key={n} onClick={() => setTimeRange(n)}
                  className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
                  style={{
                    background: timeRange === n ? "rgba(37,99,235,0.2)" : "transparent",
                    color: timeRange === n ? "var(--primary-light)" : "var(--text-muted)",
                  }}>{n}d</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={formattedSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickLine={false} axisLine={false}
                interval={Math.floor(formattedSeries.length / 5)} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Leads" stroke="#3b82f6" strokeWidth={2}
                fill="url(#leadGrad)" dot={false} activeDot={{ r: 4, fill: "#3b82f6" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status donut */}
        <div style={CHART_STYLE}>
          <SectionTitle>Status Breakdown</SectionTitle>
          {byStatus.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={byStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={72}
                    dataKey="value" stroke="none">
                    {byStatus.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {byStatus.map((s: any) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span style={{ color: "var(--text-secondary)" }}>{s.name}</span>
                    </div>
                    <span className="font-mono-data font-semibold" style={{ color: "var(--text-primary)" }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>No data yet</p>}
        </div>
      </div>

      {/* Row 2: Services + Sources + Revenue pipeline */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {/* Service breakdown */}
        <div style={CHART_STYLE}>
          <SectionTitle>By Service Type</SectionTitle>
          {byService.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byService} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickLine={false} axisLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Leads" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>No data yet</p>}
        </div>

        {/* Sources */}
        <div style={CHART_STYLE}>
          <SectionTitle>Lead Sources</SectionTitle>
          {bySource.length > 0 ? (
            <div className="space-y-3">
              {bySource.map((s: any, i: number) => {
                const max = Math.max(...bySource.map((x: any) => x.count));
                const pct = max > 0 ? (s.count / max) * 100 : 0;
                const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{s.name}</span>
                      <span className="text-xs font-bold font-mono-data" style={{ color: "var(--text-primary)" }}>{s.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>No data yet</p>}
        </div>

        {/* Revenue pipeline */}
        <div style={CHART_STYLE}>
          <SectionTitle>Revenue Pipeline</SectionTitle>
          {pipeline.length > 0 ? (
            <>
              <div className="text-center mb-4">
                <p className="text-2xl font-bold" style={{ color: "#60a5fa" }}>${totalRevenue.toLocaleString()}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Total estimated pipeline</p>
              </div>
              <div className="space-y-2.5">
                {pipeline.filter((p: any) => p.value > 0).map((p: any) => (
                  <div key={p.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{p.status}</span>
                    </div>
                    <span className="text-xs font-bold font-mono-data" style={{ color: "var(--text-primary)" }}>
                      ${p.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              {qualifiedRevenue > 0 && (
                <div className="mt-4 p-3 rounded-xl text-center" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <p className="text-xs mb-0.5" style={{ color: "#a78bfa" }}>Qualified (ready to close)</p>
                  <p className="text-lg font-bold" style={{ color: "#a78bfa" }}>${qualifiedRevenue.toLocaleString()}</p>
                </div>
              )}
            </>
          ) : <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Submit leads to see pipeline data</p>}
        </div>
      </div>
    </PageShell>
  );
}
