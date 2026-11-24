// Keep each table in a column, then order rows around their neighbors' positions.
// Sorting before each sweep makes opening the same snapshot produce the same layout.
export function groupedPositions(nodes, edges, dimensions = new Map()) {
  const groups = new Map();
  const neighbors = new Map(nodes.map(({ data }) => [data.id, new Set()]));
  for (const { data } of nodes) {
    const table = data.table || '';
    if (!groups.has(table)) groups.set(table, []);
    groups.get(table).push(data);
  }
  for (const { data } of edges) {
    if (data.source === data.target || !neighbors.has(data.source) || !neighbors.has(data.target))
      continue;
    neighbors.get(data.source).add(data.target);
    neighbors.get(data.target).add(data.source);
  }

  const columns = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, rows]) => {
      rows.sort(
        (a, b) => String(a.label).localeCompare(String(b.label)) || a.id.localeCompare(b.id),
      );
      return {
        rows,
        // Account for rendered labels, which can extend beyond the node circles.
        width: Math.max(150, ...rows.map((row) => (dimensions.get(row.id)?.w || 0) + 80)),
        step: Math.max(100, ...rows.map((row) => (dimensions.get(row.id)?.h || 0) + 40)),
      };
    });
  const positions = new Map();
  function placeRows(column, x) {
    column.rows.forEach((row, index) =>
      positions.set(row.id, {
        x,
        y: (index - (column.rows.length - 1) / 2) * column.step,
      }),
    );
  }
  let x = 0;
  columns.forEach((column, index) => {
    if (index) x += columns[index - 1].width / 2 + 100 + column.width / 2;
    placeRows(column, x);
  });

  // Alternate directions so neither end of the graph controls all row ordering.
  for (let sweep = 0; sweep < 8; sweep++) {
    for (const column of sweep % 2 ? [...columns].reverse() : columns) {
      const ids = new Set(column.rows.map((row) => row.id));
      const scores = new Map(
        column.rows.map((row) => {
          const connected = [...neighbors.get(row.id)].filter((id) => !ids.has(id));
          // Move toward the average height of connected nodes in other table columns.
          const score = connected.length
            ? connected.reduce((sum, id) => sum + positions.get(id).y, 0) / connected.length
            : positions.get(row.id).y;
          return [row.id, score];
        }),
      );
      // Stable ties keep the existing order instead of reintroducing crossings.
      column.rows.sort((a, b) => scores.get(a.id) - scores.get(b.id));
      placeRows(column, positions.get(column.rows[0].id).x);
    }
  }
  return positions;
}

export function arrangeGraph(cy, mode = 'grouped') {
  // Work on the current search results so Untangle never brings hidden nodes back.
  const visible = cy.elements(':visible');
  const nodes = visible.nodes();
  if (!nodes.length) return;
  const tableCount = new Set(nodes.map((node) => node.data('table'))).size;
  if (mode === 'grouped' && tableCount > 1) {
    const sizes = new Map(
      nodes.map((node) => [
        node.id(),
        node.layoutDimensions({ nodeDimensionsIncludeLabels: true }),
      ]),
    );
    const positions = groupedPositions(
      nodes.map((node) => ({ data: node.data() })),
      visible.edges().map((edge) => ({ data: edge.data() })),
      sizes,
    );
    visible
      .layout({
        name: 'preset',
        positions: (node) => positions.get(node.id()),
        fit: true,
        padding: 65,
        animate: false,
      })
      .run();
  } else {
    // A fresh starting point avoids keeping an already tangled arrangement.
    visible
      .layout({
        name: 'cose',
        animate: false,
        fit: true,
        padding: 65,
        randomize: true,
        nodeDimensionsIncludeLabels: true,
        nodeRepulsion: () => 16000,
        nodeOverlap: 24,
        idealEdgeLength: () => 170,
        componentSpacing: 140,
        numIter: 2000,
      })
      .run();
  }
  if (cy.zoom() > 1.6) {
    cy.zoom(1.6);
    cy.center(visible);
  }
}
