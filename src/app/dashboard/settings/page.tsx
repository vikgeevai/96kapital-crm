"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/dashboard/PageShell";
import { motion } from "framer-motion";
import {
  User, Building2, Bell, Key, Shield, CheckCircle2, Copy, Eye, EyeOff, Code,
} from "lucide-react";

const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL ?? "";

const TABS = ["Profile", "Business", "Notifications", "API & Security"] as const;
type Tab = typeof TABS[number];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-5 mb-4"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--glass-border)" }}>
      <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text-secondary)", letterSpacing: "0.02em" }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, defaultValue, placeholder, type = "text", disabled }: {
  label: string; defaultValue?: string; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div className="mb-3">
      <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-muted)" }}>{label}</label>
      <input type={type} defaultValue={defaultValue} placeholder={placeholder} disabled={disabled}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
        style={{
          background: disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
          border: "1px solid var(--glass-border)",
          color: disabled ? "var(--text-muted)" : "var(--text-primary)",
          cursor: disabled ? "not-allowed" : "text",
        }}
        onFocus={e => { if (!disabled) e.currentTarget.style.borderColor = "var(--primary)"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "var(--glass-border)"; }}
      />
    </div>
  );
}

function Toggle({ label, description, defaultChecked }: {
  label: string; description?: string; defaultChecked?: boolean;
}) {
  const [on, setOn] = useState(defaultChecked ?? false);
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{description}</p>}
      </div>
      <button onClick={() => setOn(!on)}
        className="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
        style={{ background: on ? "var(--primary)" : "rgba(255,255,255,0.12)" }}>
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
          style={{ left: on ? "calc(100% - 22px)" : "2px" }} />
      </button>
    </div>
  );
}

