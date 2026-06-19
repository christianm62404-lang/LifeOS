/**
 * Security headers applied to every response. These are conservative defaults
 * that harden the app without breaking functionality:
 *  - HSTS forces HTTPS (effective once served over TLS in production).
 *  - frame-ancestors / X-Frame-Options prevent clickjacking.
 *  - X-Content-Type-Options stops MIME sniffing.
 *  - Referrer-Policy limits referrer leakage.
 *  - Permissions-Policy disables powerful APIs we don't use.
 *  - A baseline CSP locks down framing, plugins, base URIs and form targets.
 */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js injects inline runtime scripts/styles; 'unsafe-eval' is needed
      // by the dev server. This can be tightened to nonces in production.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // Supabase REST/Auth (https) and Realtime (wss).
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
