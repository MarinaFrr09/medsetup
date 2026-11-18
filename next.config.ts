import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  ...(isGithubPages
    ? {
        output: "export",
        basePath: "/medsetup",
        assetPrefix: "/medsetup/",
        trailingSlash: true,
        images: {
          unoptimized: true,
        },
      }
    : {
        serverExternalPackages: ["@prisma/client"],
      }),
  compress: true,
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  experimental: {
    staleTimes: {
      dynamic: 180,
      static: 300,
    },
    optimizePackageImports: [
      "lucide-react",
      "@xyflow/react",
      "@xyflow/system",
      "framer-motion",
      "date-fns",
      "jspdf",
      "html-to-image",
      "tailwind-merge",
      "clsx",
      "katex",
      "react-hot-toast",
      "zustand"
    ],
    ...(!isGithubPages
      ? {
          serverActions: {
            bodySizeLimit: "100mb",
          },
        }
      : {}),
  },
};

export default nextConfig;
