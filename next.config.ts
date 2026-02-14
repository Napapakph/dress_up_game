import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd ? '/dress_up_game' : '',
  assetPrefix: isProd ? '/dress_up_game/' : '',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? '/dress_up_game' : '',
  },
};

export default nextConfig;
