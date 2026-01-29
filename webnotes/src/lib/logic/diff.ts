// src/lib/logic/diff.ts

// Helper to extract blocks with IDs from Tiptap JSON
export function getBlockIds(content: any) {
  const ids = new Set<string>();
  const contentMap = new Map<string, string>(); // ID -> stringified inner content

  const traverse = (node: any) => {
    // Only track blocks that have IDs (headings, paragraphs, etc. provided by UniqueID)
    if (node.attrs && node.attrs.id) {
      ids.add(node.attrs.id);
      // Hash content to check for modifications
      // We JSON.stringify the 'content' array to catch inner text changes
      contentMap.set(node.attrs.id, JSON.stringify(node.content || []));
    }

    // Recursive traversal
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  };

  let json = content;

  // Handle string input
  if (typeof content === "string") {
    try {
      json = JSON.parse(content);
    } catch (e) {
      // Invalid JSON, return empty
      return { ids, contentMap };
    }
  }

  // Start traversal
  if (json && json.type === "doc") {
    traverse(json);
  }

  return { ids, contentMap };
}

export function computeBlockDiff(currentJson: any, historicJson: any) {
  const current = getBlockIds(currentJson);
  const historic = getBlockIds(historicJson);

  const addedIds = new Set<string>();
  const removedIds = new Set<string>();
  const modifiedIds = new Set<string>();

  // Find Added (In Current, Not in Historic)
  current.ids.forEach((id) => {
    if (!historic.ids.has(id)) {
      addedIds.add(id);
    } else if (current.contentMap.get(id) !== historic.contentMap.get(id)) {
      // Exists in both, but content changed
      modifiedIds.add(id);
    }
  });

  // Find Removed (In Historic, Not in Current)
  historic.ids.forEach((id) => {
    if (!current.ids.has(id)) {
      removedIds.add(id);
    }
  });

  return { addedIds, removedIds, modifiedIds };
}
