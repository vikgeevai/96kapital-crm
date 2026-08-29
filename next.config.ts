import type { NextConfig } from "next";

/**
 * Response headers.
 *
 * This project had none at all, while the KAPVOY site it feeds has carried
 * them since launch — the wrong way round, given this is the one holding lead
 * data behind an admin login.
 *
 * X-Frame-Options is the load-bearing one here: without it the dashboard and
 * login can be framed by another origin, which is how clickjacking works. The
 * rest are cheap and standard.
 *
 * Deliberately no Content-Security-Policy yet. A CSP that is wrong is worse
 * than none — it silently breaks Recharts, the inline styles this UI relies
 * on, and framer-motion — so it wants its own change with the browser console
 * watched, not a line slipped in here.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here needs a camera, a microphone or a location.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
];

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
