import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['nkuadhiaeosakxxozxmc.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nkuadhiaeosakxxozxmc.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
