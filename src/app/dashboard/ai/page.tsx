"use client";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/PageShell";
import { motion } from "framer-motion";
import {
  Zap, TrendingUp, AlertTriangle, Clock, MessageCircle,
  Star, ArrowRight, Brain, Target, BarChart3, Sparkles, RefreshCw,
} from "lucide-react";


interface Lead {
  id: string;
  name: string;
  phone: string;
  service: string;
  estimated_cost?: string;
  created_at: string;
  status: string;
}

interface Insight {
  type: "critical" | "warning" | "positive" | "info";
  icon: React.ElementType;
  headline: string;
  detail: string;
  action?: { label: string; href?: string; onClick?: () => void };
  metric?: string;
}

const TYPE_CONFIG = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", dot: "#ef4444" },
  warning:  { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", dot: "#f59e0b" },
  positive: { color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", dot: "#10b981" },
  info:     { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)", dot: "#3b82f6" },
};

function minutesAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

function scoreCard(value: number, label: string, color: string) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl"
      style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
      <p className="text-2xl font-bold mb-0.5" style={{ color }}>{value}</p>
      <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

interface ClaudeInsight {
  type: "critical" | "warning" | "positive" | "info";
  headline: string;
  detail: string;
  metric?: string;
}

export default function AIPage() {
  const [stats, setStats] = useState<any>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [claudeInsights, setClaudeInsights] = useState<ClaudeInsight[] | null>(null);
  const [claudeError, setClaudeError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then(r => r.json()),
      fetch("/api/leads").then(r => r.json()),
    ]).then(([s, l]) => {
      setStats(s);
      setLeads(Array.isArray(l) ? l : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleGenerateAI = async () => {
    if (!stats) return;
    setGenerating(true);
    setClaudeError(null);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats }),
      });
      if (res.status === 503) {
        setClaudeError("ANTHROPIC_API_KEY not configured — add it in Vercel environment variables.");
      } else if (!res.ok) {
        setClaudeError("Failed to generate AI analysis. Please try again.");
      } else {
        const data = await res.json();
        setClaudeInsights(data.insights);
        setGeneratedAt(data.generatedAt);
      }
    } catch {
      setClaudeError("Network error — please check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return (
    <PageShell title="AI Insights" subtitle="Powered by your data">
      <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>
        <div className="flex flex-col items-center gap-3">
          <Brain size={32} style={{ opacity: 0.4 }} className="animate-pulse" />
          <p className="text-sm">Analysing your leads…</p>
        </div>
      </div>
    </PageShell>
  );

  const total = stats?.total ?? 0;
  const newLeads = leads.filter(l => l.status === "new");
  const urgentLeads = newLeads.filter(l => minutesAgo(l.created_at) > 30);
  const staleLeads = newLeads.filter(l => minutesAgo(l.created_at) > 120);
  const qualifiedCount = leads.filter(l => l.status === "qualified").length;
  const conversionRate = total > 0 ? Math.round((qualifiedCount / total) * 100) : 0;
  const bySource = stats?.bySource ?? [];
  const topSource = bySource[0];
  const byService = stats?.byService ?? [];
  const topService = byService[0];

  // Peak hour analysis from recent leads
  const hourCounts: Record<number, number> = {};
  leads.forEach(l => {
    if (l.created_at) {
      const h = new Date(l.created_at).getHours();
      hourCounts[h] = (hourCounts[h] ?? 0) + 1;
    }
  });
  const peakHour = Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const peakHourFormatted = peakHour
    ? `${parseInt(peakHour[0])}:00–${parseInt(peakHour[0]) + 1}:00`
    : null;

  // Lead scoring — new leads sorted by estimated cost desc
  const scoredLeads = newLeads
    .map(l => {
      const cost = parseInt((l.estimated_cost ?? "0").replace(/[^0-9]/g, "")) || 0;
      const age = minutesAgo(l.created_at);
      const score = Math.max(0, Math.min(100, Math.round(
        (cost / 10000) * 60 + (age < 30 ? 40 : age < 60 ? 20 : 0)
      )));
      return { ...l, score, cost, age };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const insights: Insight[] = [
    urgentLeads.length > 0 && {
      type: "critical" as const,
      icon: AlertTriangle,
      headline: `${urgentLeads.length} lead${urgentLeads.length > 1 ? "s" : ""} waiting over 30 minutes — act now`,
      detail: "Research shows leads contacted within 5 minutes are 9× more likely to convert. These leads are at risk.",
      action: { label: "View urgent leads", href: "/dashboard/alerts" },
      metric: `${urgentLeads.length} urgent`,
    },
    staleLeads.length > 0 && {
      type: "warning" as const,
      icon: Clock,
      headline: `${staleLeads.length} lead${staleLeads.length > 1 ? "s have" : " has"} been in 'New' for 2+ hours`,
      detail: "These are at high risk of going cold. A quick WhatsApp message can re-engage them.",
      metric: `${staleLeads.length} stale`,
    },
    conversionRate > 0 && {
      type: conversionRate >= 20 ? "positive" as const : "warning" as const,
      icon: TrendingUp,
      headline: `Your conversion rate is ${conversionRate}% — ${conversionRate >= 20 ? "above average" : "room to improve"}`,
      detail: conversionRate >= 20
        ? "Strong performance. Focus on qualifying leads faster to push this higher."
        : "Consider faster follow-ups and personalised WhatsApp messages to improve conversions.",
      metric: `${conversionRate}% conversion`,
    },
    topSource && {
      type: "positive" as const,
      icon: Star,
      headline: `"${topSource.source}" is your #1 lead source with ${topSource.count} leads`,
      detail: "Double down on this channel. Consider increasing budget or referral incentives here.",
      metric: `${topSource.count} leads`,
    },
    topService && {
      type: "info" as const,
      icon: BarChart3,
      headline: `"${topService.service}" is your most requested service`,
      detail: "Feature this prominently on your website and in ad creatives to attract more of this segment.",
      metric: `${topService.count} enquiries`,
    },
    peakHourFormatted && {
      type: "info" as const,
      icon: Clock,
      headline: `Peak enquiry hour: ${peakHourFormatted} — make sure you're responsive then`,
      detail: "This is when leads are most active. Schedule your team accordingly or enable faster auto-replies.",
      metric: `Peak: ${peakHourFormatted}`,
    },
    total === 0 && {
      type: "info" as const,
      icon: Target,
      headline: "No leads yet — submit your first enquiry to see insights",
      detail: "Once leads start coming in, AI insights will automatically surface patterns and recommendations.",
    },
  ].filter(Boolean) as Insight[];

  return (
    <PageShell title="AI Insights" subtitle="Smart recommendations from your lead data">
      {/* Score cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {scoreCard(total, "Total Leads", "#3b82f6")}
        {scoreCard(newLeads.length, "Awaiting Action", "#f59e0b")}
        {scoreCard(urgentLeads.length, "Urgent (>30m)", "#ef4444")}
        {scoreCard(conversionRate, "Conv. Rate %", "#10b981")}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Insights feed */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text-secondary)" }}>
            {insights.length} Actionable Insights
          </h3>
          {insights.map((ins, i) => {
            const { color, bg, border } = TYPE_CONFIG[ins.type];
            return (
              <motion.div key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="p-4 rounded-2xl"
                style={{ background: bg, border: `1px solid ${border}` }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}20` }}>
                    <ins.icon size={15} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{ins.headline}</p>
                      {ins.metric && (
                        <span className="text-xs font-mono-data px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: `${color}20`, color }}>
                          {ins.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{ins.detail}</p>
                    {ins.action && (
                      <a href={ins.action.href}
                        className="inline-flex items-center gap-1 mt-2 text-xs font-semibold transition-colors"
                        style={{ color }}>
                        {ins.action.label} <ArrowRight size={11} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Lead scoring */}
        <div className="rounded-2xl border p-4" style={{ background: "var(--bg-elevated)", borderColor: "var(--glass-border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={15} style={{ color: "var(--primary-light)" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>Hot Leads — Act First</h3>
          </div>
          {scoredLeads.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>No new leads right now</p>
          ) : (
            <div className="space-y-3">
              {scoredLeads.map(lead => {
                const waUrl = `https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${lead.name}, thanks for your enquiry. We would love to help — are you available for a quick call?`)}`;
                const scoreColor = lead.score >= 70 ? "#10b981" : lead.score >= 40 ? "#f59e0b" : "#3b82f6";
                return (
                  <div key={lead.id} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{lead.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {lead.service || "Unknown service"} · {lead.age}m ago
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-bold font-mono-data" style={{ color: scoreColor }}>{lead.score}</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>score</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${lead.score}%`, background: scoreColor }} />
                    </div>
                    <div className="flex items-center justify-between">
                      {lead.estimated_cost && (
                        <span className="text-xs font-semibold" style={{ color: "#10b981" }}>{lead.estimated_cost}</span>
                      )}
                      <a href={waUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg text-white ml-auto"
                        style={{ background: "#16a34a" }}>
                        <MessageCircle size={11} /> WhatsApp
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Claude AI Analysis */}
      <div className="mt-6 rounded-2xl border p-5" style={{ background: "var(--bg-elevated)", borderColor: "var(--glass-border)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
              <Sparkles size={15} style={{ color: "#a78bfa" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>Claude AI Analysis</h3>
              {generatedAt && (
                <p className="text-xs font-mono-data" style={{ color: "var(--text-muted)" }}>
                  Generated {new Date(generatedAt).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGenerateAI}
            disabled={generating || loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", borderRadius: "8px" }}
          >
            {generating
              ? <><RefreshCw size={12} className="animate-spin" /> Analysing…</>
              : <><Brain size={12} /> Generate AI Analysis</>
            }
          </motion.button>
        </div>

        {/* States */}
        {!claudeInsights && !generating && !claudeError && (
          <div className="py-10 flex flex-col items-center gap-2" style={{ color: "var(--text-muted)" }}>
            <Brain size={28} style={{ opacity: 0.25 }} />
            <p className="text-sm">Click "Generate AI Analysis" to get Claude's assessment of your pipeline.</p>
          </div>
        )}

        {generating && (
          <div className="space-y-2 mt-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(139,92,246,0.06)" }} />
            ))}
          </div>
        )}

        {claudeError && (
          <div className="py-6 px-4 rounded-xl text-sm text-center" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
            {claudeError}
          </div>
        )}

        {claudeInsights && !generating && (
          <div className="space-y-3">
            {claudeInsights.map((ins, i) => {
              const { color, bg, border } = TYPE_CONFIG[ins.type];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="p-4 rounded-xl"
                  style={{ background: bg, border: `1px solid ${border}` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}20` }}>
                      <Sparkles size={13} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{ins.headline}</p>
                        {ins.metric && (
                          <span className="text-xs font-mono-data px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: `${color}20`, color }}>
                            {ins.metric}
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{ins.detail}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
