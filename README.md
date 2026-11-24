# Gibble

Fold data into connections. Gibble is a local SQL-to-graph portal with a paper-inspired white interface, meteor-orange accents, a green origami T-rex, and a clear-sky origami forest landing page.

## Requirements

Node.js 20.19+ or 22.12+, npm, and Docker Compose (or an existing PostgreSQL 17 instance). Node 24 LTS is recommended.

## Run locally

```bash
cd gibble
cp .env.example .env
npm install
docker compose up -d
npm run dev
```

Open http://localhost:5173. The Vite development server proxies REST calls to the Express server on port 3002. If port 5432 is already used, change the host-side Compose port and PGPORT together. Existing PostgreSQL users can skip Docker and set connection values in `.env`; the configured role must have CREATEDB permission and access to its created databases.

If the connection fails, run `npm run db:check` from the `gibble` directory. This read-only check prints the database target (without the password), checks the same graph listing query as the app, and reports connection or authentication errors. The app also displays connection failures and lets you retry with the connection button. To inspect the database service, run `docker compose ps` and `docker compose logs --tail 50 postgres`. Restart `npm run dev` after editing `.env`. Compose credentials initialize a new volume only; changing them does not change credentials in an existing database volume.

The sample graph works without PostgreSQL and is explicitly read-only. Click **New Graph**, enter a name, and run the supplied starter SQL in **SQL Query** to create your first real dataset. Run the starter once per new database; later executions will report that the tables exist. Your SQL persists in PostgreSQL, not browser storage. Editor drafts reset on page reload.

## Pages

- **Databases:** centered Gibble hero, four-column dinosaur cards on desktop, search, a sample graph, and a New Graph button that opens workspace setup. The gallery uses two columns on smaller screens and one on very narrow screens.
- **SQL Query:** Monaco editor, multi-statement execution, PostgreSQL errors, affected-row counts, and query result tables.
- **Graph Overview:** Cytoscape vertices and labeled directed edges, zoom/pan, Enter-to-search vertex labels/property values with only matches and their direct connections displayed, and click-to-inspect properties.
- **Tables:** TanStack sorting, row filtering, pagination, and table selection.
- **Charts:** ECharts bar, line, and donut charts; choose a table and grouping column to chart record counts.

Rows become vertices. Primary keys identify them; foreign keys produce edges. Composite keys are supported. Tables without primary keys use snapshot row indices, so stable identifiers require a primary key. To represent many-to-many relationships, create a junction table with two foreign keys: unambiguous junction records become direct labeled edges between their endpoints (for example, Student → enrolled in → Subject and Teacher → teaches → Subject). Junctions are identified by two foreign keys, no name/title/label column, and a primary key made of those keys or a surrogate ID (keyless tables containing only foreign-key columns also qualify). Tables referenced by other tables remain vertices. Relationship properties are available by clicking an edge. To give Ahmad four links, insert four rows in a relationship table referencing Ahmad; then search Ahmad and press Enter. Fit graph or Show all nodes restores the complete graph.

Graphs open with **Group by table**, which separates tables into columns and orders nodes by their connections to reduce edge crossings. Search results are arranged again for the visible connections. Choose **Spread out** for a force-directed layout, or press **Untangle** to rearrange the current view after dragging nodes. Single-table graphs use the spread layout automatically. Dense graphs can still have crossing edges; searching for a node narrows the view to its direct connections.

Graph/table/chart snapshots load at most 500 rows per table. Links whose endpoints fall outside that sample are omitted. Counts in Tables show full table counts, whereas workspace vertex/edge counts describe the loaded snapshot. Charts aggregate loaded rows, not all server rows. SQL query results are returned in full; use LIMIT for large queries.

## Production build on your machine

```bash
npm run build
npm start
```

Open http://localhost:3002. Express serves the compiled frontend and API. Run `npm test` for graph transformation checks. Stop the database with `docker compose down`; its named volume persists. Never remove the volume unless you intend to delete all graph databases.

## Code formatting

Prettier is installed as a pinned development dependency. From the `gibble` directory, run:

```bash
npm run format        # Format source, tests, styles, configuration, and documentation
npm run format:check  # Check formatting without changing files
```

The shared settings are in `.prettierrc.json`: two-space indentation, single-quoted JavaScript strings, semicolons, and a preferred line width of 100 characters. `.prettierignore` excludes dependencies, build output, generated artwork, environment files, and the npm-managed lockfile. Editors with Prettier support can use this configuration for format-on-save.

Start with `src/Landing.jsx` and `src/landing.css` for the landing page, `src/main.jsx` and `src/style.css` for the workspace, or `src/Graph.jsx` and `src/graph-layout.js` for graph behavior. Database routes live in `server/index.js`; `server/graph.js` converts database rows and relationships into graph elements. Comments explain the state transitions, snapshot limits, search behavior, and database connection lifecycle.

## Scope and security

This is a trusted, single-user local development portal, not a multi-tenant service. The API binds to loopback. Vite binds to all interfaces for development previews; do not expose it to untrusted networks. SQL executes with the configured PostgreSQL role's privileges, including destructive statements and cross-database administrative operations. Database-name validation is not a SQL sandbox. Do not use production credentials or expose the API publicly without authentication, authorization, separate limited roles per graph, and query controls. The included database password is for local development only.

Query submissions run inside a transaction with 10-second statement and 3-second lock timeouts. Do not submit transaction-control statements or commands that require execution outside a transaction (such as CREATE DATABASE); use New Graph for database creation. Connection disposal resets session changes. Monaco loads editor resources from its default CDN and optional Google fonts use the network; system fonts are the fallback. An offline Monaco deployment needs locally bundled editor workers.

See ARCHITECTURE.md for system structure and LOGBOOK.md for the implementation record.

## Verification status

Production compilation, graph unit tests, and local HTTP smoke checks passed during implementation. Full PostgreSQL integration remains unverified because Docker daemon access was denied in the implementation environment. The redesigned landing page was verified in headless Chromium at desktop and mobile sizes, including search, sample graph navigation, and the New Graph setup screen. The initial dependency audit still reports six advisories (including critical DOMPurify and high glob-chain findings) after compatible fixes; review and update the dependency chains before any shared deployment.

If Vite reports that port 5173 is occupied, open the actual Local URL printed in the terminal. Other projects may already use those ports. Gibble uses API port 3002 by default; changing PORT in .env also updates Vite’s proxy after restarting npm run dev. A port collision now produces an explicit startup error.
