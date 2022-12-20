/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    allowMiddlewareResponseBody: true,
    appDir: true,
  },
};

module.exports = nextConfig;
