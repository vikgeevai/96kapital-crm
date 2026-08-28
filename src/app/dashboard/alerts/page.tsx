"use client";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/dashboard/PageShell";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Clock, MessageCircle, Phone, CheckCircle2,
  Bell, Zap, RefreshCw, X,
} from "lucide-react";


interface UrgentLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  service: string;
  created_at: string;
  estimated_cost?: string;
}

function minutesAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

function urgencyColor(mins: number) {
  if (mins > 120) return { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", label: "Critical" };
  if (mins > 60) return  { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", label: "High" };
  return                 { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)", label: "Medium" };
}

export default function AlertsPage() {
  const [urgent, setUrgent] = useState<UrgentLead[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * This page previously used try/finally with no catch and no res.ok check,
   * doing `setUrgent(data.urgentLeads ?? [])`. On a 401 the body is
   * {"error":"Unauthorized"}, so `?? []` produced an empty list and the page
   * rendered "You're all caught up" — the page whose whole job is surfacing
   * neglected leads reported all-clear precisely when it could not see them.
   */
  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? "Your session has expired — sign in again."
            : `Could not load alerts (HTTP ${res.status}).`
        );
      }
      const data = await res.json();
      if (!Array.isArray(data.urgentLeads)) {
        throw new Error("Unexpected response from the server.");
      }
      setUrgent(data.urgentLeads);
    } catch (err) {
      console.error("[alerts] failed to load:", err);
      setError(err instanceof Error ? err.message : "Could not load alerts.");
      setUrgent([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const markContacted = async (id: string) => {
    setMarkingId(id);
    // Only drop the row once the write is confirmed. It used to be removed
    // regardless of outcome, so a failed PATCH looked like a handled lead.
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "contacted" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUrgent(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error("[alerts] mark contacted failed:", err);
      setError("Could not mark that lead as contacted — it is still outstanding.");
    } finally {
      setMarkingId(null);
    }
  };

  const dismiss = (id: string) => setDismissed(prev => new Set([...prev, id]));

  const visible = urgent.filter(l => !dismissed.has(l.id));
  const criticalCount = visible.filter(l => minutesAgo(l.created_at) > 120).length;
  const highCount = visible.filter(l => minutesAgo(l.created_at) > 60 && minutesAgo(l.created_at) <= 120).length;

  return (
    <PageShell title="Alerts Centre" subtitle="Real-time follow-up required">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Urgent", value: visible.length, color: "#3b82f6", icon: Bell },
          { label: "Critical (2h+)", value: criticalCount, color: "#ef4444", icon: AlertTriangle },
          { label: "High (1–2h)", value: highCount, color: "#f59e0b", icon: Clock },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="p-4 rounded-2xl border flex items-center gap-4"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--glass-border)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${color}18` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alert list */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-elevated)", borderColor: "var(--glass-border)" }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <Zap size={15} style={{ color: "var(--primary-light)" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Leads Awaiting Follow-up
            </h3>
          </div>
          <button onClick={fetchAlerts}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-elevated)" }}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16" style={{ color: "var(--text-muted)" }}>
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
              <p className="text-sm">Checking for urgent leads…</p>
            </div>
          </div>
        ) : error ? (
          /* Checked BEFORE the empty state on purpose: an unreachable API must
             never be able to render as "All clear!". */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <AlertTriangle size={40} style={{ color: "#ef4444", opacity: 0.7, marginBottom: 12 }} />
            <p className="text-base font-semibold" style={{ color: "#ef4444" }}>
              Could not load alerts
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{error}</p>
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
              This is not an all-clear — urgent leads may exist that cannot be shown.
            </p>
            <button
              onClick={fetchAlerts}
              className="mt-4 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: "var(--text-muted)" }}>
            <CheckCircle2 size={40} style={{ color: "#10b981", opacity: 0.6, marginBottom: 12 }} />
            <p className="text-base font-semibold" style={{ color: "#10b981" }}>All clear!</p>
            <p className="text-sm mt-1">No leads waiting over 30 minutes. Great work.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            <AnimatePresence>
              {visible.map(lead => {
                const age = minutesAgo(lead.created_at);
                const { color, bg, border, label: urgLabel } = urgencyColor(age);
                const waUrl = `https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${lead.name}, thanks for your enquiry. We would love to help — are you available for a quick call?`)}`;
                const hoursDisplay = age >= 60 ? `${Math.floor(age / 60)}h ${age % 60}m` : `${age}m`;

                return (
                  <motion.div key={lead.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                    className="px-5 py-4 flex items-center gap-4"
                    style={{ background: "transparent" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  >
                    {/* Urgency badge */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: bg, border: `1px solid ${border}` }}>
                        <Clock size={16} style={{ color }} />
                      </div>
                      <span className="text-xs font-bold font-mono-data" style={{ color }}>{urgLabel}</span>
                    </div>

                    {/* Lead info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{lead.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full font-mono-data"
                          style={{ background: bg, color, border: `1px solid ${border}` }}>
                          {hoursDisplay} ago
                        </span>
                      </div>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {lead.service || "Unknown service"} · {lead.phone}
                        {lead.estimated_cost ? ` · ${lead.estimated_cost}` : ""}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={waUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-colors"
                        style={{ background: "#16a34a" }}>
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                      <a href={`tel:${lead.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-colors"
                        style={{ background: "var(--primary)" }}>
                        <Phone size={12} /> Call
                      </a>
                      <button onClick={() => markContacted(lead.id)}
                        disabled={markingId === lead.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                        style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
                        {markingId === lead.id
                          ? <RefreshCw size={12} className="animate-spin" />
                          : <><CheckCircle2 size={12} /> Done</>}
                      </button>
                      <button onClick={() => dismiss(lead.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="mt-4 p-4 rounded-2xl" style={{ background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.2)" }}>
        <div className="flex items-start gap-3">
          <Zap size={15} style={{ color: "var(--primary-light)", marginTop: 2 }} />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Why speed matters</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Leads contacted within 5 minutes are <strong style={{ color: "var(--primary-light)" }}>9× more likely to convert</strong>.
              Prospects evaluate multiple vendors simultaneously — the first team to respond earns the conversation.
              Speed is your single biggest competitive edge.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
