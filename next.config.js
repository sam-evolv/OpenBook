/** @type {import('next').NextConfig} */
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig = {
  ...(isCapacitorBuild && {
    output: 'export',
    pageExtensions: ['tsx', 'jsx', 'js'],
  }),
  images: {
    unoptimized: isCapacitorBuild,
    remotePatterns: [
      { protocol: 'https', hostname: 'nrntaowmmemhjfxjqjch.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

module.exports = nextConfig;
