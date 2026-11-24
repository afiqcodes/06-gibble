import React, { useState } from 'react';
import './landing.css';

const palettes = [
  ['#638e69', '#a8c78c', '#3f6952', '#dbe8cd'],
  ['#cf9162', '#efc494', '#a96949', '#f3e4cd'],
  ['#759baf', '#b8d1d9', '#4c758d', '#ddeaf0'],
  ['#a495b7', '#d1c3de', '#756689', '#eee5f1'],
  ['#95975a', '#cbd09a', '#6c7445', '#ecebd5'],
  ['#bf8790', '#e6b9b8', '#945d72', '#f4e0df'],
];

// Card artwork is drawn locally in SVG, avoiding separate image files for every graph.
function Dinosaur({ variant = 0, palette = 0 }) {
  const [base, light, dark] = palettes[palette % palettes.length];
  const styles = { '--dino-base': base, '--dino-light': light, '--dino-dark': dark };
  return (
    <svg className="paper-dinosaur" viewBox="0 0 300 185" aria-hidden="true" style={styles}>
      <ellipse cx="150" cy="163" rx="87" ry="7" fill={dark} opacity=".09" />
      {variant % 4 === 0 ? (
        <g>
          <polygon
            className="dino-base"
            points="29,133 105,116 131,67 183,33 241,44 233,76 190,78 177,112 190,148 212,162 171,160 150,129 130,158 100,163 107,139 72,148"
          />
          <polygon className="dino-light" points="131,67 183,33 174,78 105,116" />
          <polygon className="dino-dark" points="29,133 105,116 107,139 72,148" />
          <polygon className="dino-dark" points="105,116 174,78 150,129 130,158 100,163 107,139" />
          <polygon className="dino-light" points="183,33 241,44 174,78" />
          <polygon className="dino-dark" points="177,98 206,99 196,114 177,109" />
          <path className="dino-crease" d="M105 116 150 129 174 78M150 129 171 160M190 78 233 76" />
          <circle cx="219" cy="55" r="2.5" fill={dark} />
        </g>
      ) : variant % 4 === 1 ? (
        <g>
          <polygon
            className="dino-base"
            points="23,140 88,100 158,101 181,41 180,20 217,18 232,33 209,47 200,113 184,140 184,164 165,164 153,132 118,132 104,164 84,164 88,131"
          />
          <polygon className="dino-light" points="88,100 158,101 130,127 23,140" />
          <polygon className="dino-dark" points="88,100 130,127 104,164 84,164 88,131 23,140" />
          <polygon className="dino-light" points="181,41 209,47 200,113 158,101" />
          <polygon
            className="dino-dark"
            points="158,101 200,113 184,140 184,164 165,164 153,132 130,127"
          />
          <polygon className="dino-light" points="180,20 217,18 209,47" />
          <path className="dino-crease" d="m158 101 26 39m-54-13 23 5m56-85-9 66" />
          <circle cx="216" cy="30" r="2" fill={dark} />
        </g>
      ) : variant % 4 === 2 ? (
        <g>
          <polygon
            className="dino-light"
            points="75,100 88,68 108,93 121,57 143,86 165,58 180,92 201,77 207,111"
          />
          <polygon
            className="dino-base"
            points="23,121 74,94 139,86 190,98 216,115 252,116 271,138 233,148 205,140 193,163 173,163 166,139 116,141 99,163 79,163 81,131 43,138"
          />
          <polygon className="dino-dark" points="23,121 74,94 81,131 43,138" />
          <polygon className="dino-light" points="74,94 139,86 166,139 81,131" />
          <polygon className="dino-dark" points="81,131 166,139 116,141 99,163 79,163" />
          <polygon className="dino-dark" points="139,86 190,98 205,140 193,163 173,163 166,139" />
          <polygon className="dino-light" points="216,115 252,116 233,148 205,140" />
          <path className="dino-crease" d="m74 94 92 45m24-41-24 41m50-24-11 25" />
          <circle cx="250" cy="130" r="2.5" fill={dark} />
        </g>
      ) : (
        <g>
          <polygon
            className="dino-base"
            points="24,121 86,94 155,86 184,102 202,72 231,79 240,108 264,133 245,147 205,141 191,162 171,162 162,138 111,139 100,161 80,161 81,132 49,139"
          />
          <polygon className="dino-light" points="86,94 155,86 162,138 81,132 24,121" />
          <polygon className="dino-dark" points="24,121 81,132 49,139" />
          <polygon className="dino-dark" points="81,132 162,138 111,139 100,161 80,161" />
          <polygon className="dino-dark" points="155,86 184,102 205,141 191,162 171,162 162,138" />
          <polygon className="dino-light" points="202,72 231,79 240,108 184,102" />
          <polygon className="dino-dark" points="184,102 202,72 210,117 205,141" />
          <polygon fill="#f9f4e4" points="223,109 243,87 237,119" />
          <polygon fill="#f9f4e4" points="246,128 274,116 261,138" />
          <path className="dino-crease" d="m86 94 76 44m22-36 26 15m-5 24 35-33" />
          <circle cx="240" cy="125" r="2.5" fill={dark} />
        </g>
      )}
    </svg>
  );
}

