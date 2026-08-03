export interface Image {
  /**
   * Image renders the antd Image component (a single image with optional preview/zoom and a fallback)
   */
  kind: string
  spec: {
    apiRef?: {
      name: string
      namespace: string
    }
    widgetData: {
      /**
       * the image source URL (antd Image `src`)
       */
      src: string
      /**
       * alternative text (antd Image `alt`)
       */
      alt?: string
      /**
       * image width in px (number) or any CSS length (string) — antd Image `width`
       */
      width?: number | string
      /**
       * image height in px (number) or any CSS length (string) — antd Image `height`
       */
      height?: number | string
      /**
       * whether clicking the image opens the zoom/preview overlay (antd Image `preview`); set false for decorative images such as logos
       */
      preview?: boolean
      /**
       * image src to show if `src` fails to load (antd Image `fallback`)
       */
      fallback?: string
      /**
       * show the default blurred placeholder while loading (antd Image `placeholder`)
       */
      placeholder?: boolean
      /**
       * class name on the image wrapper (antd Image `rootClassName`)
       */
      rootClassName?: string
      /**
       * native lazy/eager loading hint (antd Image `loading`)
       */
      loading?: 'eager' | 'lazy'
      /**
       * CORS setting for the request (native img `crossOrigin`)
       */
      crossOrigin?: 'anonymous' | 'use-credentials' | ''
      /**
       * image decoding hint (native img `decoding`)
       */
      decoding?: 'async' | 'auto' | 'sync'
      /**
       * referrer policy for the request (native img `referrerPolicy`)
       */
      referrerPolicy?:
        | ''
        | 'no-referrer'
        | 'no-referrer-when-downgrade'
        | 'origin'
        | 'origin-when-cross-origin'
        | 'same-origin'
        | 'strict-origin'
        | 'strict-origin-when-cross-origin'
        | 'unsafe-url'
      /**
       * responsive sizes hint (native img `sizes`)
       */
      sizes?: string
      /**
       * responsive source set (native img `srcSet`)
       */
      srcSet?: string
      /**
       * name of an image map (native img `useMap`)
       */
      useMap?: string
      /**
       * whether the image is draggable (native img `draggable`)
       */
      draggable?: boolean
      /**
       * native title tooltip (native img `title`)
       */
      title?: string
    }
    widgetDataTemplate?: {
      expression?: string
      forPath?: string
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
  }
  version: string
}
