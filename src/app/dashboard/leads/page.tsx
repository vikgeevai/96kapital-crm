"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { PageShell } from "@/components/dashboard/PageShell";
import { LeadStatus } from "@/lib/mock-data";
import { getSourceConfig, SOURCE_CONFIGS } from "@/lib/sources";
import {
  Search, X, Phone, Mail, MapPin,
  MessageCircle, Layers, Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL ?? "";
const API_KEY = process.env.NEXT_PUBLIC_CRM_API_KEY ?? "";

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new:       { label: "New",       color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
  contacted: { label: "Contacted", color: "#3b82f6", bg: "rgba(59,130,246,0.12)"  },
  qualified: { label: "Qualified", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)"  },
  junk:      { label: "Junk",      color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
  archived:  { label: "Archived",  color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
};
const STATUS_ORDER: LeadStatus[] = ["new", "contacted", "qualified", "junk", "archived"];

interface Lead {
  id: string;
  date?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  service?: string;
  source: string;
  status: LeadStatus;
  notes?: string;
  responseTime?: string;
  location?: string;
  estimated_cost?: string;
  planning_type?: string;
  arrangement_type?: string;
  metadata?: Record<string, string>;
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const { label, color, bg } = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: bg, color }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />
      {label}
    </span>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
      <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "rgba(37,99,235,0.1)" }}>
        <Icon size={13} style={{ color: "var(--primary-light)" }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{value}</p>
      </div>
    </div>
  );
}