function Tree({ x, y, scale = 1, tone = 0 }) {
  const colors = [
    ['#b9c9aa', '#d4dfc4', '#95b099'],
    ['#8fae8d', '#b6caa0', '#6f987c'],
    ['#70987a', '#9bb58a', '#527d68'],
  ][tone];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-4 0h8v-105h-8Z" fill="#b4ad8e" />
      <polygon
        points="0,-218 -45,-130 -24,-130 -66,-64 -43,-64 -81,-5 81,-5 43,-64 66,-64 24,-130 45,-130"
        fill={colors[0]}
      />
      <polygon points="0,-218 0,-5 -81,-5 -43,-64 -66,-64 -24,-130 -45,-130" fill={colors[1]} />
      <path d="m0-218 0 213 81 0-81-59 66 0-66-66 45 0Z" fill={colors[2]} opacity=".65" />
      <path d="M0-130-24-130M0-64h43" stroke="#fff" strokeOpacity=".15" />
    </g>
  );
}

// This decorative background is hidden from assistive technology; page content stays semantic.
function Forest() {
  return (
    <div className="forest-scene" aria-hidden="true">
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="paper-sky" x2="0" y2="1">
            <stop stopColor="#e8f3f5" />
            <stop offset=".65" stopColor="#f6f8ed" />
            <stop offset="1" stopColor="#e7eddb" />
          </linearGradient>
        </defs>
        <path fill="url(#paper-sky)" d="M0 0h1600v1000H0z" />
        <circle cx="1290" cy="135" r="57" fill="#faf5d9" opacity=".85" />
        <path d="m128 170 65-23 89 23-90 12Z" fill="#fff" opacity=".8" />
        <path d="m193 147-1 35 90-12Z" fill="#dbe9e9" opacity=".6" />
        <path d="m1040 94 76-19 84 19-84 14Z" fill="#fff" opacity=".65" />
        <path d="m381 105 49 14 25-22-10 28-15-6-31 6Z" fill="#c5d6d3" />
        <path
          d="M0 670 180 582 390 728 620 640 910 725 1210 590 1600 695v305H0Z"
          fill="#dae6d3"
          opacity=".5"
        />
        <path d="M0 782 300 679 630 815 1060 697 1400 752 1600 676v324H0Z" fill="#e1e8d2" />
        <Tree x={32} y={762} scale={1.6} />
        <Tree x={149} y={780} scale={1.05} />
        <Tree x={1520} y={795} scale={1.6} />
        <Tree x={1400} y={775} scale={0.9} />
        <path d="M0 876 370 827 760 908 1200 816 1600 859v141H0Z" fill="#d0dec3" />
        <path d="m0 876 370-49-81 173H0Zm1200-60 400 43v141h-110Z" fill="#bacfb2" opacity=".6" />
        <Tree x={-12} y={1000} scale={2.1} tone={2} />
        <Tree x={125} y={1030} scale={1.5} tone={1} />
        <Tree x={1575} y={1020} scale={2.3} tone={2} />
        <Tree x={1430} y={1030} scale={1.3} tone={1} />
        <path d="m200 948 22-32 22 32-22 9Zm1105-24 32-45 32 45-32 11Z" fill="#a4bd94" />
        <path d="m222 916 0 41-22-9Zm1115-37 0 56-32-11Z" fill="#c0d1a6" />
      </svg>
      <div className="paper-grain" />
    </div>
  );
}

