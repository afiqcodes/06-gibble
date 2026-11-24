import React, { useEffect, useMemo, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { arrangeGraph } from './graph-layout';
const colors = [
  ['#e5efe5', '#4b7d59'],
  ['#fae5ce', '#bd814b'],
  ['#e3edf5', '#64859f'],
  ['#efe6f5', '#9575a7'],
  ['#f3e9d0', '#aa9655'],
];
export default function Graph({ snapshot }) {
  const el = useRef(),
    cy = useRef();
  // Keep the input draft separate from the submitted query so typing never hides nodes.
  const [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [selected, setSelected] = useState(null),
    [matchCount, setMatchCount] = useState(0);
  const [layout, setLayout] = useState('grouped');
  const tables = useMemo(
    () => [...new Set(snapshot.nodes.map((n) => n.data.table))].sort(),
    [snapshot],
  );
  // Cytoscape owns its canvas and listeners. Rebuild only when the snapshot changes.
  useEffect(() => {
    setSelected(null);
    const c = cytoscape({
      container: el.current,
      elements: [...snapshot.nodes, ...snapshot.edges],
      layout: { name: 'preset', fit: false },
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#e5efe5',
            'border-color': '#4b7d59',
            'border-width': 2,
            label: 'data(label)',
            'font-family': 'system-ui',
            'font-size': 11,
            'text-valign': 'bottom',
            'text-margin-y': 8,
            'text-wrap': 'wrap',
            'text-max-width': 110,
            'min-zoomed-font-size': 7,
            width: 38,
            height: 38,
            color: '#344b3e',
          },
        },
        ...tables.map((table, i) => ({
          selector: (node) => node.isNode() && node.data('table') === table,
          style: {
            'background-color': colors[i % colors.length][0],
            'border-color': colors[i % colors.length][1],
          },
        })),
        {
          selector: 'edge',
          style: {
            width: 1.4,
            'line-color': '#bac9b6',
            'target-arrow-color': '#8ca387',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': 9,
            'font-family': 'system-ui',
            color: '#708267',
            'text-rotation': 'autorotate',
            'text-background-color': '#fcfdf9',
            'text-background-opacity': 0.92,
            'text-background-padding': 3,
            'min-zoomed-font-size': 7,
          },
        },
        { selector: '.search-hidden', style: { display: 'none' } },
        { selector: '.match', style: { 'border-color': '#e47a3b', 'border-width': 4 } },
        {
          selector: 'edge:selected',
          style: { 'line-color': '#df8b50', 'target-arrow-color': '#df8b50', width: 2.5 },
        },
      ],
    });
    cy.current = c;
    c.on('tap', 'node', (e) => {
      setSelected({ kind: 'vertex', ...e.target.data() });
    });
    c.on('tap', 'edge', (e) => {
      const edge = e.target;
      setSelected({
        kind: 'edge',
        ...edge.data(),
        sourceLabel: edge.source().data('label'),
        targetLabel: edge.target().data('label'),
      });
    });
    // Resizing refits the view without rearranging nodes the user has dragged.
    const observer = new ResizeObserver(() => {
      c.resize();
      const visible = c.elements(':visible');
      if (visible.length) c.fit(visible, 65);
    });
    observer.observe(el.current);
    return () => {
      observer.disconnect();
      c.destroy();
    };
  }, [snapshot, tables]);
  // Filtering changes visibility, preserving all graph data for Show all nodes.
  useEffect(() => {
    const c = cy.current;
    if (!c) return;
    c.batch(() => {
      c.elements().removeClass('search-hidden match');
      if (query) {
        const term = query.toLowerCase();
        const matches = c.nodes().filter((node) =>
          [node.data('label'), ...Object.values(node.data('properties') || {})].some((value) =>
            String(typeof value === 'object' ? JSON.stringify(value) : (value ?? ''))
              .toLowerCase()
              .includes(term),
          ),
        );
        matches.addClass('match');
        // Include each match, its immediate neighbors, and their connecting edges.
        const visible = matches.closedNeighborhood();
        c.elements().difference(visible).addClass('search-hidden');
        setMatchCount(matches.length);
      } else setMatchCount(0);
    });
    const visible = c.elements(':visible');
    if (visible.length) arrangeGraph(c, layout);
  }, [query, snapshot, layout]);
  function reset() {
    setSearch('');
    setQuery('');
    setSelected(null);
    cy.current.elements().unselect();
    const visible = cy.current.elements();
    visible.removeClass('search-hidden match');
    cy.current.fit(visible, 65);
  }
  return (
    <>
      <div className="view-toolbar">
        <form
          className="search graph-search-form"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setSelected(null);
            cy.current.elements().unselect();
            setQuery(search.trim());
          }}
        >
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Find a vertex"
            aria-describedby="graph-search-help"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a name, subject, or value…"
          />
          <button type="submit">Search ↵</button>
        </form>
        <span id="graph-search-help" className="graph-search-help">
          Press Enter to show connections
        </span>
        <label>
          Layout{' '}
          <select value={layout} onChange={(e) => setLayout(e.target.value)}>
            <option value="grouped">Group by table</option>
            <option value="spread">Spread out</option>
          </select>
        </label>
        <button onClick={() => arrangeGraph(cy.current, layout)}>Untangle</button>
        <button onClick={reset}>Fit graph ↗</button>
      </div>
      {query && (
        <div className="graph-search-status" role="status">
          {matchCount
            ? `${matchCount} matching ${matchCount === 1 ? 'node' : 'nodes'} and their direct connections`
            : `No nodes match “${query}”.`}
          <button onClick={reset}>Show all nodes</button>
        </div>
      )}
      <div className="graph-wrap">
        <div ref={el} className="graph" />
        {(!snapshot.nodes.length || Boolean(query && !matchCount)) && (
          <div className="empty overlay">
            {query
              ? 'No matching nodes. Try another search or show all nodes.'
              : 'Your graph starts with a table. Create tables and foreign keys in SQL Query.'}
          </div>
        )}
        <div className="graph-legend">
          {tables.map((table, i) => (
            <span className="graph-table-key" key={table}>
              <i style={{ background: colors[i % colors.length][1] }} />
              {table.replaceAll('_', ' ')}
            </span>
          ))}
          <span className="graph-help">Click a node or edge to inspect · Scroll to zoom</span>
        </div>
        {selected && (
          <aside className="inspector">
            <small>{selected.kind === 'edge' ? 'CONNECTION DETAILS' : 'VERTEX DETAILS'}</small>
            <h3>{selected.label}</h3>
            {selected.kind === 'edge' ? (
              <p>
                {selected.sourceLabel} → {selected.targetLabel}
              </p>
            ) : (
              <p>{cy.current?.getElementById(selected.id).connectedEdges().length} connections</p>
            )}
            <small>{selected.table?.replaceAll('_', ' ')}</small>
            <pre>{JSON.stringify(selected.properties, null, 2)}</pre>
            <button
              onClick={() => {
                setSelected(null);
                cy.current.elements().unselect();
              }}
            >
              Close
            </button>
          </aside>
        )}
      </div>
    </>
  );
}
