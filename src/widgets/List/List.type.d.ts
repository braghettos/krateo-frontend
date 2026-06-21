export interface List {
  version: string
  /**
   * List renders an array of items, following the Ant Design List API (grid, itemLayout, size, bordered, split, header, footer). Each dataSource element is rendered via itemTemplate, or as a child widget when it carries a resourceRefId. Supersedes DataGrid.
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * antd List grid layout (ListGridType); presence enables grid mode
       */
      grid?: {
        gutter?: number
        column?: number
        xs?: number
        sm?: number
        md?: number
        lg?: number
        xl?: number
        xxl?: number
      }
      /**
       * antd List itemLayout
       */
      itemLayout?: 'horizontal' | 'vertical'
      /**
       * antd List size
       */
      size?: 'default' | 'large' | 'small'
      /**
       * antd List bordered
       */
      bordered?: boolean
      /**
       * antd List split
       */
      split?: boolean
      /**
       * antd List loading
       */
      loading?: boolean
      /**
       * antd List header (ReactNode in antd; string here)
       */
      header?: string
      /**
       * antd List footer (ReactNode in antd; string here)
       */
      footer?: string
      /**
       * antd List dataSource. Each element is a data object (rendered via itemTemplate) or { resourceRefId } (rendered as a child widget).
       */
      dataSource?: {
        [k: string]: unknown
      }[]
      /**
       * serializable substitute for antd renderItem: maps a data element's fields to row slots ({dot.path}; {a|b} first-non-empty)
       */
      itemTemplate?: {
        primaryText?: string
        secondaryText?: string
        subPrimaryText?: string
        subSecondaryText?: string
        icon?: string
        /**
         * leading-indicator style: avatar (solid disc + glyph, default), tile (soft-tint rounded square + glyph), dot (small status dot + halo)
         */
        iconVariant?: 'avatar' | 'tile' | 'dot'
        /**
         * render secondaryText as a soft-tint Tag pill (e.g. a category) instead of plain text
         */
        secondaryTextAsTag?: boolean
        /**
         * per-item navigation target ({dot.path} template, e.g. {link}); when it resolves non-empty the row becomes clickable and navigates there (SPA route)
         */
        navigateTo?: string
        color?: {
          value?: string
          map?: {
            [k: string]: string
          }
          default?: string
        }
        /**
         * per-row horizontal Progress bar (the reconciliation-rail row): an antd Progress line whose percent + stroke colour are resolved per item
         */
        bar?: {
          /**
           * {dot.path} to a 0-100 number (e.g. {healthPercent})
           */
          percent?: string
          color?: {
            value?: string
            map?: {
              [k: string]: string
            }
            default?: string
          }
          /**
           * optional trailing {dot.path} label (e.g. the % text or 7/7)
           */
          label?: string
          variant?: 'line' | 'rail'
        }
        formats?: {
          primaryText?: 'text' | 'datetime' | 'relative'
          secondaryText?: 'text' | 'datetime' | 'relative'
          subPrimaryText?: 'text' | 'datetime' | 'relative'
          subSecondaryText?: 'text' | 'datetime' | 'relative'
        }
        /**
         * per-row action controls rendered as a kebab (⋯) menu on each row; each entry references an action id from widgetData.actions and is fired with the row's data as the action payload (customPayload). Distinct from navigateTo (whole-row click).
         */
        rowActions?: {
          /**
           * id of an action defined in widgetData.actions to fire when this menu item is clicked
           */
          actionId: string
          /**
           * menu item label
           */
          label: string
          /**
           * optional Font Awesome icon name for the menu item
           */
          icon?: string
          /**
           * render the menu item in a destructive (red) style
           */
          danger?: boolean
        }[]
      }
      /**
       * optional SSE endpoint to stream items from (Krateo extension)
       */
      sseEndpoint?: string
      /**
       * optional SSE subscription topic (Krateo extension)
       */
      sseTopic?: string
      /**
       * Filters prefix (Krateo extension)
       */
      prefix?: string
      /**
       * max items kept when streaming (Krateo extension, default 200)
       */
      maxItems?: number
      /**
       * the actions of the widget (canonical map; see src/schemas/actions.schema.json). Referenced per-row by itemTemplate.rowActions.
       */
      actions?: {
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
    resourcesRefs?: {
      items: {
        allowed: boolean
        apiVersion?: string
        id: string
        name?: string
        namespace?: string
        resource?: string
        verb?: 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GET'
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
