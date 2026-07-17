/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["lh3.googleusercontent.com", "avatars.githubusercontent.com"],
  },
  experimental: {
    // Tell the bundler to tree-shake barrel packages properly —
    // prevents lucide-react from loading all ~1500 icons on every page
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "recharts",
      "date-fns",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
    ],
    serverComponentsExternalPackages: ["bcryptjs", "@prisma/client", "googleapis", "exceljs"],
  },
};

export default nextConfig;
