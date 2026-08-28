"use client";
import { useState, useMemo, useEffect } from "react";
import {
  Search, Filter, Download, ChevronDown, MoreHorizontal,
  CheckCircle2, Clock, Star, Archive, Trash2, Edit2, RefreshCw,
} from "lucide-react";
import { Lead, LeadStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";


const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new:       { label: "New",       color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
  contacted: { label: "Contacted", color: "#3b82f6", bg: "rgba(59,130,246,0.12)"  },
  qualified: { label: "Qualified", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)"  },
  junk:      { label: "Junk",      color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
  archived:  { label: "Archived",  color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
};

const STATUS_ORDER: LeadStatus[] = ["new", "contacted", "qualified", "junk", "archived"];

function StatusBadge({ status }: { status: LeadStatus }) {
  const { label, color, bg } = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: bg, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />
      {label}
    </span>
  );
}

function StatusMenu({ current, onChange }: { current: LeadStatus; onChange: (s: LeadStatus) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        <StatusBadge status={current} />
        <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full mt-1 left-0 rounded-xl border z-50 py-1 min-w-[130px]"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--glass-border)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
          >
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                onClick={() => { onChange(s); setOpen(false); }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_CONFIG[s].color }} />
                <span style={{ color: s === current ? "var(--text-primary)" : "var(--text-secondary)" }}>
                  {STATUS_CONFIG[s].label}
                </span>
                {s === current && <CheckCircle2 size={11} className="ml-auto" style={{ color: STATUS_CONFIG[s].color }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "all">("all");
  const [sortCol, setSortCol] = useState<"date" | "name" | "status">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLeads(data);
    } catch (e) {
      setError("Failed to load leads. Check your connection.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchLeads(); }, []);

  const filtered = useMemo(() => {
    let data = [...leads];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((l) =>
        (l.name    ?? "").toLowerCase().includes(q) ||
        (l.email   ?? "").toLowerCase().includes(q) ||
        (l.phone   ?? "").toLowerCase().includes(q) ||
        (l.service ?? "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") {
      data = data.filter((l) => l.status === filterStatus);
    }
    data.sort((a, b) => {
      let va: string, vb: string;
      if (sortCol === "status") {
        va = STATUS_ORDER.indexOf(a.status).toString();
        vb = STATUS_ORDER.indexOf(b.status).toString();
      } else {
        va = (a[sortCol]) ?? "";
        vb = (b[sortCol]) ?? "";
      }
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return data;
  }, [leads, search, filterStatus, sortCol, sortDir]);

  const updateStatus = async (id: string, status: LeadStatus) => {
    // Snapshot for rollback. The catch only saw network throws; a 401/404/500
    // resolves normally, so a rejected write left the optimistic badge in
    // place and the operator believed the lead was handled.
    const prevLeads = leads;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Failed to persist status update", e);
      setLeads(prevLeads);
    }
  };

  const toggleSort = (col: "date" | "name" | "status") => {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const countByStatus = (s: LeadStatus | "all") =>
    s === "all" ? leads.length : leads.filter((l) => l.status === s).length;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--glass-border)" }}
    >
      {/* Header */}
      <div className="px-6 py-5 border-b flex flex-col gap-4" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-base">Leads Pipeline</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {filtered.length} of {leads.length} leads
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors duration-150"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              onClick={() => void fetchLeads()}
              disabled={loading}
              title="Refresh leads"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-colors duration-150"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              onClick={() => {/* CSV export logic */}}
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filter tabs + Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["all", ...STATUS_ORDER] as (LeadStatus | "all")[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-150 flex items-center gap-1.5"
                style={{
                  background: filterStatus === s
                    ? s === "all" ? "rgba(124,92,252,0.2)" : STATUS_CONFIG[s].bg
                    : "rgba(255,255,255,0.04)",
                  color: filterStatus === s
                    ? s === "all" ? "var(--primary-light)" : STATUS_CONFIG[s].color
                    : "var(--text-muted)",
                  border: filterStatus === s ? "1px solid transparent" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {s === "all" ? "All" : STATUS_CONFIG[s].label}
                <span
                  className="text-xs px-1 rounded-sm"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  {countByStatus(s)}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, service…"
              className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none w-64 transition-colors duration-150"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-border)")}
            />
          </div>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3" style={{ color: "var(--text-muted)" }}>
            <RefreshCw size={24} className="animate-spin" style={{ opacity: 0.4 }} />
            <p className="text-sm">Loading leads…</p>
          </div>
        ) : error ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <p className="text-sm text-red-400">{error}</p>
            <button className="text-xs underline" style={{ color: "var(--primary-light)" }} onClick={() => void fetchLeads()}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3" style={{ color: "var(--text-muted)" }}>
            <Search size={28} style={{ opacity: 0.3 }} />
            <p className="text-sm">No leads match your filters</p>
            <button className="text-xs underline" style={{ color: "var(--primary-light)" }} onClick={() => { setSearch(""); setFilterStatus("all"); }}>Clear filters</button>
          </div>
        ) : (
          filtered.map((lead) => (
            <div
              key={lead.id}
              className="px-4 py-4 flex items-start gap-3"
              style={{ borderBottomColor: "rgba(255,255,255,0.05)" }}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                style={{ background: "var(--gradient)" }}
              >
                {(lead.name || "?").split(" ").map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase() || "?"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{lead.name}</div>
                    <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{lead.email}</div>
                  </div>
                  <StatusMenu current={lead.status} onChange={(s) => void updateStatus(lead.id, s)} />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-md"
                    style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}
                  >
                    {lead.service}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-md"
                    style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}
                  >
                    {lead.source}
                  </span>
                  {lead.responseTime && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      <Clock size={10} />
                      {lead.responseTime}
                    </span>
                  )}
                  <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
                    {lead.date ? new Date(lead.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
              {[
                { key: "date",   label: "Date & Time",  sortable: true  },
                { key: "name",   label: "Contact",       sortable: true  },
                { key: "service",label: "Service",       sortable: false },
                { key: "source", label: "Source",        sortable: false },
                { key: "status", label: "Status",        sortable: true  },
                { key: "time",   label: "Response",      sortable: false },
                { key: "actions",label: "",              sortable: false },
              ].map(({ key, label, sortable }) => (
                <th
                  key={key}
                  className={cn(
                    "text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider",
                    sortable && "cursor-pointer select-none hover:text-primary-light"
                  )}
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => sortable && toggleSort(key as "date" | "name" | "status")}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {sortable && sortCol === key && (
                      <ChevronDown
                        size={12}
                        style={{ transform: sortDir === "asc" ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-16" style={{ color: "var(--text-muted)" }}>
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw size={28} className="animate-spin" style={{ opacity: 0.4 }} />
                    <p className="text-sm">Loading leads…</p>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="text-center py-16" style={{ color: "var(--text-muted)" }}>
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-red-400">{error}</p>
                    <button className="text-xs underline" style={{ color: "var(--primary-light)" }} onClick={() => void fetchLeads()}>
                      Retry
                    </button>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16" style={{ color: "var(--text-muted)" }}>
                  <div className="flex flex-col items-center gap-3">
                    <Search size={32} style={{ opacity: 0.3 }} />
                    <p className="text-sm">No leads match your filters</p>
                    <button
                      className="text-xs underline"
                      style={{ color: "var(--primary-light)" }}
                      onClick={() => { setSearch(""); setFilterStatus("all"); }}
                    >
                      Clear filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((lead, i) => (
                <tr
                  key={lead.id}
                  className="transition-colors duration-100"
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  {/* Date */}
                  <td className="px-4 py-3.5">
                    <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                      {lead.date ? new Date(lead.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {lead.date ? new Date(lead.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: "var(--gradient)" }}
                      >
                        {(lead.name || "?").split(" ").map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{lead.name}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{lead.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Service */}
                  <td className="px-4 py-3.5">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{lead.service}</span>
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3.5">
                    <span
                      className="text-xs px-2 py-1 rounded-md font-medium"
                      style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}
                    >
                      {lead.source}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <StatusMenu current={lead.status} onChange={(s) => void updateStatus(lead.id, s)} />
                  </td>

                  {/* Response time */}
                  <td className="px-4 py-3.5">
                    {lead.responseTime && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <Clock size={11} />
                        {lead.responseTime}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                        title="Archive"
                      >
                        <Archive size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* end hidden md:block */}

      {/* Footer */}
      {filtered.length > 0 && (
        <div
          className="px-6 py-3 border-t flex items-center justify-between"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Showing {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
          </span>
          <button
            className="text-xs font-medium transition-colors duration-150"
            style={{ color: "var(--primary-light)" }}
          >
            Load older leads →
          </button>
        </div>
      )}
    </div>
  );
}
