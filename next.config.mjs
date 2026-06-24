/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // cheerio is used only in server routes; keep it external to the bundle.
  serverExternalPackages: ["cheerio"],
};

export default nextConfig;
