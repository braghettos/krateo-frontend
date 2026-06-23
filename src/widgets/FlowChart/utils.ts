import type { FlowChartData } from './FlowChart'

/** G6 graph data derived from the domain resource list (nodes + parent→child edges). */
export const toGraphData = (data: FlowChartData): { nodes: { id: string; data: Record<string, unknown> }[]; edges: { source: string; target: string }[] } => {
  if (!data || !Array.isArray(data)) {
    return { edges: [], nodes: [] }
  }

  try {
    const nodes = data.map((node) => ({ data: { ...node }, id: node.uid }))

    const edges = data.flatMap((node) =>
      (node.parentRefs ?? [])
        .filter((ref): ref is { uid: string } => typeof ref?.uid === 'string')
        .map((ref) => ({ source: ref.uid, target: node.uid }))
    )

    return { edges, nodes }
  } catch (error) {
    console.error('Error parsing data', error)
    return { edges: [], nodes: [] }
  }
}
