export interface Form {
  /**
   * widget version
   */
  version: string
  /**
   * name of the k8s Custom Resource
   */
  kind: string
  spec: {
    /**
     * the data that will be passed to the widget on the frontend
     */
    widgetData: {
      /**
       * antd Form layout
       */
      layout?: 'horizontal' | 'vertical' | 'inline'
      /**
       * antd Form size
       */
      size?: 'small' | 'middle' | 'large'
      /**
       * antd Form disabled (disables all fields)
       */
      disabled?: boolean
      /**
       * the actions of the widget
       */
      actions: {
        /**
         * rest api call actions triggered by the widget
         */
        rest?: {
          /**
           * array of headers as strings, format 'key: value'
           */
          headers: string[]
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
           * url to navigate to after successful execution
           */
          onSuccessNavigateTo?: string
          /**
           * a message that will be displayed inside a toast in case of error
           */
          errorMessage?: string
          /**
           * a message that will be displayed inside a toast in case of success
           */
          successMessage?: string
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
       * custom labels and icons for form buttons
       */
      buttonConfig?: {
        /**
         * primary button configuration
         */
        primary?: {
          /**
           * text label for primary button
           */
          label?: string
          /**
           * icon name for primary button
           */
          icon?: string
        }
        /**
         * secondary button configuration
         */
        secondary?: {
          /**
           * text label for secondary button
           */
          label?: string
          /**
           * icon name for secondary button
           */
          icon?: string
          /**
           * when set, the secondary button is a Cancel that navigates to this route (SPA) instead of resetting the form
           */
          navigateTo?: string
        }
        /**
         * draft button configuration — only rendered when widgetData.draftActionId is also set; clicking it persists the current (un-validated) field values via that action
         */
        draft?: {
          /**
           * text label for draft button
           */
          label?: string
          /**
           * icon name for draft button
           */
          icon?: string
        }
      }
      /**
       * optional object with initial values for form fields. Keys should match form field names (supports nested objects). These values override schema defaults.
       */
      initialValues?: Record<string, unknown>
      /**
       * resourceRefIds of form-control widgets (Input, Select, Switch, …) to compose inside the Form. Composable mode — an alternative to the schema/stringSchema generator.
       */
      items?: {
        /**
         * the identifier of the form-control widget to render
         */
        resourceRefId: string
      }[]
      /**
       * JSON schema (e.g. a blueprint CRD's openAPIV3Schema spec) rendered as form fields — the schema-driven alternative to `items`. Usually populated server-side via a widgetDataTemplate jq expression that extracts the spec schema.
       */
      schema?: Record<string, unknown>
      /**
       * top-level schema property names to omit from the schema-driven form
       */
      propertiesToHide?: string[]
      /**
       * the id of the action to be called when the form is submitted
       */
      submitActionId: string
      /**
       * optional id of an action fired by a 'Save draft' button that captures the CURRENT field values WITHOUT running form validation (so an incomplete form can be persisted). Pair with buttonConfig.draft to show the button.
       */
      draftActionId?: string
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
