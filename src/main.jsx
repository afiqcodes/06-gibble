import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import Graph from './Graph';
import * as echarts from 'echarts';
import Editor from '@monaco-editor/react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { demo, starterSQL } from './demo';
import './style.css';
import { Landing, CreateGraph } from './Landing';
import { api } from './api';
const icons = { Databases: '▦', 'SQL Query': '⌘', 'Graph Overview': '♧', Tables: '▤', Charts: '◴' };

// SQL results expose column names as strings; snapshots expose objects with name/type metadata.
// Normalize both shapes so every table view shares sorting, filtering, and pagination.
function DataTable({ rows, columns }) {
  const [sorting, setSorting] = useState([]),
    [filter, setFilter] = useState('');
  const defs = useMemo(
    () =>
      columns.map((c) => ({
        accessorKey: typeof c === 'string' ? c : c.name,
        header: typeof c === 'string' ? c : c.name,
        cell: (info) => {
          const v = info.getValue();
          return v === null ? (
            <em>NULL</em>
          ) : typeof v === 'object' ? (
            JSON.stringify(v)
          ) : (
            String(v ?? '')
          );
        },
      })),
    [columns],
  );
  const table = useReactTable({
    data: rows,
    columns: defs,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });
  return (
    <>
      <input
        className="table-filter"
        aria-label="Filter table rows"
        placeholder="Filter rows…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="table-scroll">
        <table>
          <thead>
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id}>
                {g.headers.map((h) => (
                  <th key={h.id}>
                    <button onClick={h.column.getToggleSortingHandler()}>
                      {flexRender(h.column.columnDef.header, h.getContext())}{' '}
                      {h.column.getIsSorted() === 'asc'
                        ? '↑'
                        : h.column.getIsSorted() === 'desc'
                          ? '↓'
                          : '↕'}
                    </button>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id}>
                {r.getVisibleCells().map((c) => (
                  <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="empty">No rows to display.</p>}
      </div>
      <div className="pagination">
        <span>
          {table.getFilteredRowModel().rows.length} rows · Page{' '}
          {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
        </span>
        <button disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
          ← Previous
        </button>
        <button disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
          Next →
        </button>
      </div>
    </>
  );
}
// Charts summarize the loaded snapshot, which can contain fewer rows than the database.
function Charts({ tables }) {
  const [tableName, setTableName] = useState(''),
    [field, setField] = useState(''),
    [type, setType] = useState('bar');
  const table = tables.find((t) => t.name === tableName) || tables[0];
  const col = table?.columns.some((c) => c.name === field)
    ? field
    : table?.columns.find((c) => c.name !== 'id')?.name || table?.columns[0]?.name;
  const el = useRef();
  useEffect(() => {
    if (!el.current) return;
    const chart = echarts.init(el.current);
    const groups = new Map();
    for (const row of table?.rows || []) {
      const key = String(row[col] ?? 'NULL');
      groups.set(key, (groups.get(key) || 0) + 1);
    }
    const data = [...groups].map(([name, value]) => ({ name, value }));
    chart.setOption({
      color: ['#548366', '#e98a4e', '#a4ba89', '#e9c89c'],
      tooltip: { trigger: 'item' },
      grid: { left: 55, right: 35, bottom: 75, top: 35 },
      ...(type === 'pie'
        ? { legend: { bottom: 10 }, series: [{ type: 'pie', radius: ['42%', '68%'], data }] }
        : {
            xAxis: { type: 'category', data: data.map((d) => d.name), axisLabel: { rotate: 25 } },
            yAxis: { type: 'value', minInterval: 1, name: 'Records' },
            series: [
              {
                type,
                data: data.map((d) => d.value),
                itemStyle: { borderRadius: type === 'bar' ? [5, 5, 0, 0] : 0 },
                areaStyle: type === 'line' ? { opacity: 0.1 } : undefined,
              },
            ],
          }),
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el.current);
    return () => {
      // Switching tabs unmounts this canvas; release its observer and chart instance together.
      ro.disconnect();
      chart.dispose();
    };
  }, [table, col, type]);
  return (
    <>
      <div className="view-toolbar">
        <label>
          Table{' '}
          <select value={table?.name || ''} onChange={(e) => setTableName(e.target.value)}>
            {tables.map((t) => (
              <option key={t.name}>{t.name}</option>
            ))}
          </select>
        </label>
        <label>
          Group by{' '}
          <select value={col || ''} onChange={(e) => setField(e.target.value)}>
            {table?.columns.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          Chart{' '}
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Donut</option>
          </select>
        </label>
      </div>
      <div ref={el} className="chart" />
      <p className="hint">
        Record counts grouped by {col || 'a column'}. Based on up to 500 loaded rows per table.
      </p>
    </>
  );
}
function App() {
  // Remember the user's sidebar choice; screen width supplies the initial default only.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('gibble.sidebarCollapsed');
      if (saved !== null) return saved === 'true';
    } catch {}
    return window.matchMedia('(max-width: 800px)').matches;
  });
  useEffect(() => {
    try {
      localStorage.setItem('gibble.sidebarCollapsed', String(sidebarCollapsed));
    } catch {}
  }, [sidebarCollapsed]);
  const [dbs, setDbs] = useState([]),
    [online, setOnline] = useState(false),
    [active, setActive] = useState(null),
    [tab, setTab] = useState('Graph Overview'),
    [snapshot, setSnapshot] = useState(demo),
    [sql, setSql] = useState(starterSQL),
    [result, setResult] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState(false),
    [name, setName] = useState(''),
    [filter, setFilter] = useState(''),
    [tableName, setTableName] = useState('');
  // Keep connection failures visible while leaving the bundled sample available to explore.
  async function loadDatabases() {
    try {
      const list = await api('/databases');
      if (!Array.isArray(list))
        throw Error(
          'The server returned an invalid graph list. Check that this is the Gibble API.',
        );
      setDbs(list);
      setOnline(true);
      setError('');
      return true;
    } catch (e) {
      setOnline(false);
      setError('Database connection failed: ' + e.message);
      return false;
    }
  }
  useEffect(() => {
    loadDatabases();
  }, []);
  // Open sample data locally, or fetch a fresh snapshot before entering a real workspace.
  async function open(db) {
    setError('');
    setBusy(true);
    try {
      const s = db.demo ? demo : await api('/databases/' + db.id + '/snapshot');
      setSnapshot(s);
      setActive(db);
      setResult(null);
      setTab('Graph Overview');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  // Each new graph is a PostgreSQL database. Start it in SQL Query with the starter draft.
  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const db = await api('/databases', { name });
      await loadDatabases();
      setSnapshot({ tables: [], nodes: [], edges: [], limit: 500 });
      setActive(db);
      setTab('SQL Query');
      setSql(starterSQL);
      setResult(null);
      setModal(false);
      setName('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function run() {
    setBusy(true);
    setError('');
    try {
      if (active.demo)
        throw Error(
          'The sample is read-only. Connect PostgreSQL and create a New Graph to run SQL.',
        );
      const data = await api('/databases/' + active.id + '/query', { sql });
      setResult(data);
      // Re-read rows and schema after SQL so graphs, tables, and charts show the saved result.
      setSnapshot(await api('/databases/' + active.id + '/snapshot'));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const table = snapshot.tables.find((t) => t.name === tableName) || snapshot.tables[0];
  // Search affects the gallery only; the read-only sample is always part of its source list.
  const gallery = [{ id: 'sample', name: 'People & connections', demo: true }, ...dbs].filter((d) =>
    d.name.toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <div
      className={
        'app ' +
        (sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded') +
        (!active && !modal ? ' landing-page' : '')
      }
    >
      <aside id="workspace-sidebar" className="sidebar" aria-label="Main navigation">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActive(null);
            setModal(false);
            setError('');
          }}
        >
          <img src="/trex.svg" alt="Green origami T-rex" />
          <span>
            gibble<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="sidebar-label">YOUR DATA, UNFOLDED</div>
        <button
          title="Databases"
          aria-label="Databases"
          className={'nav ' + (!active ? 'chosen' : '')}
          onClick={() => {
            setActive(null);
            setModal(false);
            setError('');
          }}
        >
          <span aria-hidden="true">▦</span>
          <span className="nav-label">Databases</span>
          <b>{dbs.length + 1}</b>
        </button>
        <div className="sidebar-label space">WORKSPACE</div>
        {['SQL Query', 'Graph Overview', 'Tables', 'Charts'].map((t) => (
          <button
            title={t}
            aria-label={t}
            disabled={!active}
            key={t}
            className={'nav ' + (active && tab === t ? 'chosen' : '')}
            onClick={() => {
              setTab(t);
              setError('');
            }}
          >
            <span aria-hidden="true">{icons[t]}</span>
            <span className="nav-label">{t}</span>
          </button>
        ))}
        <div className="paper-note">
          <span>↗</span>
          <h4>
            Small folds.
            <br />
            Big discoveries.
          </h4>
          <p>
            A new perspective is just
            <br />a connection away.
          </p>
          <div className="fold" />
        </div>
        <div className="connection">
          <i className={online ? 'live' : ''} />
          {online ? 'PostgreSQL connected' : 'Sample mode'}
          <button
            title="Retry database connection"
            aria-label="Retry database connection"
            onClick={loadDatabases}
          >
            ↻
          </button>
        </div>
        <div className="profile">
          <div>A</div>
          <span>
            Local workspace<small>Your space to explore</small>
          </span>
        </div>
      </aside>
      <div className="main">
        <header>
          <button
            className="sidebar-toggle"
            type="button"
            aria-controls="workspace-sidebar"
            aria-expanded={!sidebarCollapsed}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setSidebarCollapsed((value) => !value)}
          >
            <span aria-hidden="true">{sidebarCollapsed ? '☰' : '«'}</span>
          </button>
          <div className="header-location">
            Workspace <span>/</span>{' '}
            <strong>{modal ? 'New graph' : active ? active.name : 'Databases'}</strong>
          </div>
          <span className="local-badge">◈ Local workspace</span>
        </header>
        <main>
          {modal ? (
            <CreateGraph
              name={name}
              onName={setName}
              onSubmit={create}
              onCancel={() => {
                setModal(false);
                setError('');
              }}
              online={online}
              busy={busy}
              onReconnect={loadDatabases}
            />
          ) : active ? (
            <>
              <div className="breadcrumb">
                <button
                  onClick={() => {
                    setActive(null);
                    setError('');
                  }}
                >
                  Databases
                </button>{' '}
                / {active.name}
              </div>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">LET YOUR DATA TAKE SHAPE</div>
                  <h1>
                    {active.name}
                    <span className="title-dot">.</span>
                  </h1>
                  <p>
                    {active.demo
                      ? 'A little sample world. Explore how everything connects.'
                      : 'Write a query. Find a connection. Discover something new.'}
                  </p>
                </div>
                <button onClick={() => open(active)} disabled={busy}>
                  ↻ Refresh
                </button>
              </div>
              <div className="stats">
                <span>
                  <b>{snapshot.nodes.length}</b> vertices
                </span>
                <span>
                  <b>{snapshot.edges.length}</b> edges
                </span>
                <span>
                  <b>{snapshot.tables.length}</b> tables
                </span>
                {active.demo && <span className="sample-tag">SAMPLE DATA</span>}
              </div>
              <div className="workspace-panel">
                <nav className="tabs">
                  {['SQL Query', 'Graph Overview', 'Tables', 'Charts'].map((t) => (
                    <button
                      className={tab === t ? 'selected' : ''}
                      onClick={() => setTab(t)}
                      key={t}
                    >
                      {icons[t]} <span>{t}</span>
                    </button>
                  ))}
                </nav>
                {tab === 'SQL Query' ? (
                  <>
                    <div className="view-toolbar">
                      <span className="hint">
                        PostgreSQL · {active.demo ? 'read-only sample' : 'SQL editor'}
                      </span>
                      <button className="primary" disabled={busy || active.demo} onClick={run}>
                        {busy ? 'Running…' : '▷ Run query'}
                      </button>
                    </div>
                    <Editor
                      height="380px"
                      language="sql"
                      theme="light"
                      value={sql}
                      onChange={(value) => setSql(value || '')}
                      options={{
                        fontSize: 13,
                        minimap: { enabled: false },
                        padding: { top: 20 },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                      }}
                    />
                    {active.demo && (
                      <p className="hint padded">
                        Create a New Graph to execute your own SQL against PostgreSQL.
                      </p>
                    )}
                    {result && (
                      <div className="query-results">
                        <p className="success">✓ Query complete in {result.duration} ms</p>
                        {result.results.map((r, i) => (
                          <section key={i}>
                            <h4>
                              {r.command} · {r.rowCount ?? 0} rows
                            </h4>
                            {r.columns.length > 0 && (
                              <DataTable rows={r.rows} columns={r.columns} />
                            )}
                          </section>
                        ))}
                      </div>
                    )}
                  </>
                ) : tab === 'Graph Overview' ? (
                  <Graph snapshot={snapshot} />
                ) : tab === 'Tables' ? (
                  <div className="padded">
                    <div className="view-toolbar">
                      <select
                        aria-label="Choose table"
                        value={table?.name || ''}
                        onChange={(e) => setTableName(e.target.value)}
                      >
                        {snapshot.tables.map((t) => (
                          <option key={t.name}>{t.name}</option>
                        ))}
                      </select>
                      <span className="hint">
                        {table?.count || 0} total records · showing up to 500
                      </span>
                    </div>
                    {table ? (
                      <DataTable rows={table.rows} columns={table.columns} />
                    ) : (
                      <div className="empty">Create your first table in SQL Query.</div>
                    )}
                  </div>
                ) : (
                  <Charts tables={snapshot.tables} />
                )}
              </div>
            </>
          ) : (
            <Landing
              databases={gallery}
              online={online}
              busy={busy}
              filter={filter}
              onFilter={setFilter}
              onOpen={open}
              onNew={() => {
                setActive(null);
                setName('');
                setModal(true);
                setError('');
              }}
              onReconnect={loadDatabases}
            />
          )}
          {error && (
            <div role="alert" className="error">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError('')}>
                ×
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
