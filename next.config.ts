import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "1gb",
    },
  },
  api: {
    bodyParser: false,
  },
};

export default nextConfig;
