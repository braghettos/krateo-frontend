export interface BlueprintBuilder {
  version: string
  /**
   * BlueprintBuilder provides a drag-and-drop interface for visually composing Helm charts from Kubernetes resource types
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * List of Kubernetes resource types available for use as nodes in the builder
       */
      availableResources?: {
        /**
         * Kubernetes resource kind (e.g. Deployment, Service)
         */
        kind: string
        /**
         * Kubernetes API version (e.g. apps/v1, v1)
         */
        apiVersion: string
        /**
         * Resource category for grouping in the palette
         */
        category: 'workloads' | 'networking' | 'config' | 'storage' | 'rbac' | 'custom'
        /**
         * FontAwesome icon class name (e.g. fa-cubes)
         */
        icon?: string
        /**
         * OpenAPI-style JSON schema for this resource kind, read from the API server. Properties describe the spec fields available for configuration.
         */
        schema?: {
          type?: string
          description?: string
          properties?: {
            [k: string]: unknown
          }
          required?: string[]
          [k: string]: unknown
        }
      }[]
      /**
       * Default values for the Helm chart metadata
       */
      chartDefaults?: {
        /**
         * Default chart name
         */
        name?: string
        /**
         * Default chart version
         */
        version?: string
        /**
         * Default application version
         */
        appVersion?: string
        /**
         * Default chart description
         */
        description?: string
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
  }
}
