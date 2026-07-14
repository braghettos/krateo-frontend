export interface Card {
  version: string
  /**
   * Card is a container to display information
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * the Krateo event actions of the widget (renamed from `actions`, which collides with antd Card.actions)
       */
      widgetActions?: {
        /**
         * rest api call actions triggered by the widget
         */
        rest?: {
          /**
           * unique identifier for the action
           */
          id: string
          /**
           * the identifier of the k8s custom resource that should be represented
           */
          resourceRefId: string
          /**
           * whether user confirmation is required before triggering the action
           */
          requireConfirmation?: boolean
          /**
           * a message that will be displayed inside a toast in case of error
           */
          errorMessage?: string
          /**
           * name of an ARRAY field in the submitted values: the action fans out into ONE ordered write per element (for each write, that field is replaced by the single element before payload/payloadToOverride interpolation). The whole set is gated behind ONE aggregated blast-radius confirm and dispatched sequentially with stop-on-first-error and per-item results (W0-4 applySet semantics); onEventNavigateTo is not supported on a fan-out action
           */
          fanOutPath?: string
          /**
           * a message that will be displayed inside a toast in case of success
           */
          successMessage?: string
          /**
           * url to navigate to after successful execution
           */
          onSuccessNavigateTo?: string
          /**
           * conditional navigation triggered by a specific event
           */
          onEventNavigateTo?: {
            /**
             * identifier of the awaited event reason
             */
            eventReason: string
            /**
             * url to navigate to when the event is received
             */
            url: string
            /**
             * the timeout in seconds to wait for the event
             */
            timeout?: number
            reloadRoutes?: boolean
            /**
             * message to display while waiting for the event
             */
            loadingMessage?: string
          }
          /**
           * type of action to execute
           */
          type: 'rest'
          /**
           * array of headers as strings, format 'key: value'
           */
          headers: string[]
          /**
           * static payload sent with the request
           */
          payload?: {
            [k: string]: unknown
          }
          /**
           * list of payload fields to override dynamically
           */
          payloadToOverride?: {
            /**
             * name of the field to override
             */
            name: string
            /**
             * value to use for overriding the field
             */
            value: string
          }[]
          loading?: {
            display: boolean
          }
        }[]
        /**
         * client-side navigation actions
         */
        navigate?: {
          /**
           * unique identifier for the action
           */
          id: string
          loading?: {
            display: boolean
          }
          /**
           * the identifier of the route to navigate to
           */
          path?: string
          /**
           * the identifier of the k8s custom resource that should be represented
           */
          resourceRefId?: string
          /**
           * whether user confirmation is required before navigating
           */
          requireConfirmation?: boolean
          /**
           * type of navigation action
           */
          type: 'navigate'
        }[]
        /**
         * actions to open side drawer components
         */
        openDrawer?: {
          /**
           * unique identifier for the drawer action
           */
          id: string
          /**
           * type of drawer action
           */
          type: 'openDrawer'
          /**
           * the identifier of the k8s custom resource that should be represented
           */
          resourceRefId: string
          /**
           * whether user confirmation is required before opening
           */
          requireConfirmation?: boolean
          /**
           * drawer size to be displayed
           */
          size?: 'default' | 'large'
          /**
           * title shown in the drawer header
           */
          title?: string
          loading?: {
            display: boolean
          }
        }[]
        /**
         * actions to open modal dialog components
         */
        openModal?: {
          /**
           * unique identifier for the modal action
           */
          id: string
          /**
           * type of modal action
           */
          type: 'openModal'
          /**
           * the identifier of the k8s custom resource that should be represented
           */
          resourceRefId: string
          /**
           * whether user confirmation is required before opening
           */
          requireConfirmation?: boolean
          /**
           * title shown in the modal header
           */
          title?: string
          loading?: {
            display: boolean
          }
          /**
           * the custom width of the value, which should be used by setting the 'custom' value inside the 'size' property
           */
          customWidth?: string
          /**
           * sets the Modal size, 'default' is 520px, 'large' is 80% of the screen width, 'fullscreen' is 100% of the screen width, 'custom' should be used with the 'customWidth' property
           */
          size?: 'default' | 'large' | 'fullscreen' | 'custom'
        }[]
      }
      /**
       * the id of the action to be executed when the panel is clicked
       */
      clickActionId?: string
      /**
       * footer section of the panel containing additional items
       */
      footer?: {
        /**
         * the identifier of the k8s custom resource that should be represented, usually a widget
         */
        resourceRefId: string
      }[]
      /**
       * optional text to be displayed under the title, on the left side of the Card
       */
      headerLeft?: string
      /**
       * antd Card extra — content shown top-right of the card header (renamed from `headerRight`)
       */
      extra?: string
      /**
       * how `extra` renders top-right: `text` (default, plain) or `badge` (a status pill — glow dot + uppercase mono, e.g. a CONVERGED/DRIFT/DEGRADED reconcile chip)
       */
      extraVariant?: 'text' | 'badge'
      /**
       * antd Badge status driving the `extraVariant: badge` colour (processing=cyan/healthy, warning=amber/drift, error=crimson/failed)
       */
      extraStatus?: 'success' | 'processing' | 'warning' | 'error' | 'default'
      /**
       * show a pulsing "Live" badge next to the card title (for cards backed by a live/SSE feed)
       */
      live?: boolean
      /**
       * optional legend key shown top-right of the card header (e.g. the reconciliation-rail actual/drift/target swatches): each item is a small colour swatch + label
       */
      legend?: {
        /**
         * swatch colour (palette name, e.g. cyan / magenta / amber)
         */
        color: string
        /**
         * swatch label (e.g. actual / drift / target)
         */
        label: string
      }[]
      /**
       * antd Card variant
       */
      variant?: 'outlined' | 'borderless'
      /**
       * antd Card size
       */
      size?: 'default' | 'small'
      /**
       * resourceRefId of a widget rendered as the antd Card cover
       */
      cover?: string
      /**
       * icon displayed in the panel header
       */
      icon?: {
        /**
         * name of the icon to display (font awesome icon name eg: `fa-inbox`)
         */
        name: string
        /**
         * color of the icon
         */
        color?: string
      }
      /**
       * list of resource references to display as main content in the panel
       */
      items: {
        /**
         * the identifier of the k8s custom resource that should be represented, usually a widget
         */
        resourceRefId: string
      }[]
      /**
       * list of string tags to be displayed in the footer
       */
      tags?: string[]
      /**
       * text to be displayed as the panel title
       */
      title?: string
      /**
       * how the panel title is rendered. 'heading' (default) = readable card heading (marketplace tiles, detail headers). 'eyebrow' = small mono uppercase letter-spaced muted caption (flight-deck section/panel labels).
       */
      titleVariant?: 'heading' | 'eyebrow'
      /**
       * optional tooltip text shown on the top right side of the card to provide additional context
       */
      tooltip?: string
      /**
       * live-refresh watch: involvedObject(s) this widget is tied to (see src/schemas/watch.schema.json). A matching k8s event refetches the widget.
       */
      watch?: {
        /**
         * group/version, e.g. composition.krateo.io/v1alpha1
         */
        apiVersion: string
        /**
         * e.g. DemoClaim
         */
        kind: string
        /**
         * scope to a namespace; omit to match any
         */
        namespace?: string
        /**
         * a specific object; omit to match any object of this kind ("GVR-level")
         */
        name?: string
      }[]
    }
    resourcesRefs: {
      items: {
        allowed: boolean
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
    apiRef?: {
      name: string
      namespace: string
    }
    widgetDataTemplate?: {
      forPath?: string
      expression?: string
    }[]
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
}
