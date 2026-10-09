export type CategoryRecord = { id: string; [key: string]: unknown }

export type CategoryNode = {
  record: CategoryRecord
  children: CategoryNode[]
}

/** Link by ID so categories with the same name stay in their own branch. */
export function buildCategoryTree(records: CategoryRecord[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>()
  for (const record of records) {
    if (!nodes.has(record.id)) nodes.set(record.id, { record, children: [] })
  }

  const roots: CategoryNode[] = []
  const linkedParents = new Map<string, string>()
  for (const node of nodes.values()) {
    const parentId = node.record.parent
    const parent =
      typeof parentId === "string" ? nodes.get(parentId) : undefined
    // Keep incomplete records visible, and break cycles instead of hiding rows.
    let ancestor = parent?.record.id
    while (ancestor && ancestor !== node.record.id) {
      ancestor = linkedParents.get(ancestor)
    }
    if (!parent || ancestor === node.record.id) {
      roots.push(node)
    } else {
      parent.children.push(node)
      linkedParents.set(node.record.id, parent.record.id)
    }
  }
  return roots
}

/** A matching child keeps its ancestors; a matching parent keeps its branch. */
export function filterCategoryTree(
  nodes: CategoryNode[],
  search: string
): CategoryNode[] {
  const term = search.trim().toLocaleLowerCase()
  if (!term) return nodes
  return nodes.flatMap((node) => {
    if (
      [node.record.name, node.record.description].some((value) =>
        String(value ?? "")
          .toLocaleLowerCase()
          .includes(term)
      )
    )
      return [node]
    const children = filterCategoryTree(node.children, term)
    return children.length ? [{ ...node, children }] : []
  })
}

export function categoryRows(
  nodes: CategoryNode[],
  collapsed: ReadonlySet<string> = new Set(),
  ancestors: string[] = []
): { node: CategoryNode; depth: number; parentPath: string }[] {
  return nodes.flatMap((node) => [
    { node, depth: ancestors.length, parentPath: ancestors.join(" / ") },
    ...(collapsed.has(node.record.id)
      ? []
      : categoryRows(node.children, collapsed, [
          ...ancestors,
          String(node.record.name ?? "Untitled category"),
        ])),
  ])
}