export function Landing({ databases, online, busy, filter, onFilter, onOpen, onNew, onReconnect }) {
  // A per-mount seed varies the artwork between visits but keeps cards stable while searching.
  const [seed] = useState(() => Math.floor(Math.random() * 10000));
  function design(id) {
    let hash = seed;
    for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return { variant: hash % 4, palette: Math.floor(hash / 4) % palettes.length };
  }
  return (
    <>
      <Forest />
      <div className="landing-topline">
        <span className="tiny-brand">
          <img src="/trex.svg" alt="" /> A little curiosity goes a long way.
        </span>
        <button className="forest-status" onClick={onReconnect} title="Refresh database connection">
          <i className={online ? 'is-online' : ''} />
          {online ? 'PostgreSQL connected' : 'Exploring in sample mode'}
          <span aria-hidden="true">↻</span>
        </button>
      </div>
      <section className="landing-hero" aria-labelledby="landing-title">
        <span className="hero-kicker">YOUR DATA. A WORLD OF POSSIBILITIES.</span>
        <div className="hero-identity">
          <img src="/trex.svg" alt="Green origami T-rex" />
          <h1 id="landing-title">
            gibble<span>.</span>
          </h1>
        </div>
        <p>Every connection is a new discovery.</p>
        <span className="hero-caption">Write a little SQL. Unfold something wonderful.</span>
        <div className="hero-trail" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
      <section className="forest-gallery" aria-labelledby="gallery-title">
        <div className="gallery-toolbar">
          <div>
            <span className="gallery-kicker">YOUR COLLECTION</span>
            <h2 id="gallery-title">
              A world of connections <span className="collection-count">{databases.length}</span>
            </h2>
          </div>
          <div className="gallery-actions">
            <div className="search">
              <span aria-hidden="true">⌕</span>
              <input
                value={filter}
                onChange={(e) => onFilter(e.target.value)}
                placeholder="Find a graph…"
                aria-label="Search databases"
              />
            </div>
            <button className="primary" onClick={onNew}>
              ＋ New Graph
            </button>
          </div>
        </div>
        <div className="forest-grid">
          {databases.map((db) => {
            const artwork = design(db.id);
            return (
              <button
                className={'forest-card palette-' + artwork.palette}
                key={db.id}
                disabled={busy}
                onClick={() => onOpen(db)}
                aria-label={'Open ' + db.name}
              >
                <div className="card-illustration">
                  <div className="card-orbit" />
                  <span className="card-kind">{db.demo ? 'SAMPLE GRAPH' : 'POSTGRESQL'}</span>
                  <span className="illustration-spark" aria-hidden="true">
                    ✧
                  </span>
                  <Dinosaur {...artwork} />
                  <span className="paper-ground" />
                </div>
                <div className="forest-card-content">
                  <h3>{db.name}</h3>
                  <p>
                    {db.demo
                      ? 'Meet the people. Follow the connections.'
                      : 'A new perspective, waiting to unfold.'}
                  </p>
                  <div className="forest-card-meta">
                    <span>
                      <i />
                      {db.demo ? '8 vertices · 6 edges' : 'Your database'}
                    </span>
                    <span className="open-graph" aria-hidden="true">
                      ↗
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {!databases.length && (
          <div className="forest-empty">
            <span aria-hidden="true">⌕</span>
            <h3>No graphs found.</h3>
            <p>Try another name, or start a new connection.</p>
            <button onClick={() => onFilter('')}>Clear search</button>
          </div>
        )}
        <p className="gallery-whisper">
          <span aria-hidden="true">⌁</span> Big discoveries begin with small connections.
        </p>
      </section>
    </>
  );
}

// App owns form state and database requests; this component renders the setup screen.
export function CreateGraph({ name, onName, onSubmit, onCancel, online, busy, onReconnect }) {
  return (
    <section className="create-workspace">
      <div className="breadcrumb">
        <button onClick={onCancel}>Databases</button> / New graph
      </div>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A NEW WORLD STARTS HERE</div>
          <h1>
            Let's make connections<span className="title-dot">.</span>
          </h1>
          <p>Give your graph a home, then bring it to life with SQL.</p>
        </div>
      </div>
      <div className="create-paper">
        <div className="create-illustration">
          <Dinosaur variant={1} palette={0} />
          <span>
            One small fold.
            <br />
            Endless possibilities.
          </span>
        </div>
        <form className="create-graph-form" onSubmit={onSubmit}>
          <span className="gallery-kicker">YOUR NEW WORKSPACE</span>
          <h2>Give your graph a name.</h2>
          <p>We'll create a PostgreSQL database for your tables and connections.</p>
          <label htmlFor="graph-name">Graph name</label>
          <input
            id="graph-name"
            autoFocus
            required
            maxLength={41}
            pattern="[a-zA-Z][a-zA-Z0-9 _-]*"
            placeholder="e.g. Research connections"
            value={name}
            onChange={(e) => onName(e.target.value)}
          />
          <small>Start with a letter. Spaces, numbers, underscores, and hyphens welcome.</small>
          {!online && (
            <div className="create-offline">
              <p>
                PostgreSQL isn't connected yet. Start your database with{' '}
                <code>docker compose up -d</code>, then reconnect.
              </p>
              <button type="button" onClick={onReconnect}>
                Reconnect ↻
              </button>
            </div>
          )}
          <div className="create-actions">
            <button type="button" disabled={busy} onClick={onCancel}>
              Back to graphs
            </button>
            <button className="primary" disabled={busy || !name.trim()}>
              {busy ? 'Creating…' : 'Create graph ↗'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
