/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "webservice.sballando.it",
        pathname: "/storage/**",
      },
    ],
  },

  // 👇 aggiungi questa parte
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["date-fns-tz", "socket.io-client"],
  env: {
    TZ: 'Europe/Rome', // Forza il timezone del server
  },
};

export default config;
