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
  env: {
    TZ: 'Europe/Rome', // Forza il timezone del server
  },

  // ✅ CONFIGURAZIONE CORRETTA PER NEXT.JS 14
  experimental: {
    serverComponentsExternalPackages: ['ssh2', 'ssh2-sftp-client'],
    // ✅ Configurazione Turbopack per moduli esterni
    turbo: {
      rules: {
        '*.node': {
          loaders: ['ignore-loader'],
        },
      },
    },
  },
  
  // ✅ CONFIGURA WEBPACK PER ESCLUDERE MODULI NATIVI (solo quando non si usa Turbopack)
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // ✅ SOLO SUL SERVER
    if (isServer) {
      // Escludi moduli nativi dal bundling
      config.externals = config.externals || [];
      config.externals.push({
        'ssh2': 'commonjs ssh2',
        'ssh2-sftp-client': 'commonjs ssh2-sftp-client',
      });
    }

    return config;
  },
};

export default config;
