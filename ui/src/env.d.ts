/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONFIG_NAME?: string
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** App version (package.json `version`) inlined at build time — see vite.config.ts `define`. */
declare const __APP_VERSION__: string
/** Build marker (git short-SHA, or `dev` with no repo) inlined at build time. */
declare const __APP_BUILD__: string
