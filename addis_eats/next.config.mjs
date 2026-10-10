/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: Next 16 (Turbopack) removed the `optimizePackageImports` key —
  // package-import optimisation is automatic now, so it must not be listed
  // here (it produces a "Unrecognized key(s)" build warning).
  images: {
    qualities: [60, 75],
  },
};

export default nextConfig;