function SaveButton({ onClick }: { onClick?: () => void }) {
  const [saved, setSaved] = useState(false);
  const handle = () => {
    setSaved(true);
    onClick?.();
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={handle}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
      style={{ background: saved ? "#16a34a" : "var(--primary)" }}>
      {saved ? <><CheckCircle2 size={14} /> Saved!</> : "Save Changes"}
    </motion.button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Profile");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [snippetTab, setSnippetTab] = useState<"html" | "js">("html");
  const [snippetCopied, setSnippetCopied] = useState(false);
  // Fetched, not inlined.
  //
  // This value was once a literal in this file — and because the repo is
  // public, it was readable from raw.githubusercontent.com with no
  // authentication. It was then moved to NEXT_PUBLIC_CRM_API_KEY, which fixed
  // source control but not the browser: NEXT_PUBLIC_* is substituted into the
  // client bundle at build time, so the key still shipped to every visitor.
  //
  // It now comes from GET /api/settings/integration-key, which requires a
  // valid session cookie — so it reaches an authenticated admin who asks for
  // it, and nobody else.
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/settings/integration-key", { cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
        if (!cancelled) setApiKey(body.key);
      } catch (err) {
        console.error("[settings] could not load the integration key:", err);
        if (!cancelled) {
          setKeyError(
            err instanceof Error ? err.message : "Could not load the integration key."
          );
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // The snippets are shown before the key arrives (and if it never does), so
  // they carry an obvious placeholder rather than the string "null".
  const keyForSnippet = apiKey ?? "YOUR_API_KEY";
  const endpoint = `${CRM_URL || "https://www.96kapital.com"}/api/leads`;

  const copyKey = () => {
    if (!apiKey) return;
    void navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const htmlSnippet = `<form id="crm-form">
  <input name="name" placeholder="Your name" required />
  <input name="phone" placeholder="Phone number" required />
  <input name="email" placeholder="Email" type="email" />
  <input name="service" placeholder="What are you interested in?" />
  <input name="estimated_cost" placeholder="Budget (optional)" />
  <textarea name="notes" placeholder="Any additional details"></textarea>
  <button type="submit">Submit Enquiry</button>
</form>

<script>
document.getElementById('crm-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const res = await fetch('${endpoint}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '${keyForSnippet}',
    },
    body: JSON.stringify(data),
  });
  if (res.ok) alert('Enquiry submitted!');
});
</script>`;

  const jsSnippet = `// Works in React, Vue, plain JS, or any framework
await fetch('${endpoint}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${keyForSnippet}',
  },
  body: JSON.stringify({
    name: 'Alex Rivera',       // required
    phone: '+1 555 000 0000',  // required
    email: 'alex@example.com',
    service: 'SaaS Consulting',
    estimated_cost: '$5,000',
    location: 'New York',
    notes: 'Referred by a colleague',
  }),
});`;

  const copySnippet = () => {
    void navigator.clipboard.writeText(snippetTab === "html" ? htmlSnippet : jsSnippet);
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 2000);
  };

  return (
    <PageShell title="Settings" subtitle="Configure your CRM">
      <div className="max-w-2xl">
        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab ? "var(--primary)" : "transparent",
                color: activeTab === tab ? "white" : "var(--text-muted)",
              }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Profile */}
        {activeTab === "Profile" && (
          <>
            <Section title="Personal Information">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
                  style={{ background: "var(--primary)" }}>AD</div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Admin User</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Administrator</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-0">
                <Field label="First Name" placeholder="First name" />
                <Field label="Last Name" placeholder="Last name" />
              </div>
              <Field label="Email Address" placeholder="you@yourbusiness.com" type="email" />
              <Field label="Phone" placeholder="+1 555 000 0000" />
            </Section>
            <div className="flex justify-end"><SaveButton /></div>
          </>
        )}

        {/* Business */}
        {activeTab === "Business" && (
          <>
            <Section title="Business Details">
              <Field label="Business Name" placeholder="Your Business Name" />
              <Field label="Business Email" placeholder="you@yourbusiness.com" type="email" />
              <Field label="Phone" placeholder="+1 555 000 0000" />
              <Field label="Website" placeholder="https://yourbusiness.com" />
              <Field label="Address" placeholder="City, Country" />
            </Section>
            <Section title="Response SLA">
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                Set your target response time. Leads exceeding this will appear in Alerts.
              </p>
              <div className="flex items-center gap-3">
                <input type="number" defaultValue={30} min={1} max={1440}
                  className="w-24 px-3 py-2 rounded-xl text-sm outline-none text-center"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>minutes</span>
              </div>
            </Section>
            <div className="flex justify-end"><SaveButton /></div>
          </>
        )}

        {/* Notifications */}
        {activeTab === "Notifications" && (
          <>
            <Section title="Email Notifications">
              <Toggle label="New lead received" description="Email notification when a new lead comes in" defaultChecked />
              <Toggle label="Urgent lead alert" description="Alert when a lead has been waiting over 30 minutes" defaultChecked />
              <Toggle label="Daily summary" description="Morning digest of yesterday's leads and metrics" />
              <Toggle label="Weekly report" description="Monday morning performance summary" />
            </Section>
            <Section title="Delivery">
              <Field label="Notification email" placeholder="your@email.com" type="email" />
              <Field label="WhatsApp alerts (optional)" placeholder="+1 555 000 0000" />
            </Section>
            <div className="flex justify-end"><SaveButton /></div>
          </>
        )}

        {/* API & Security */}
        {activeTab === "API & Security" && (
          <>
            <Section title="API Key">
              <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                This key authenticates requests from your website or app to 96 Kapital CRM. Keep it secret — never share it publicly.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 rounded-xl text-xs font-mono overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)" }}>
                  {keyError ? keyError : apiKey === null ? "Loading…" : showKey ? apiKey : "•".repeat(32)}
                </div>
                <button onClick={() => setShowKey(!showKey)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border"
                  style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-elevated)" }}>
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={copyKey}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border transition-colors"
                  style={{
                    borderColor: copied ? "rgba(16,185,129,0.4)" : "var(--border)",
                    color: copied ? "#10b981" : "var(--text-muted)",
                    background: copied ? "rgba(16,185,129,0.1)" : "var(--bg-elevated)",
                  }}>
                  {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </Section>

            <Section title="CRM Endpoint">
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Use this URL in your website or app to send leads to 96 Kapital CRM.</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 rounded-xl text-xs font-mono"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", color: "var(--primary-light)" }}>
                  {CRM_URL || "https://www.96kapital.com"}/api/leads
                </div>
              </div>
            </Section>

            <Section title="Integration Guide">
              <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Copy one of these snippets into your website or platform to start sending leads to 96 Kapital CRM. The API key and endpoint are pre-filled.
              </p>

              {/* Snippet tabs */}
              <div className="flex items-center gap-1 mb-3 p-1 rounded-xl w-fit"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)" }}>
                {(["html", "js"] as const).map(tab => (
                  <button key={tab} onClick={() => setSnippetTab(tab)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: snippetTab === tab ? "var(--primary)" : "transparent",
                      color: snippetTab === tab ? "white" : "var(--text-muted)",
                    }}>
                    {tab === "html" ? "HTML Form" : "JavaScript"}
                  </button>
                ))}
              </div>

              {/* Code block */}
              <div className="relative rounded-xl overflow-hidden"
                style={{ background: "rgba(0,0,0,0.35)", border: "1px solid var(--glass-border)" }}>
                <div className="flex items-center justify-between px-4 py-2 border-b"
                  style={{ borderColor: "var(--glass-border)" }}>
                  <div className="flex items-center gap-2">
                    <Code size={12} style={{ color: "var(--text-muted)" }} />
                    <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                      {snippetTab === "html" ? "index.html" : "submit.js"}
                    </span>
                  </div>
                  <button onClick={copySnippet}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: snippetCopied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
                      color: snippetCopied ? "#10b981" : "var(--text-muted)",
                      border: `1px solid ${snippetCopied ? "rgba(16,185,129,0.3)" : "var(--glass-border)"}`,
                    }}>
                    {snippetCopied ? <><CheckCircle2 size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
                <pre className="p-4 text-xs overflow-x-auto leading-relaxed"
                  style={{ color: "#a5f3fc", fontFamily: "'JetBrains Mono', monospace", maxHeight: 280 }}>
                  {snippetTab === "html" ? htmlSnippet : jsSnippet}
                </pre>
              </div>

              {/* Field reference */}
              <div className="mt-4 rounded-xl overflow-hidden" style={{ border: "1px solid var(--glass-border)" }}>
                <div className="px-4 py-2 text-xs font-semibold" style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-muted)", borderBottom: "1px solid var(--glass-border)" }}>
                  Accepted fields
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {[
                      ["name", "string", "required", "Contact's full name"],
                      ["phone", "string", "required", "Phone number"],
                      ["email", "string", "optional", "Email address"],
                      ["service", "string", "optional", "Service or product interest"],
                      ["estimated_cost", "string", "optional", "Budget or deal value"],
                      ["location", "string", "optional", "City, region, or address"],
                      ["notes", "string", "optional", "Any additional context"],
                      ["address", "string", "optional", "Full address"],
                    ].map(([field, type, req, desc], i) => (
                      <tr key={field} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                        <td className="px-4 py-2 font-mono" style={{ color: "#a5f3fc" }}>{field}</td>
                        <td className="px-2 py-2" style={{ color: "var(--text-muted)" }}>{type}</td>
                        <td className="px-2 py-2">
                          <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
                            style={{
                              background: req === "required" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
                              color: req === "required" ? "#f87171" : "var(--text-muted)",
                            }}>
                            {req}
                          </span>
                        </td>
                        <td className="px-2 py-2" style={{ color: "var(--text-secondary)" }}>{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                To allow a new domain (e.g. your Webflow or WordPress site), add it to the{" "}
                <code className="px-1 py-0.5 rounded text-xs" style={{ background: "rgba(255,255,255,0.08)", color: "var(--primary-light)" }}>CORS_ORIGINS</code>{" "}
                environment variable in your Vercel project settings (comma-separated).
              </p>
            </Section>

            <Section title="Security">
              <div className="space-y-3">
                {[
                  { icon: Shield, label: "API key authentication", desc: "All requests require x-api-key header", ok: true },
                  { icon: Shield, label: "CORS restriction", desc: "Only your configured domains can call the API", ok: true },
                  { icon: Shield, label: "HTTPS only", desc: "All traffic encrypted via TLS", ok: true },
                  { icon: Key, label: "Database encryption", desc: "Neon Postgres encrypts data at rest", ok: true },
                ].map(({ icon: Icon, label, desc, ok }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(16,185,129,0.1)" }}>
                      <Icon size={13} style={{ color: "#10b981" }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
                        {ok && <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>Active</span>}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </PageShell>
  );
}
