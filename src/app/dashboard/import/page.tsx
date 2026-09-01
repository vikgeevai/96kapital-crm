"use client";
import { useState, useRef, useCallback } from "react";
import { PageShell } from "@/components/dashboard/PageShell";
import {
  Upload, Link2, FileSpreadsheet, AlertCircle, CheckCircle2,
  RefreshCw, ChevronRight, ArrowLeft, Users, Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Papa from "papaparse";
/**
 * xlsx@0.18.5 carries two open high advisories (prototype pollution, ReDoS)
 * and `npm audit` reports no fix. That is not an oversight to be corrected on
 * the next pass — it is the end state, and this note exists so nobody spends
 * an afternoon rediscovering why.
 *
 * SheetJS stopped publishing to npm at 0.18.5. The patched releases (0.20.x)
 * are distributed only from cdn.sheetjs.com, so "fixing" this means installing
 * a dependency from outside the registry and making every Vercel build depend
 * on that CDN being reachable.
 *
 * Reviewed and accepted (2026-09-01). The exposure is narrow: this parses in
 * the admin's own browser, on a file they chose, behind a login. It never sees
 * untrusted input from the public internet and never runs on the server.
 *
 * Revisit if this parser is ever moved server-side or fed a file the operator
 * did not choose — at that point the calculus changes completely.
 */
import * as XLSX from "xlsx";


// ── CRM fields available for column mapping ───────────────────────────────
const CRM_FIELDS = [
  { key: "name",           label: "Name" },
  { key: "phone",          label: "Phone / WhatsApp" },
  { key: "email",          label: "Email" },
  { key: "service",        label: "Service / Interest" },
  { key: "estimated_cost", label: "Estimated Value / Budget" },
  { key: "location",       label: "Location / City" },
  { key: "notes",          label: "Notes / Comments" },
  { key: "address",        label: "Address" },
];

/** Auto-detect which CRM field a spreadsheet column header maps to. */
function autoDetect(header: string): string {
  const h = header.toLowerCase().replace(/[\s_-]/g, "");
  if (["fullname", "name", "firstname", "lastname", "clientname"].some(k => h.includes(k))) return "name";
  if (["phonenumber", "phone", "mobile", "whatsapp", "tel", "contact"].some(k => h.includes(k))) return "phone";
  if (["email", "emailaddress", "mail"].some(k => h.includes(k))) return "email";
  if (["adname", "campaignname", "adsetname", "service", "interest", "product", "form"].some(k => h.includes(k))) return "service";
  if (["budget", "amount", "estimatedcost", "loanamount", "cost", "value"].some(k => h.includes(k))) return "estimated_cost";
  if (["location", "city", "region", "area", "state"].some(k => h.includes(k))) return "location";
  if (["notes", "message", "comments", "remarks", "description"].some(k => h.includes(k))) return "notes";
  if (["address"].some(k => h.includes(k))) return "address";
  return "ignore";
}

const CARD_STYLE = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--glass-border)",
  borderRadius: "16px",
  padding: "20px",
};

const INPUT_STYLE = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--glass-border)",
  color: "var(--text-primary)",
  borderRadius: "10px",
  outline: "none",
};

type Step = 1 | 2 | 3;
type Mode = "csv" | "sheet";

