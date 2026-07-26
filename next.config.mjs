/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["mongoose", "bcryptjs"],
};

export default nextConfig;
