// PostgreSQL parameters cannot represent identifiers; escape names used in generated SQL.
export const quote = (value) => '"' + String(value).replaceAll('"', '""') + '"';
// Include the table and every key column to avoid collisions across tables and composite keys.
// Keyless tables use the row index, so those identities last only for the current snapshot.
const vertexId = (table, row, index) =>
  JSON.stringify([
    table.name,
    ...(table.primaryKeys.length ? table.primaryKeys.map((k) => row[k]) : [index]),
  ]);
const humanize = (name) => name.replaceAll('_', ' ');
const relationshipLabel = (name) =>
  ({ enrollments: 'enrolled in', teaching_assignments: 'teaches' })[name] || humanize(name);

export function makeGraph(tables, foreignKeys) {
  const nodes = [],
    edges = [];
  const tableByName = new Map(tables.map((t) => [t.name, t]));
  const outgoing = new Map(
    tables.map((t) => [t.name, foreignKeys.filter((fk) => fk.source_table === t.name)]),
  );
  // Collapse unambiguous two-endpoint junctions. Referenced tables and named entities stay vertices.
  const junctions = new Set(
    tables
      .filter((table) => {
        const fks = outgoing.get(table.name);
        if (fks.length !== 2 || fks.some((fk) => !tableByName.has(fk.target_table))) return false;
        if (foreignKeys.some((fk) => fk.target_table === table.name)) return false;
        const columns = table.columns?.map((c) => c.name) || [
          ...new Set(table.rows.flatMap((row) => Object.keys(row))),
        ];
        if (columns.some((c) => ['name', 'title', 'label'].includes(c))) return false;
        const fkColumns = new Set(fks.flatMap((fk) => fk.source_columns));
        return (
          (table.primaryKeys.length > 0 && table.primaryKeys.every((k) => fkColumns.has(k))) ||
          (table.primaryKeys.length === 1 &&
            /(^id$|_id$)/.test(table.primaryKeys[0]) &&
            !fkColumns.has(table.primaryKeys[0])) ||
          (table.primaryKeys.length === 0 &&
            columns.length > 0 &&
            columns.every((c) => fkColumns.has(c)))
        );
      })
      .map((t) => t.name),
  );
  // Resolve links only to rows present in this snapshot; null or unloaded endpoints are skipped.
  function resolve(row, fk) {
    if (fk.source_columns.some((c) => row[c] == null)) return null;
    const table = tableByName.get(fk.target_table);
    if (!table) return null;
    const index = table.rows.findIndex((target) =>
      fk.target_columns.every(
        (c, i) => target[c] != null && String(target[c]) === String(row[fk.source_columns[i]]),
      ),
    );
    return index < 0 ? null : vertexId(table, table.rows[index], index);
  }
  // Entity rows become vertices. Junction rows are represented as edges in the next pass.
  for (const table of tables) {
    if (junctions.has(table.name)) continue;
    table.rows.forEach((row, index) =>
      nodes.push({
        data: {
          id: vertexId(table, row, index),
          label: String(
            row.name ??
              row.title ??
              row.label ??
              (table.primaryKeys.length ? table.primaryKeys.map((k) => row[k]).join(' / ') : index),
          ),
          table: table.name,
          properties: row,
        },
      }),
    );
  }
  for (const table of tables) {
    const fks = outgoing.get(table.name);
    if (junctions.has(table.name)) {
      // Schema order determines direction, independent of the catalog constraint ordering.
      const columns = table.columns?.map((c) => c.name) || [
        ...new Set([...table.primaryKeys, ...table.rows.flatMap((r) => Object.keys(r))]),
      ];
      const ordered = [...fks].sort(
        (a, b) => columns.indexOf(a.source_columns[0]) - columns.indexOf(b.source_columns[0]),
      );
      table.rows.forEach((row, index) => {
        const source = resolve(row, ordered[0]),
          target = resolve(row, ordered[1]);
        if (!source || !target) return;
        edges.push({
          data: {
            id: JSON.stringify(['relationship', table.name, vertexId(table, row, index)]),
            source,
            target,
            label: relationshipLabel(table.name),
            table: table.name,
            properties: row,
            relationship: true,
          },
        });
      });
    } else {
      for (const fk of fks)
        table.rows.forEach((row, index) => {
          const target = resolve(row, fk);
          if (!target) return;
          edges.push({
            data: {
              id: JSON.stringify(['foreign-key', table.name, fk.constraint_name, index]),
              source: vertexId(table, row, index),
              target,
              label: humanize(fk.source_columns.join(', ').replace(/_id\b/g, '')),
              table: table.name,
              properties: Object.fromEntries(fk.source_columns.map((c) => [c, row[c]])),
              relationship: false,
            },
          });
        });
    }
  }
  return { nodes, edges };
}
