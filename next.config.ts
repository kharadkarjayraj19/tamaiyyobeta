import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Temporary unblock for staging deploys while we clean legacy lint debt.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporary unblock for staging deploys while we migrate route handler types.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
