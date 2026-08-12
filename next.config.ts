import type { NextConfig } from "next";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const apiOrigin = apiBase.replace(/\/api\/?$/, "");

const nextConfig: NextConfig = {
  images: {
    // Allow next/image to load employee photos & branding from the API host
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8080",
        pathname: "/uploads/**",
      },
    ],
    // Uploaded assets change in place (logo.png etc.) — skip optimizer cache issues
    unoptimized: false,
  },
  // Proxy /uploads/* through Next so relative URLs also work in the browser
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${apiOrigin}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
