/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Used only in server routes; keep them external to the bundle.
  serverExternalPackages: ["cheerio", "undici"],
};

export default nextConfig;
