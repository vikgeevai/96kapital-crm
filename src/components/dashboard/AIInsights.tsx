"use client";
import { useState, useEffect } from "react";
import { Target, TrendingUp, AlertTriangle, Info, Zap } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";


const TYPE_CONFIG = {
  critical: { icon: AlertTriangle, color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)"   },
  positive: { icon: TrendingUp,    color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)"  },
  warning:  { icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)"  },
  info:     { icon: Info,          color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)"  },
};

type InsightType = keyof typeof TYPE_CONFIG;
interface Insight { type: InsightType; headline: string; detail: string; }

function minutesAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

export function AIInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then(r => r.json()),
      fetch("/api/leads").then(r => r.json()),
    ]).then(([stats, leads]) => {
      const total = stats?.total ?? 0;
      const allLeads: any[] = Array.isArray(leads) ? leads : [];
      const newLeads = allLeads.filter(l => l.status === "new");
      const urgentLeads: any[] = stats?.urgentLeads ?? [];
      const staleLeads = newLeads.filter(l => minutesAgo(l.created_at ?? l.date ?? "") > 120);
      const qualifiedCount = allLeads.filter(l => l.status === "qualified").length;
      const conversionRate = total > 0 ? Math.round((qualifiedCount / total) * 100) : 0;
      const topService = stats?.byService?.[0];
      const topSource = stats?.bySource?.[0];

      // Active pipeline revenue
      const pipeline = (stats?.revenuePipeline ?? [])
        .filter((r: any) => ["new", "contacted", "qualified"].includes(r.status))
        .reduce((sum: number, r: any) => sum + (r.value ?? 0), 0);

      const computed: Insight[] = [
        urgentLeads.length > 0 && {
          type: "critical" as const,
          headline: `${urgentLeads.length} lead${urgentLeads.length > 1 ? "s" : ""} waiting over 30 min — act now`,
          detail: "Leads contacted within 5 minutes convert 9× more often. Reach out before prospects move to a competitor.",
        },
        staleLeads.length > 0 && {
          type: "warning" as const,
          headline: `${staleLeads.length} lead${staleLeads.length > 1 ? "s" : ""} stale for 2+ hours — high dropout risk`,
          detail: "A timely WhatsApp or email can re-engage these prospects before they commit to a competitor.",
        },
        pipeline > 0 && {
          type: "positive" as const,
          headline: `$${pipeline.toLocaleString()} estimated revenue in active pipeline`,
          detail: "Combined value across new, contacted, and qualified leads. Fast qualification secures this before leads go cold.",
        },
        total > 0 && {
          type: conversionRate >= 20 ? "positive" as const : "warning" as const,
          headline: `Conversion rate is ${conversionRate}% — ${conversionRate >= 20 ? "above industry average" : "below 20% target"}`,
          detail: conversionRate >= 20
            ? "Strong pipeline health. Maintain fast follow-ups and a clear service recommendation on first contact."
            : "Aim for 20%+. A structured first-contact script and same-day follow-up can close this gap.",
        },
        topService && {
          type: "info" as const,
          headline: `"${topService.service}" drives the most enquiries — ${topService.count} requests`,
          detail: "Feature this service prominently in ad creatives and your website hero to attract more high-intent prospects.",
        },
        topSource && {
          type: "info" as const,
          headline: `"${topSource.source}" is your top lead source — ${topSource.count} leads`,
          detail: "Highest-volume acquisition channel. Increasing budget or response speed here delivers the highest return.",
        },
        total === 0 && {
          type: "info" as const,
          headline: "No leads yet — insights will appear once enquiries come in",
          detail: "Submit the first enquiry via your website to begin seeing live pipeline intelligence here.",
        },
      ].filter(Boolean) as Insight[];

      setInsights(computed.slice(0, 4));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="border p-6" style={{ background: "var(--bg-elevated)", borderColor: "var(--glass-border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center"
            style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.25)" }}
          >
            <Target size={17} style={{ color: "var(--primary-light)" }} />
          </div>
          <div>
            <h3 className="font-bold text-base font-display">AI Insights</h3>
            <p className="text-xs font-mono-data" style={{ color: "var(--text-muted)" }}>Updated just now</p>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 text-xs font-mono-data uppercase tracking-widest px-3 py-1.5"
          style={{ background: "rgba(37,99,235,0.1)", color: "var(--primary-light)", border: "1px solid rgba(37,99,235,0.2)" }}
        >
          <Zap size={10} />
          Live
        </div>
      </div>

      {/* Insights or skeleton */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[72px] rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {insights.map(({ type, headline, detail }, i) => {
            const { icon: Icon, color, bg, border } = TYPE_CONFIG[type];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="p-4 border transition-all duration-200 cursor-pointer group"
                style={{ background: bg, borderColor: border }}
                whileHover={{ x: 4, transition: { duration: 0.15 } }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}15` }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight mb-1">{headline}</p>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)", fontWeight: 300 }}>{detail}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Generate Full Report → AI page */}
      <Link href="/dashboard/ai">
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="mt-5 w-full py-3 text-sm font-semibold border transition-all duration-200 flex items-center justify-center gap-2 font-mono-data uppercase tracking-wider cursor-pointer"
          style={{ borderColor: "rgba(37,99,235,0.25)", color: "var(--primary-light)", background: "rgba(37,99,235,0.05)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(37,99,235,0.1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(37,99,235,0.05)"; }}
        >
          <Zap size={13} />
          Generate Full Report
        </motion.div>
      </Link>
    </div>
  );
}
