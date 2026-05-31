/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
