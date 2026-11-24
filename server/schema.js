// Cast PostgreSQL catalog name values to text so node-postgres decodes text[] as JavaScript arrays.
// Ordinality pairs each source column with its target in the correct composite-key order.
export const foreignKeyQuery = `
  SELECT
    c.conname AS constraint_name,
    s.relname AS source_table,
    t.relname AS target_table,
    array_agg(sa.attname::text ORDER BY k.ord) AS source_columns,
    array_agg(ta.attname::text ORDER BY k.ord) AS target_columns
  FROM pg_constraint c
  JOIN pg_class s ON s.oid = c.conrelid
  JOIN pg_namespace ns ON ns.oid = s.relnamespace
  JOIN pg_class t ON t.oid = c.confrelid
  JOIN pg_namespace nt ON nt.oid = t.relnamespace
  CROSS JOIN LATERAL unnest(c.conkey, c.confkey) WITH ORDINALITY AS k(src, dst, ord)
  JOIN pg_attribute sa ON sa.attrelid = s.oid AND sa.attnum = k.src
  JOIN pg_attribute ta ON ta.attrelid = t.oid AND ta.attnum = k.dst
  WHERE c.contype = 'f' AND ns.nspname = 'public' AND nt.nspname = 'public'
  GROUP BY c.oid, c.conname, s.relname, t.relname
`;
