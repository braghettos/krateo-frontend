import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

// Plugin to print current config name during development
const printConfigPlugin = () => ({
  configResolved(config: { command: string }) {
    if (config.command === 'serve') {
      const configName = process.env.VITE_CONFIG_NAME
      if (configName) {
        const configFile = `config.${configName}.json`
        // eslint-disable-next-line no-console
        console.log(`\n🔧 Using config: ${configFile}\n`)
      } else {
        // eslint-disable-next-line no-console
        console.log(`\n🔧 Using config: config.json\n`)
      }
    }
  },
  name: 'print-config',
})

// Optional kagent-ui base for the dev-only Autopilot same-origin proxy (see server.proxy below).
const autopilotProxyTarget = process.env.VITE_AUTOPILOT_PROXY_TARGET

// https://vitejs.dev/config/
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
      },
    }),
    printConfigPlugin(),
  ],
  server: {
    port: 4000,
    // Optional dev-only same-origin proxy for the Autopilot A2A endpoint, mirroring the
    // production nginx `location /autopilot/`. Opt in by pointing it at a reachable
    // kagent-ui, then set AUTOPILOT_API_BASE_URL to "/autopilot" in the active config:
    //   VITE_AUTOPILOT_PROXY_TARGET=http://<kagent-ui>:8080 npm run dev
    // Unset → no proxy is registered (no behavior change). Replaces the throwaway CORS proxy.
    ...(autopilotProxyTarget
      ? {
        proxy: {
          '/autopilot': {
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/autopilot/, '/api/a2a/krateo-system/krateo-autopilot'),
            target: autopilotProxyTarget,
          },
        },
      }
      : {}),
  },
})
