/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/automatizaciones',
  trailingSlash: true,
  images: { unoptimized: true },
};
module.exports = nextConfig;
