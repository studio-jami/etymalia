/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@etymalia/ai",
    "@etymalia/asset-forge",
    "@etymalia/availability",
    "@etymalia/exporters",
    "@etymalia/name-engine",
    "@etymalia/tokens",
  ],
};

export default nextConfig;

