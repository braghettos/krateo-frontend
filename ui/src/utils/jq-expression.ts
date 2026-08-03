import { useConfigContext } from '../context/ConfigContext'

import { getAccessToken } from './getAccessToken'
/**
 * Resolves a single jq expression wrapped in ${}
 * Example: '${"repo name: " + .json.spec.git.toRepo.name + ", event reason: " + .event.reason + ", response kind: " + .response.kind}'
 */
export function useResolveJqExpression() {
  const { config } = useConfigContext()
  const url = `${config!.api.SNOWPLOW_API_BASE_URL}/jq`

  return async (expression: string, values: Record<string, unknown>) => {
    // Expression must be wrapped in ${}
    if (!expression.startsWith('${') || !expression.endsWith('}')) {
      console.warn('Expression must be wrapped in curly braces with dollar sign prefix')
      return expression
    }

    // Remove ${ and }
    const jqExpression = expression.slice(2, -1)

    try {
      const res = await fetch(url, {
        body: JSON.stringify({ data: values, query: jqExpression }),
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      if (!res.ok) {
        throw new Error(`API request failed: ${res.status} ${res.statusText}`)
      }

      return (await res.json()) as string
    } catch (error) {
      console.error(`Failed to resolve jq expression: ${jqExpression}`, error)
      return ''
    }
  }
}
