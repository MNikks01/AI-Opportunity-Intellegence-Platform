/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile workspace TS packages on the fly (no prebuild step needed in dev).
  transpilePackages: ["@aioi/ui", "@aioi/shared", "@aioi/database"],
  // Prisma is a server-only dependency.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
