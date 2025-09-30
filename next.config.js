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

  // ✅ CONFIGURAZIONE CORRETTA PER NEXT.JS 14
  experimental: {
    serverComponentsExternalPackages: ['ssh2', 'ssh2-sftp-client'],
  },
  
  // ✅ CONFIGURA WEBPACK PER ESCLUDERE MODULI NATIVI
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // ✅ SOLO SUL SERVER
    if (isServer) {
      // Escludi moduli nativi dal bundling
      config.externals.push({
        'ssh2': 'ssh2',
        'ssh2-sftp-client': 'ssh2-sftp-client',
        'node:fs': 'node:fs',
        'node:path': 'node:path',
        'node:crypto': 'node:crypto',
      });
    }

    // ✅ PREVIENI BUNDLING DI MODULI NATIVI
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    });

    return config;
  },
};

export default config;
