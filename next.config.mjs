/** @type {import('next').NextConfig} */
const nextConfig = {
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