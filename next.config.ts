import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pages use time-based revalidation plus revalidatePath() from dashboard actions
  // (the "previous" caching model), so Cache Components stays off.
  cacheComponents: false,
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "yrxvjuyqorgwvdfpyewg.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
};

export default nextConfig;
