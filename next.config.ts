import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the multi-stage Dockerfile (standalone Node server).
  output: "standalone",
};

export default nextConfig;
