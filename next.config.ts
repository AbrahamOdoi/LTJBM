import type { NextConfig } from "next";

/**
 * Tightened CSP for Phase F.
 * Next.js App Router still needs 'unsafe-inline' for styles and (in many
 * deployments) scripts; 'unsafe-eval' is omitted so production builds stay
 * stricter. object/frame/base/form locked down.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // upgrade-insecure-requests omitted so local HTTP demos keep working;
      // enable at the reverse-proxy layer for HTTPS production hosts.
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Required for the multi-stage Dockerfile (standalone Node server).
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
