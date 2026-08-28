"use client";
import { useState } from "react";
import { PageShell } from "@/components/dashboard/PageShell";
import { Download, FileSpreadsheet, CheckCircle2, RefreshCw, Calendar, Filter } from "lucide-react";
import { motion } from "framer-motion";


const ALL_FIELDS = [
  { key: "name",           label: "Name" },
  { key: "email",          label: "Email" },
  { key: "phone",          label: "Phone" },
  { key: "address",        label: "Address" },
  { key: "service",        label: "Service / Product Interest" },
  { key: "source",         label: "Lead Source" },
  { key: "status",         label: "Status" },
  { key: "estimated_cost", label: "Estimated Value" },
  { key: "location",       label: "Location" },
  { key: "notes",          label: "Notes" },
  { key: "date",            label: "Date" },
];

function toCSV(leads: any[], fields: string[]): string {
  const header = fields.map(k => ALL_FIELDS.find(f => f.key === k)?.label ?? k);
  const rows = leads.map(l =>
    fields.map(k => {
      const val = l[k] ?? "";
      const str = String(val).replace(/"/g, '""');
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
    })
  );
  return [header.join(","), ...rows.map(r => r.join(","))].join("\n");
}

export default function ExportPage() {
  const [selectedFields, setSelectedFields] = useState<string[]>(
    ["name", "phone", "email", "service", "source", "status", "estimated_cost", "date"]
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  const toggleField = (key: string) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleExport = async () => {
    setExporting(true);
    setExported(false);
    try {
      const res = await fetch("/api/leads");
      let leads: any[] = await res.json();

      // Filter by status
      if (statusFilter !== "all") {
        leads = leads.filter(l => l.status === statusFilter);
      }

      // Filter by date
      if (dateFrom) leads = leads.filter(l => new Date(l.date ?? l.created_at) >= new Date(dateFrom));
      if (dateTo)   leads = leads.filter(l => new Date(l.date ?? l.created_at) <= new Date(dateTo + "T23:59:59"));

      setCount(leads.length);
      const csv = toCSV(leads, selectedFields);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `96kapital-leads-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExported(true);
    } finally {
      setExporting(false);
    }
  };

  const CARD_STYLE = {
    background: "var(--bg-elevated)",
    border: "1px solid var(--glass-border)",
    borderRadius: "16px",
    padding: "20px",
  };

  return (
    <PageShell title="Export" subtitle="Download your lead data">
      <div className="max-w-3xl space-y-4">

        {/* Filters */}
        <div style={CARD_STYLE}>
          <div className="flex items-center gap-2 mb-4">
            <Filter size={15} style={{ color: "var(--primary-light)" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>Filter Leads</h3>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {/* Status */}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-muted)" }}>Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}>
                <option value="all">All statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="junk">Junk</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Date from */}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-muted)" }}>From Date</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
            </div>

            {/* Date to */}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-muted)" }}>To Date</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
            </div>
          </div>
        </div>

        {/* Field selector */}
        <div style={CARD_STYLE}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>Choose Fields to Export</h3>
            <div className="flex gap-2">
              <button onClick={() => setSelectedFields(ALL_FIELDS.map(f => f.key))}
                className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                style={{ color: "var(--primary-light)", background: "rgba(37,99,235,0.1)" }}>
                Select all
              </button>
              <button onClick={() => setSelectedFields([])}
                className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)" }}>
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_FIELDS.map(({ key, label }) => {
              const selected = selectedFields.includes(key);
              return (
                <button key={key} onClick={() => toggleField(key)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-all"
                  style={{
                    background: selected ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.03)",
                    border: selected ? "1px solid rgba(37,99,235,0.3)" : "1px solid rgba(255,255,255,0.06)",
                    color: selected ? "var(--primary-light)" : "var(--text-muted)",
                  }}>
                  <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: selected ? "var(--primary)" : "rgba(255,255,255,0.08)" }}>
                    {selected && <CheckCircle2 size={10} style={{ color: "white" }} />}
                  </div>
                  <span className="text-xs">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Export button */}
        <div style={CARD_STYLE}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Export {selectedFields.length} field{selectedFields.length !== 1 ? "s" : ""} as CSV
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Opens a download · Compatible with Excel & Google Sheets
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExport}
              disabled={exporting || selectedFields.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{
                background: exported ? "#16a34a" : "var(--primary)",
                opacity: selectedFields.length === 0 ? 0.4 : 1,
              }}>
              {exporting ? (
                <><RefreshCw size={14} className="animate-spin" /> Exporting…</>
              ) : exported ? (
                <><CheckCircle2 size={14} /> Exported {count} leads!</>
              ) : (
                <><Download size={14} /> Download CSV</>
              )}
            </motion.button>
          </div>
        </div>

        {/* Tips */}
        <div className="p-4 rounded-2xl" style={{ background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.2)" }}>
          <div className="flex items-start gap-3">
            <FileSpreadsheet size={15} style={{ color: "var(--primary-light)", marginTop: 2 }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Export tips</p>
              <ul className="text-xs space-y-1" style={{ color: "var(--text-secondary)" }}>
                <li>• Filter by <strong>Qualified</strong> status to get your warmest leads ready for follow-up</li>
                <li>• Include <strong>Estimated Cost</strong> to track your pipeline value in Excel</li>
                <li>• Export monthly to keep your own backup records</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