function initials(name?: string) {
  if (!name?.trim()) return "?";
  return name.split(" ").map(n => n[0] ?? "").join("").slice(0, 2).toUpperCase() || "?";
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "all">("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${CRM_URL}/api/leads`, { headers: { "x-api-key": API_KEY } });
      const data = await res.json();
      setLeads(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateStatus = async (id: string, status: LeadStatus) => {
    setUpdatingId(id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    if (selectedLead?.id === id) setSelectedLead(prev => prev ? { ...prev, status } : null);
    await fetch(`${CRM_URL}/api/leads`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ id, status }),
    });
    setUpdatingId(null);
  };

  const handleDelete = async (ids: string[]) => {
    const msg = ids.length === 1
      ? "Delete this lead? This cannot be undone."
      : `Delete ${ids.length} leads? This cannot be undone.`;
    if (!confirm(msg)) return;
    setIsDeleting(true);
    try {
      await fetch(`${CRM_URL}/api/leads`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({ ids }),
      });
      setLeads(prev => prev.filter(l => !ids.includes(l.id)));
      setSelectedIds(new Set());
      if (selectedLead && ids.includes(selectedLead.id)) setSelectedLead(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Unique sources present in the data, sorted by lead count descending
  const uniqueSources = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { counts[l.source] = (counts[l.source] ?? 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([src]) => src);
  }, [leads]);

  // Active source config (for extra metadata columns)
  const activeSourceConfig = filterSource !== "all" ? getSourceConfig(filterSource) : null;
  const metaCols = activeSourceConfig?.metadataColumns ?? [];

  const filtered = useMemo(() => leads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !search
      || (l.name  ?? "").toLowerCase().includes(q)
      || (l.email ?? "").toLowerCase().includes(q)
      || (l.phone ?? "").includes(q)
      || (l.service ?? "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    const matchSource = filterSource === "all" || l.source === filterSource;
    return matchSearch && matchStatus && matchSource;
  }), [leads, search, filterStatus, filterSource]);

  const countByStatus = (s: LeadStatus | "all") =>
    s === "all" ? leads.length : leads.filter(l => l.status === s).length;

  const countBySource = (src: string) =>
    src === "all" ? leads.length : leads.filter(l => l.source === src).length;

  const waLink = (phone: string, name: string) =>
    `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${name}, thanks for your enquiry. We would love to help — are you available for a quick call?`)}`;

  // Standard table headers (always shown)
  const standardCols = ["Date", "Contact", "Service", "Est. Cost", "Status", "Action"];
  // Extra metadata column headers when a source with config is active
  const extraColLabels = metaCols.map(c => c.label);
  const allColLabels = metaCols.length > 0
    ? ["Date", "Contact", ...extraColLabels, "Status", "Action"]
    : standardCols;

  return (
    <PageShell title="Leads Pipeline" subtitle={`${leads.length} total leads`}>

      {/* ── Source tabs (Business selector) ── */}
      {uniqueSources.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap mb-4 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
          <Layers size={13} style={{ color: "var(--text-muted)" }} />
          <button
            onClick={() => setFilterSource("all")}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={{
              background: filterSource === "all" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
              border: filterSource === "all" ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.06)",
              color: filterSource === "all" ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            All businesses
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(255,255,255,0.1)" }}>
              {countBySource("all")}
            </span>
          </button>
          {uniqueSources.map(src => {
            const cfg = getSourceConfig(src);
            const active = filterSource === src;
            return (
              <button
                key={src}
                onClick={() => { setFilterSource(src); setSelectedLead(null); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5"
                style={{
                  background: active ? `${cfg.color}22` : "rgba(255,255,255,0.04)",
                  border: active ? `1px solid ${cfg.color}55` : "1px solid rgba(255,255,255,0.06)",
                  color: active ? cfg.color : "var(--text-muted)",
                }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                {cfg.label}
                <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(255,255,255,0.08)" }}>
                  {countBySource(src)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Status pills + Search ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["all", ...STATUS_ORDER] as (LeadStatus | "all")[]).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-150 flex items-center gap-1.5"
              style={{
                background: filterStatus === s
                  ? s === "all" ? "rgba(124,92,252,0.2)" : STATUS_CONFIG[s as LeadStatus].bg
                  : "rgba(255,255,255,0.04)",
                color: filterStatus === s
                  ? s === "all" ? "var(--primary-light)" : STATUS_CONFIG[s as LeadStatus].color
                  : "var(--text-muted)",
                border: filterStatus === s ? "1px solid transparent" : "1px solid rgba(255,255,255,0.06)",
              }}>
              {s === "all" ? "All" : STATUS_CONFIG[s as LeadStatus].label}
              <span className="text-xs px-1 rounded-sm" style={{ background: "rgba(255,255,255,0.1)" }}>
                {countByStatus(s)}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-auto sm:ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, service…"
            className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none w-full sm:w-64 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--primary)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--glass-border)")}
          />
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 mb-3 rounded-xl"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            {selectedIds.size} lead{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() => handleDelete([...selectedIds])}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity"
            style={{ background: "#ef4444", opacity: isDeleting ? 0.6 : 1, cursor: isDeleting ? "not-allowed" : "pointer" }}>
            <Trash2 size={12} />
            {isDeleting ? "Deleting…" : `Delete ${selectedIds.size}`}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs font-medium transition-colors"
            style={{ color: "var(--text-muted)" }}>
            Cancel
          </button>
        </div>
      )}

      {/* ── Table + Drawer ── */}
      <div className="flex gap-4 h-[calc(100vh-300px)] sm:h-[calc(100vh-260px)]">
        {/* Table */}
        <div className="flex-1 rounded-2xl border overflow-hidden flex flex-col min-w-0"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--glass-border)" }}>
          <div className="overflow-auto flex-1">
            <table className="w-full min-w-[600px]">
              <thead className="sticky top-0 z-10" style={{ background: "var(--bg-elevated)" }}>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {/* Checkbox select-all */}
                  <th className="px-3 py-3" style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      style={{ accentColor: "var(--primary)", cursor: "pointer" }}
                      checked={filtered.length > 0 && filtered.every(l => selectedIds.has(l.id))}
                      ref={el => {
                        if (el) el.indeterminate =
                          filtered.some(l => selectedIds.has(l.id)) &&
                          !filtered.every(l => selectedIds.has(l.id));
                      }}
                      onChange={e => setSelectedIds(
                        e.target.checked ? new Set(filtered.map(l => l.id)) : new Set()
                      )}
                    />
                  </th>
                  {allColLabels.map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={allColLabels.length + 1} className="text-center py-16" style={{ color: "var(--text-muted)" }}>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
                      <p className="text-sm">Loading leads…</p>
                    </div>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={allColLabels.length + 1} className="text-center py-16" style={{ color: "var(--text-muted)" }}>
                    <Search size={28} style={{ opacity: 0.3, margin: "0 auto 8px" }} />
                    <p className="text-sm">No leads found</p>
                  </td></tr>
                ) : filtered.map((lead, i) => (
                  <tr key={lead.id}
                    className="cursor-pointer transition-colors"
                    style={{
                      borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      background: selectedLead?.id === lead.id ? "rgba(37,99,235,0.08)" : "transparent",
                    }}
                    onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                    onMouseEnter={e => { if (selectedLead?.id !== lead.id) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={e => { if (selectedLead?.id !== lead.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        style={{ accentColor: "var(--primary)", cursor: "pointer" }}
                        checked={selectedIds.has(lead.id)}
                        onChange={() => setSelectedIds(prev => {
                          const next = new Set(prev);
                          next.has(lead.id) ? next.delete(lead.id) : next.add(lead.id);
                          return next;
                        })}
                      />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5">
                      <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                        {lead.date ? new Date(lead.date).toLocaleDateString("en-SG", { day: "numeric", month: "short" }) : "—"}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {lead.date ? new Date(lead.date).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: "var(--gradient, var(--primary))" }}>
                          {initials(lead.name)}
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{lead.name || "—"}</div>
                          <div className="text-xs" style={{ color: "var(--text-muted)" }}>{lead.phone}</div>
                        </div>
                      </div>
                    </td>

                    {/* Source-specific metadata columns (shown when a source is selected) */}
                    {metaCols.map(col => (
                      <td key={col.key} className="px-4 py-3.5">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {lead.metadata?.[col.key] || "—"}
                        </span>
                      </td>
                    ))}

                    {/* Standard columns (shown only when no metadata columns) */}
                    {metaCols.length === 0 && (
                      <>
                        <td className="px-4 py-3.5">
                          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{lead.service || "—"}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-semibold" style={{ color: "#10b981" }}>{lead.estimated_cost || "—"}</span>
                        </td>
                      </>
                    )}

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={lead.status} />
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {lead.phone ? (
                          <a href={waLink(lead.phone, lead.name)} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                            style={{ background: "#16a34a" }}>
                            <MessageCircle size={12} />
                            WhatsApp
                          </a>
                        ) : null}
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete([lead.id]); }}
                          title="Delete lead"
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                          style={{ color: "var(--text-muted)" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Showing {filtered.length} of {leads.length} leads
              {filterSource !== "all" && (
                <span className="ml-2 font-medium" style={{ color: getSourceConfig(filterSource).color }}>
                  · {getSourceConfig(filterSource).label}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* ── Lead detail drawer ── */}
        <AnimatePresence>
          {selectedLead && (
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="fixed inset-0 z-50 overflow-y-auto flex flex-col md:relative md:inset-auto md:z-auto md:w-80 md:flex-shrink-0 md:rounded-2xl md:border"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--glass-border)" }}
            >
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between sticky top-0 z-10"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: getSourceConfig(selectedLead.source).color }}>
                    {initials(selectedLead.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{selectedLead.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusBadge status={selectedLead.status} />
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: `${getSourceConfig(selectedLead.source).color}22`, color: getSourceConfig(selectedLead.source).color }}>
                        {getSourceConfig(selectedLead.source).label}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedLead(null)} className="w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{ color: "var(--text-muted)" }}>
                  <X size={15} />
                </button>
              </div>

              {/* Quick actions */}
              <div className="p-4 border-b grid grid-cols-2 gap-2" style={{ borderColor: "var(--border)" }}>
                {selectedLead.phone ? (
                  <>
                    <a href={waLink(selectedLead.phone, selectedLead.name)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white"
                      style={{ background: "#16a34a" }}>
                      <MessageCircle size={13} /> WhatsApp
                    </a>
                    <a href={`tel:${selectedLead.phone}`}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white"
                      style={{ background: "var(--primary)" }}>
                      <Phone size={13} /> Call
                    </a>
                  </>
                ) : (
                  <span className="col-span-2 text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>No phone number</span>
                )}
              </div>

              {/* Update status */}
              <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Update Status</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {STATUS_ORDER.map(s => (
                    <button key={s} onClick={() => updateStatus(selectedLead.id, s)}
                      disabled={updatingId === selectedLead.id}
                      className="py-1.5 px-2 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: selectedLead.status === s ? STATUS_CONFIG[s].bg : "rgba(255,255,255,0.04)",
                        color: selectedLead.status === s ? STATUS_CONFIG[s].color : "var(--text-muted)",
                        border: selectedLead.status === s ? `1px solid ${STATUS_CONFIG[s].color}40` : "1px solid transparent",
                      }}>
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact details */}
              <div className="p-4 flex flex-col gap-0">
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Contact</p>
                <DetailRow icon={Phone} label="Phone" value={selectedLead.phone} />
                <DetailRow icon={Mail} label="Email" value={selectedLead.email} />
                <DetailRow icon={MapPin} label="Address" value={selectedLead.address} />

                <p className="text-xs font-semibold uppercase tracking-wider mt-4 mb-1" style={{ color: "var(--text-muted)" }}>Service Details</p>
                <DetailRow icon={MessageCircle} label="Service" value={selectedLead.service} />
                <DetailRow icon={MapPin} label="Location" value={selectedLead.location} />
                <DetailRow icon={MessageCircle} label="Notes" value={selectedLead.notes} />

                {selectedLead.estimated_cost && (
                  <div className="mt-3 p-3 rounded-xl text-center" style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Estimated Value</p>
                    <p className="text-xl font-bold" style={{ color: "#60a5fa" }}>{selectedLead.estimated_cost}</p>
                  </div>
                )}

                {/* Quiz / metadata answers */}
                {selectedLead.metadata && Object.keys(selectedLead.metadata).length > 0 && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wider mt-4 mb-2" style={{ color: "var(--text-muted)" }}>
                      {getSourceConfig(selectedLead.source).label} Quiz Answers
                    </p>
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--glass-border)" }}>
                      {Object.entries(selectedLead.metadata)
                        .filter(([, v]) => v)
                        .map(([k, v], idx, arr) => (
                          <div key={k} className="flex items-start gap-2 px-3 py-2"
                            style={{ borderBottom: idx < arr.length - 1 ? "1px solid var(--border)" : "none", background: idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                            <span className="text-xs flex-shrink-0 mt-0.5 w-28 truncate capitalize" style={{ color: "var(--text-muted)" }}>
                              {k.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{v}</span>
                          </div>
                        ))}
                    </div>
                  </>
                )}

                <div className="mt-4 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Submitted</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {selectedLead.date ? new Date(selectedLead.date).toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
