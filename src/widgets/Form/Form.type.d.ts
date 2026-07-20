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
           * ordered list of DISTINCT writes applied as ONE gated set (e.g. one Form submit creating a Role AND its RoleBinding): each op resolves its OWN resourceRefId (verb + path + payload base) and builds its OWN payload/payloadToOverride against the SAME submitted values. The whole set is gated behind ONE aggregated blast-radius confirm and dispatched sequentially with stop-on-first-error and per-item results (W0-4 applySet semantics). Mutually exclusive with fanOutPath; onEventNavigateTo is not supported on a multi-op action. The action's own top-level payload/payloadToOverride are IGNORED when ops is present and its top-level resourceRefId is ignored for dispatch (it must still name a valid resource ref — point it at the first op's)
           */
          ops?: {
            /**
             * the identifier of the resource ref this op targets: its verb (must be mutating), path and payload base
             */
            resourceRefId: string
            /**
             * static payload sent with this op's request
             */
            payload?: {
              [k: string]: unknown
            }
            /**
             * list of this op's payload fields to override dynamically (values interpolate against the same submitted values as every other op)
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
          }[]
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
        /**
         * Configure-step button label when reviewBeforeSubmit is set (the button that opens the in-place Review; default 'Review →')
         */
        review?: {
          /**
           * text label for the Review button
           */
          label?: string
        }
        /**
         * Review-step back button label when reviewBeforeSubmit is set (returns to editing; default '← Back to edit')
         */
        reviewBack?: {
          /**
           * text label for the back-to-edit button
           */
          label?: string
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
       * JSON schema (e.g. a blueprint CRD's openAPIV3Schema spec) rendered as form fields — the schema-driven alternative to `items`. Usually populated server-side via a widgetDataTemplate jq expression that extracts the spec schema. Note: a schema sourced from a CRD's openAPIV3Schema has its `properties` map serialized alphabetically (order lost); use `stringSchema` to preserve the source values.schema.json authoring order.
       */
      schema?: Record<string, unknown>
      /**
       * Same JSON schema as `schema`, but as a raw JSON STRING. Preferred over `schema` when present: the client JSON.parses it, preserving key insertion order, so fields render in the source values.schema.json order rather than the alphabetized order a CRD-sourced object schema yields. Typically populated server-side from the blueprint's per-version jsonschema ConfigMap (which keeps authoring order). Falls back to `schema` when absent or not valid JSON.
       */
      stringSchema?: string
      /**
       * top-level schema property names to omit from the schema-driven form
       */
      propertiesToHide?: string[]
      /**
       * when true (inline render only), the primary button validates and reveals an in-place read-only Review of the entered values before the real submit — the form stays mounted so 'Back to edit' preserves every value. Pair with buttonConfig.review / buttonConfig.reviewBack for custom labels.
       */
      reviewBeforeSubmit?: boolean
      /**
       * when true, the primary (submit) button stays disabled until at least one field differs from its initial value (initialValues overlaid on schema defaults). Use for update forms where submitting an unchanged value is a no-op — e.g. a version picker pre-set to the currently-installed version.
       */
      submitDisabledWhenPristine?: boolean
      /**
       * the id of the action to be called when the form is submitted
       */
      submitActionId: string
      /**
       * optional id of an action fired by a 'Save draft' button that captures the CURRENT field values WITHOUT running form validation (so an incomplete form can be persisted). Pair with buttonConfig.draft to show the button.
       */
      draftActionId?: string
      /**
       * optional field-conditional submit routing: when present, the submit action is chosen at submit time from the value of the named field. Routes one form to different create targets (e.g. a 'target cluster' select where 'local' posts the blueprint instance and a remote spoke posts a RemoteInstall). Falls back to `default` (or `submitActionId`) when the field value has no mapping.
       */
      submitActionSelector?: {
        /**
         * form field whose current value selects the submit action
         */
        field: string
        /**
         * map of field-value → action id
         */
        map: Record<string, string>
        /**
         * action id used when the field value is not present in `map`
         */
        default?: string
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
  }
}
