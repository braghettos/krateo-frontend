export interface Theme {
  version: string
  /**
   * Theme applies tenant brand overrides app-wide (Brand v2, issue #49 §7). It renders no visible UI — a side-effect widget that sets CSS custom properties on :root. Mount one globally (e.g. in the app-shell).
   */
  kind: string
  spec: {
    /**
     * Tenant Theme overrides (Brand v2, issue #49 §7). Every field is optional — a Theme overrides any SUBSET. Tier-2 tokens (status/agent/focus ring/chart palette) are intentionally NOT here: they are locked and cannot be overridden by a tenant.
     */
    widgetData: {
      /**
       * when set, PIN the color mode (overrides the user's light/dark toggle preference for this tenant)
       */
      mode?: 'dark' | 'light'
      /**
       * tenant brand logo (used on the login panel; sider brand is chart-driven)
       */
      logo?: {
        /**
         * logo image URL
         */
        url?: string
        /**
         * logo alt text
         */
        alt?: string
      }
      /**
       * overridable Tier-1 design tokens. Applied as CSS custom properties (--krateo-* / legacy --*-color) at runtime, so CSS-module and index.css styling re-tint. Only these named tokens are overridable.
       */
      token?: {
        /**
         * brand/interaction colour → --primary-color + --krateo-color-action-primary
         */
        colorPrimary?: string
        /**
         * page background → --background-color + --krateo-color-background-base
         */
        colorBgLayout?: string
        /**
         * card/panel surface → --panelbg-color + --krateo-color-background-surface
         */
        colorBgContainer?: string
        /**
         * hairline border → --border-color + --krateo-color-border-subtle
         */
        colorBorder?: string
        /**
         * default text → --text-color + --krateo-color-text-default
         */
        colorText?: string
        /**
         * UI font stack → --font-family + --krateo-font-ui
         */
        fontFamily?: string
        /**
         * base font size in px
         */
        fontSize?: number
      }
      /**
       * non-token brand chrome overrides (sidebar + nav)
       */
      custom?: {
        /**
         * sidebar rail gradient stops (→ --krateo-nav-gradient-* / --menubgstart/end-color)
         */
        sidebar?: {
          bgGradientStart?: string
          bgGradientEnd?: string
        }
        /**
         * sidebar nav-item colours (→ --menuitem-color / --menuitembg-color / --krateo-nav-item*)
         */
        menu?: {
          itemColor?: string
          itemHoverColor?: string
          itemSelectedBg?: string
          itemSelectedColor?: string
        }
      }
    }
    apiRef?: {
      name: string
      namespace: string
    }
    widgetDataTemplate?: {
      forPath?: string
      expression?: string
    }[]
    resourcesRefs?: {
      items: {
        allowed?: boolean
        apiVersion?: string
        id: string
        name?: string
        namespace?: string
        payload?: {
          [k: string]: unknown
        }
        resource?: string
        verb?: 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GET'
        slice?: {
          offset?: number
          page: number
          perPage: number
          continue?: boolean
          [k: string]: unknown
        }
        [k: string]: unknown
      }[]
      [k: string]: unknown
    }
    resourcesRefsTemplate?: {
      iterator?: string
      template?: {
        apiVersion?: string
        id?: string
        name?: string
        namespace?: string
        payload?: {
          [k: string]: unknown
        }
        resource?: string
        verb?: 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GET'
      }
    }[]
    [k: string]: unknown
  }
}
