# Gibble logbook

## 2026-11-18 — Initial request and implementation

### User prompt

Create another project within this directory, similar to the HugeGraph/Hubble web portal, where users create their own PostgreSQL databases with SQL instead of calling HugeGraph/Hubble APIs. Display data as vertices and edges, with charts and tables as alternatives.

Requested technologies: HTML, CSS, JavaScript, React.js, Cytoscape.js, Apache ECharts, TanStack Table, Monaco Editor, Node.js, Express, REST/JSON, SQL, and PostgreSQL.

Requested pages: Databases as three-column database cards with New Graph; Workspace containing SQL Query, Graph Overview with search and linked data, Tables, and Charts.

Requested identity: Gibble; paper/origami theme; green origami T-rex logo; predominantly white, meteor-orange accents and footer. Include LOGBOOK.md, README.md, and ARCHITECTURE.md.

### Implementation decisions

- Isolate the project in `gibble/` within the requested directory.
- Use one real PostgreSQL database per graph and introspect public tables, primary keys, and foreign keys.
- Include an explicitly read-only sample for exploring visuals before PostgreSQL setup.
- Use an original code-native SVG origami dinosaur rather than a remote image.
- Keep deployment local; document trusted-user SQL privileges and the initial 500-row visualization limit.
- Record subsequent user prompts and implementation changes here as the project evolves.

### Verification

- Dependency installation completed; package-lock.json records the resolved versions.
- Three Node tests passed (identifier quoting, composite foreign keys/null handling, and distinct keyless vertices).
- Production Vite compilation passed.
- HTTP smoke checks passed for production HTML, invalid database names, offline database errors, and unknown API routes.
- Live PostgreSQL integration could not be run because the local account cannot access the Docker daemon. Browser interaction has not been manually verified.
- Compatible npm audit fixes were attempted. Six advisories remain in the Monaco/DOMPurify and Vite/glob dependency chains (one critical, four high, one moderate); do not treat this initial local prototype as deployment-hardened.

## 2026-11-18 — Collapsible sidebar

User prompt: “make the side navigation bar collapse-able”

Added an accessible header toggle to collapse the sidebar into an icon rail and expand it again. The preference persists in localStorage, with a compact default on small screens. Navigation buttons retain accessible names and hover titles; the workspace gains width on desktop, and expanded mobile navigation overlays the content. Graph, chart, and Monaco resize observers adjust their views to the available space. Reduced-motion preferences disable the sidebar animation.

## 2026-11-18 — Remove footer

User prompt: “remove the footer”

Removed the shared footer from all pages.

## 2026-11-18 — Origami forest landing page redesign

### User prompt

Redesign the portal landing page to display graphs/databases below a centered logo and “gibble.” hero. Use four-column database cards, a short search bar and New Graph button at the top right of the grid, randomized paper-origami dinosaur card designs (repetition allowed), and a paper-origami forest background with clear skies. Selecting a graph or New Graph should navigate into the workspace.

### Changes

- Created a full-width, sidebar-free landing page with a centered wordmark and original SVG paper landscape: clear sky, folded clouds, sun, layered hills, and origami trees.
- Added four dinosaur illustrations (T-rex, long-neck, stegosaurus, and triceratops) with six coordinated paper palettes. Each database gets a randomized illustration/palette assignment that stays stable while searching in the current landing visit.
- Displayed actual database cards in a four-column desktop grid, adapting to two columns on smaller screens and one on very narrow screens. Kept the read-only sample labeled and added search empty-state handling.
- Moved New Graph into a dedicated workspace creation screen. Successful database creation opens SQL Query; selecting an existing card opens its graph workspace. Preserved collapsible workspace navigation and the previous footer removal.

### Verification

- Production build passed. The existing ECharts bundle-size warning remains.
- Headless Chromium checks passed at 1440 × 1050 and 390 × 844.
- Verified four desktop grid columns and two mobile columns, no horizontal overflow, hidden landing navigation, and no footer.
- Verified New Graph opens the workspace creation form, cancellation returns to the gallery, search shows an empty state and can reset, and the sample card opens the graph workspace.
- Visually inspected desktop and mobile screenshots. Live PostgreSQL creation still depends on the user's local database setup and was not exercised in this redesign.

## 2026-11-18 — Fix API conflict with HugeGraph portal

User supplied a screenshot showing healthy PostgreSQL but an immediately exiting Gibble API and Vite falling back to port 5175. Inspected local listeners and confirmed port 3001 belonged to the separate 05-hugegraphportal project; requests through Gibble were reaching that project's API. Changed Gibble’s default and local environment API port to 3002, made the Vite proxy follow PORT from .env, and added explicit startup error handling. No other project's processes or configuration were changed.

## 2026-11-18 — Fix graph rendering after relationship inserts

User supplied a screenshot reporting `fk.source_columns.some is not a function`. Confirmed PostgreSQL catalog `name[]` aggregates were returned by node-postgres as strings, whereas explicit `text[]` aggregates decode as JavaScript arrays. Cast source and target catalog column names to text before aggregation, extracted the shared foreign-key metadata query, and added an opt-in read-only PostgreSQL regression test. Verified that all 30 enrollments and 11 teaching assignments were already saved; no user records were modified.

## 2026-11-18 — Direct relationship edges

User prompt: “could you do that?” (replace numeric junction nodes with direct, labeled relationship edges).

Project unambiguous two-foreign-key junction rows into direct entity-to-entity edges. Enrollments are labeled “enrolled in” and teaching assignments “teaches”; other junctions use readable table names. Keep SQL records unchanged and available in Tables/Charts. Preserve composite keys, parallel relationships, self-relations, and ordinary foreign-key edges; retain referenced or named entity tables as vertices. Display edge labels, table-based vertex colors, dynamic legend, edge property inspection, and connection search with automatic framing.

### Verification

- All eight tests passed, including read-only PostgreSQL metadata integration, direct relationship labels/direction, parallel and composite relationships, missing/null endpoints, and retained referenced/named entities.
- Production build passed with the existing ECharts chunk-size warning.
- Live university snapshot verified 22 entity vertices and 41 direct edges (30 enrollments and 11 teaching assignments).
- Headless Chromium verified rendered edge labels, connection-property inspection, and Hateem search highlighting four directly connected subjects. Visually inspected the resulting screenshot.
- No database records or schema were changed.

## 2026-11-18 — Enter-to-search connected subgraphs

User prompt: “when user enter a name, subject or anything on the nodes, press enter and the graph will show only the node and what connected to it”

Separate the search draft from the applied query. Enter or Search now applies a case-insensitive search to vertex labels and property values, displays matched nodes and their directly connected neighbors/edges, and hides all unrelated elements. Remove the optional connections checkbox. Preserve property inspection without changing the active filter when clicking nodes. Add matching counts, a no-results state, Show all nodes, and Fit graph reset.
