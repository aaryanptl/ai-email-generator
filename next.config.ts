import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sucrase", "@react-email/render", "@react-email/components"],
};

export default nextConfig;
