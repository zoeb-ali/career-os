import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output = a self-contained server.js with only the deps it
  // actually needs, copied into the runtime stage of frontend/Dockerfile.
  // Vercel packages Next.js itself and its build fails with standalone
  // output (missing .next/next-server.js.nft.json), so skip it there.
  // Vercel sets VERCEL=1 during its builds.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