interface ImportResult {
  success: boolean;
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

/**
 * Spreadsheet cells come back as unknown. String(cell) on an object yields the
 * literal text "[object Object]", which would then be written into the CRM as
 * a lead's name or phone number with nothing flagging it.
 */
function cellToText(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  // Dates are the one object type SheetJS routinely produces.
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  // Allow-list rather than a fallthrough to String(): anything else is an
  // object, and String(object) is the literal text "[object Object]", which
  // would be written into the CRM as a lead's name or phone number.
  if (typeof cell === "string") return cell;
  if (typeof cell === "number" || typeof cell === "boolean" || typeof cell === "bigint") {
    return cell.toString();
  }
  return "";
}

export default function ImportPage() {
  // Step & mode
  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<Mode>("csv");
  const [source, setSource] = useState("instagram-ads");

  // Step 1 — CSV upload
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1 — Google Sheet URL
  const [sheetUrl, setSheetUrl] = useState("");
  const [fetchingSheet, setFetchingSheet] = useState(false);
  const [sheetError, setSheetError] = useState("");

  // Step 2 — column mapping
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<number, string>>({});

  // Step 3 — result
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");

  // ── Parse CSV text → move to step 2 ──────────────────────────────────
  const processCSVData = useCallback((headers: string[], rows: string[][]) => {
    setRawHeaders(headers);
    setRawRows(rows);
    const initialMap: Record<number, string> = {};
    headers.forEach((h, idx) => {
      initialMap[idx] = autoDetect(h);
    });
    setColumnMap(initialMap);
    setStep(2);
  }, []);

  // ── CSV / XLSX file drop / browse ────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    const isXlsx = name.endsWith(".xlsx") || name.endsWith(".xls");
    const isCsv  = name.endsWith(".csv");

    if (!isCsv && !isXlsx) {
      alert("Please upload a .csv or .xlsx file.");
      return;
    }

    if (isXlsx) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
      const rows = (data)
        .map(row => row.map(cell => cellToText(cell)))
        .filter(row => row.some(c => c.trim()));
      const [headerRow, ...dataRows] = rows;
      processCSVData(headerRow, dataRows);
    } else {
      Papa.parse<string[]>(file, {
        complete(result) {
          const [headerRow, ...dataRows] = result.data.filter(r => r.some(c => c.trim()));
          processCSVData(headerRow, dataRows);
        },
        skipEmptyLines: true,
      });
    }
  }, [processCSVData]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }, [handleFile]);

  // ── Fetch Google Sheet ────────────────────────────────────────────────
  const handleFetchSheet = async () => {
    setSheetError("");
    if (!sheetUrl.trim()) { setSheetError("Paste a Google Sheets URL first."); return; }
    setFetchingSheet(true);
    try {
      const res = await fetch("/api/leads/import/fetch-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setSheetError(data.error ?? "Failed to fetch sheet."); return; }
      processCSVData(data.headers as string[], data.rows as string[][]);
    } catch {
      setSheetError("Network error — check your connection and try again.");
    } finally {
      setFetchingSheet(false);
    }
  };

  // ── Import leads ──────────────────────────────────────────────────────
  const handleImport = async () => {
    setImporting(true);
    setImportError("");
    setResult(null);

    const leads = rawRows.map(row => {
      const lead: Record<string, string> = { source };
      rawHeaders.forEach((_, idx) => {
        const field = columnMap[idx];
        if (field && field !== "ignore") {
          const val = (row[idx] ?? "").trim();
          if (val) lead[field] = val;
        }
      });
      return lead;
    });

    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads }),
      });
      const data = await res.json();
      if (!res.ok) { setImportError(data.error ?? "Import failed."); }
      else { setResult(data); }
    } catch {
      setImportError("Network error — check your connection and try again.");
    } finally {
      setImporting(false);
      setStep(3);
    }
  };

  // ── Counts for step 2 summary ─────────────────────────────────────────
  const nameIdx  = Object.entries(columnMap).find(([, v]) => v === "name")?.[0];
  const phoneIdx = Object.entries(columnMap).find(([, v]) => v === "phone")?.[0];
  const readyCount = rawRows.filter(row => {
    const n = nameIdx  !== undefined ? (row[Number(nameIdx)]  ?? "").trim() : "";
    const p = phoneIdx !== undefined ? (row[Number(phoneIdx)] ?? "").trim() : "";
    return n || p;
  }).length;
  const skipCount = rawRows.length - readyCount;

  // ── Reset ─────────────────────────────────────────────────────────────
  const reset = () => {
    setStep(1);
    setRawHeaders([]);
    setRawRows([]);
    setColumnMap({});
    setResult(null);
    setImportError("");
    setSheetUrl("");
    setSheetError("");
    setSource("instagram-ads");
  };

  return (
    <PageShell title="Import" subtitle="Bulk-load leads from Google Sheets or a CSV file">
      <div className="max-w-3xl space-y-4">

        {/* ── Step indicator ── */}
        <div className="flex items-center gap-2 mb-2">
          {(["1 Upload", "2 Map columns", "3 Result"] as const).map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all"
                  style={{
                    background: active ? "rgba(37,99,235,0.15)" : done ? "rgba(22,163,74,0.12)" : "rgba(255,255,255,0.04)",
                    color: active ? "var(--primary-light)" : done ? "#4ade80" : "var(--text-muted)",
                    border: active ? "1px solid rgba(37,99,235,0.3)" : done ? "1px solid rgba(22,163,74,0.25)" : "1px solid var(--glass-border)",
                  }}
                >
                  {done && <CheckCircle2 size={11} />}
                  {label}
                </div>
                {i < 2 && <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">

          {/* ════════════════════════════════════════════════════════
              STEP 1 — UPLOAD
          ════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">

              {/* Mode tabs */}
              <div style={CARD_STYLE}>
                <div className="flex gap-2 mb-5">
                  {(["csv", "sheet"] as Mode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: mode === m ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.04)",
                        border: mode === m ? "1px solid rgba(37,99,235,0.35)" : "1px solid var(--glass-border)",
                        color: mode === m ? "var(--primary-light)" : "var(--text-muted)",
                      }}
                    >
                      {m === "csv" ? <Upload size={14} /> : <Link2 size={14} />}
                      {m === "csv" ? "Upload CSV file" : "Google Sheet URL"}
                    </button>
                  ))}
                </div>

                {/* ── CSV upload zone ── */}
                {mode === "csv" && (
                  <div
                    className="relative flex flex-col items-center justify-center gap-3 rounded-2xl p-10 cursor-pointer transition-all"
                    style={{
                      border: `2px dashed ${dragging ? "var(--primary)" : "var(--glass-border)"}`,
                      background: dragging ? "rgba(37,99,235,0.07)" : "rgba(255,255,255,0.02)",
                    }}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(37,99,235,0.12)" }}
                    >
                      <Upload size={22} style={{ color: "var(--primary-light)" }} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        Drop your file here or click to browse
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        Accepts <strong>.csv</strong> and <strong>.xlsx</strong> · In Google Sheets: <strong>File → Download → CSV or Excel</strong>
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
                    />
                  </div>
                )}

                {/* ── Google Sheet URL ── */}
                {mode === "sheet" && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={sheetUrl}
                        onChange={e => { setSheetUrl(e.target.value); setSheetError(""); }}
                        onKeyDown={e => { if (e.key === "Enter") void handleFetchSheet(); }}
                        placeholder="https://docs.google.com/spreadsheets/d/…"
                        className="flex-1 px-4 py-3 text-sm"
                        style={INPUT_STYLE}
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => void handleFetchSheet()}
                        disabled={fetchingSheet}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                        style={{ background: "var(--primary)" }}
                      >
                        {fetchingSheet ? <><RefreshCw size={14} className="animate-spin" /> Fetching…</> : <><FileSpreadsheet size={14} /> Fetch Sheet</>}
                      </motion.button>
                    </div>

                    {sheetError && (
                      <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
                        <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                        {sheetError}
                      </div>
                    )}

                    <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.18)" }}>
                      <Info size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--primary-light)" }} />
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        The sheet must be set to <strong style={{ color: "var(--text-primary)" }}>&quot;Anyone with the link (Viewer)&quot;</strong>.
                        In Google Sheets: <strong style={{ color: "var(--text-primary)" }}>Share → Change → Anyone with the link</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Source tag */}
              <div style={CARD_STYLE}>
                <label className="text-xs font-semibold block mb-2" style={{ color: "var(--text-muted)" }}>
                  SOURCE TAG — applied to all imported leads
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  placeholder="e.g. instagram-ads, meta-leads, referral"
                  className="w-full px-4 py-2.5 text-sm"
                  style={INPUT_STYLE}
                />
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  Shows up as the &quot;Source&quot; field on each lead card. Useful for filtering later.
                </p>
              </div>

            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════
              STEP 2 — MAP COLUMNS
          ════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">

              {/* Summary chip */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(22,163,74,0.12)", border: "1px solid rgba(22,163,74,0.25)", color: "#4ade80" }}>
                  {readyCount} rows ready to import
                </div>
                {skipCount > 0 && (
                  <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
                    {skipCount} rows will be skipped (no name or phone)
                  </div>
                )}
                <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", color: "var(--text-muted)" }}>
                  {rawHeaders.length} columns detected
                </div>
              </div>

              {/* Column mapping */}
              <div style={CARD_STYLE}>
                <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>Map columns to CRM fields</h3>
                <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                  Auto-detected below — adjust any column if needed. Columns set to &quot;— Ignore —&quot; won&apos;t be imported.
                </p>

                <div className="space-y-2">
                  {rawHeaders.map((header, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-2 px-3 rounded-xl" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--glass-border)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{header || `Column ${idx + 1}`}</p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          e.g. {rawRows[0]?.[idx] ? `"${rawRows[0][idx]}"` : "(empty)"}
                        </p>
                      </div>
                      <ChevronRight size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                      <select
                        value={columnMap[idx] ?? "ignore"}
                        onChange={e => setColumnMap(prev => ({ ...prev, [idx]: e.target.value }))}
                        className="text-xs px-2.5 py-1.5 rounded-lg outline-none"
                        style={{ background: columnMap[idx] && columnMap[idx] !== "ignore" ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${columnMap[idx] && columnMap[idx] !== "ignore" ? "rgba(37,99,235,0.3)" : "var(--glass-border)"}`, color: columnMap[idx] && columnMap[idx] !== "ignore" ? "var(--primary-light)" : "var(--text-muted)" }}
                      >
                        <option value="ignore">— Ignore —</option>
                        {CRM_FIELDS.map(f => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              <div style={CARD_STYLE}>
                <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                  Preview <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(first 5 rows)</span>
                </h3>
                <div className="overflow-x-auto scrollbar-none rounded-xl" style={{ border: "1px solid var(--glass-border)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                        {rawHeaders.map((h, idx) => (
                          columnMap[idx] !== "ignore" && (
                            <th key={idx} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: "var(--primary-light)", borderBottom: "1px solid var(--glass-border)" }}>
                              {CRM_FIELDS.find(f => f.key === columnMap[idx])?.label ?? h}
                            </th>
                          )
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 5).map((row, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                          {rawHeaders.map((_, idx) => (
                            columnMap[idx] !== "ignore" && (
                              <td key={idx} className="px-3 py-2 whitespace-nowrap max-w-[180px] truncate" style={{ color: "var(--text-primary)" }}>
                                {row[idx] || <span style={{ color: "var(--text-muted)" }}>—</span>}
                              </td>
                            )
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)" }}
                >
                  <ArrowLeft size={14} /> Start over
                </button>
                <motion.button
                  whileHover={{ scale: readyCount === 0 ? 1 : 1.02 }}
                  whileTap={{ scale: readyCount === 0 ? 1 : 0.98 }}
                  onClick={() => void handleImport()}
                  disabled={readyCount === 0 || importing}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{ background: "var(--primary)", boxShadow: readyCount > 0 ? "0 0 24px rgba(37,99,235,0.3)" : "none" }}
                >
                  {importing ? (
                    <><RefreshCw size={14} className="animate-spin" /> Importing {readyCount} leads…</>
                  ) : (
                    <><Users size={14} /> Import {readyCount} lead{readyCount !== 1 ? "s" : ""}</>
                  )}
                </motion.button>
              </div>

            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════
              STEP 3 — RESULT
          ════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {importError && (
                <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertCircle size={18} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: "#fca5a5" }}>Import failed</p>
                    <p className="text-xs" style={{ color: "#fca5a5" }}>{importError}</p>
                  </div>
                </div>
              )}

              {result && (
                <>
                  {/* Success card */}
                  <div className="flex items-start gap-4 p-6 rounded-2xl" style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)" }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(22,163,74,0.15)" }}>
                      <CheckCircle2 size={24} style={{ color: "#4ade80" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold mb-1" style={{ color: "#4ade80" }}>
                        {result.inserted} lead{result.inserted !== 1 ? "s" : ""} imported successfully
                      </p>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        Tagged with source <strong style={{ color: "var(--text-primary)" }}>&quot;{source}&quot;</strong>
                        {result.skipped > 0 && ` · ${result.skipped} row${result.skipped !== 1 ? "s" : ""} skipped`}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { n: result.inserted, label: "Imported", color: "#4ade80", bg: "rgba(22,163,74,0.1)", border: "rgba(22,163,74,0.2)" },
                      { n: result.skipped,  label: "Skipped",  color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)" },
                      { n: result.errors.filter(e => !e.reason.includes("Missing both")).length, label: "Errors", color: "#f87171", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
                    ].map(({ n, label, color, bg, border }) => (
                      <div key={label} className="p-4 rounded-2xl text-center" style={{ background: bg, border: `1px solid ${border}` }}>
                        <div className="text-2xl font-bold" style={{ color }}>{n}</div>
                        <div className="text-xs mt-1 font-semibold uppercase tracking-wider" style={{ color }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Per-row errors (if any, excluding simple skip messages) */}
                  {result.errors.length > 0 && (
                    <div style={CARD_STYLE}>
                      <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>Skipped / failed rows</h3>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-none">
                        {result.errors.map((e, i) => (
                          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.025)" }}>
                            <span className="font-mono-data" style={{ color: "var(--text-muted)" }}>Row {e.row}</span>
                            <span style={{ color: "#fca5a5" }}>{e.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={reset}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)" }}
                    >
                      <Upload size={14} /> Import another file
                    </button>
                    <a
                      href="/dashboard/leads"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                      style={{ background: "var(--primary)", boxShadow: "0 0 20px rgba(37,99,235,0.3)" }}
                    >
                      <Users size={14} /> View in Leads
                    </a>
                  </div>
                </>
              )}

            </motion.div>
          )}

        </AnimatePresence>

        {/* Tips card (shown only on step 1) */}
        {step === 1 && (
          <div className="p-4 rounded-2xl" style={{ background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.2)" }}>
            <div className="flex items-start gap-3">
              <FileSpreadsheet size={15} style={{ color: "var(--primary-light)", marginTop: 2 }} />
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>How to export from Google Sheets</p>
                <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: "var(--text-secondary)" }}>
                  <li>Open the sheet in Google Sheets</li>
                  <li>Click <strong>File → Download → CSV (.csv)</strong> or <strong>Microsoft Excel (.xlsx)</strong></li>
                  <li>Upload the downloaded file above</li>
                </ol>
                <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                  Or paste the sheet URL directly if it&apos;s shared as &quot;Anyone with the link&quot;.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageShell>
  );
}
