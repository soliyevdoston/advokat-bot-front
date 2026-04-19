import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1";
const backendOrigin = (() => {
  try { return new URL(BACKEND_URL).origin; } catch { return "http://localhost:8080"; }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Allow images from backend origin if needed in future
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "advokat-bot-7gcq.onrender.com" },
      { protocol: "http", hostname: "localhost" },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

// suppress unused var warning
void backendOrigin;

export default nextConfig;
