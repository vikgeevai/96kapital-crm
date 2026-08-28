"use client";
import Link from "next/link";
import { useState } from "react";
import { Target, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

function Logo() {
  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--primary)", boxShadow: "0 0 24px rgba(37,99,235,0.35)" }}
      >
        <Target size={18} color="white" />
      </div>
      <span
        className="font-bold text-2xl tracking-tight"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <span style={{ color: "var(--accent-light)" }}>96</span> Kapital CRM
      </span>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Invalid email or password.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-dvh flex relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Left panel — brand */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
        className="hidden lg:flex flex-col justify-between w-1/2 p-16 relative overflow-hidden"
        style={{ borderRight: "1px solid var(--border)" }}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 30% 60%, rgba(37,99,235,0.07) 0%, transparent 65%)" }}
        />
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

        {/* Top */}
        <div className="relative z-10">
          <Link href="/"><Logo /></Link>
        </div>

        {/* Middle — editorial headline */}
        <div className="relative z-10">
          <div
            className="font-mono-data text-xs uppercase tracking-widest mb-6 flex items-center gap-3"
            style={{ color: "var(--primary-light)" }}
          >
            <span className="w-8 h-px inline-block" style={{ background: "var(--primary)" }} />
            Client Portal
          </div>
          <h2
            className="text-5xl font-bold leading-tight mb-6"
            style={{ fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.1 }}
          >
            Your leads<br />
            are waiting.
          </h2>
          <p className="text-base leading-relaxed max-w-sm" style={{ color: "var(--text-secondary)", fontWeight: 300 }}>
            Every minute you&apos;re not in the dashboard is a minute your pipeline isn&apos;t moving.
          </p>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 grid grid-cols-3 gap-6 pt-8 border-t" style={{ borderColor: "var(--border)" }}>
          {[
            { n: "500+", label: "Businesses" },
            { n: "4.9", label: "Rating" },
            { n: "94%", label: "Response rate" },
          ].map(({ n, label }) => (
            <div key={label}>
              <div className="text-2xl font-bold font-display mb-1" style={{ color: "var(--accent-light)" }}>{n}</div>
              <div className="text-xs font-mono-data uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Right panel — form */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
        className="flex-1 flex items-center justify-center p-6 lg:p-16"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <Link href="/"><Logo /></Link>
          </div>

          {/* Heading */}
          <div className="mb-10">
            <h1
              className="text-4xl font-bold mb-3"
              style={{ fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.1 }}
            >
              Welcome back.
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)", fontWeight: 300 }}>
              Sign in to your command centre.
            </p>
          </div>

          <form onSubmit={e => { void handleSubmit(e); }} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 font-mono-data uppercase tracking-wider" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-4 text-sm outline-none transition-all duration-200"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-border)")}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block font-medium font-mono-data uppercase tracking-wider" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                  Password
                </label>
                <a href="#" className="text-xs font-mono-data" style={{ color: "var(--accent)" }}>
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-12 py-4 text-sm outline-none transition-all duration-200"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-border)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-150"
                  style={{ color: "var(--text-muted)" }}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm px-4 py-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              className="w-full py-4 text-base font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{
                background: "var(--primary)",
                boxShadow: loading ? "none" : "0 0 30px rgba(37,99,235,0.3)",
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating…
                </>
              ) : (
                <>
                  Enter the Dashboard
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          <p className="text-center text-xs mt-8 font-mono-data" style={{ color: "var(--text-muted)" }}>
            AES-256 encrypted · SOC 2 Type II ·{" "}
            <Link href="/" style={{ color: "var(--text-secondary)" }}>
              ← Back to site
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
