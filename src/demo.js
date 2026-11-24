export const starterSQL = `-- A small world of connected people. Start here.
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE people (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  team_id INTEGER REFERENCES teams(id)
);

INSERT INTO teams (name) VALUES ('Design'), ('Engineering');
INSERT INTO people (name, role, team_id) VALUES
  ('Ahmad', 'Designer', 1),
  ('Sarah', 'Engineer', 2),
  ('Mei', 'Researcher', 1),
  ('Daniel', 'Engineer', 2);

SELECT * FROM people;`;
const people = [
  { id: 1, name: 'Ahmad', role: 'Designer', team_id: 1 },
  { id: 2, name: 'Sarah', role: 'Engineer', team_id: 2 },
  { id: 3, name: 'Mei', role: 'Researcher', team_id: 1 },
  { id: 4, name: 'Daniel', role: 'Engineer', team_id: 2 },
  { id: 5, name: 'Aisha', role: 'Designer', team_id: 1 },
  { id: 6, name: 'Ravi', role: 'Engineer', team_id: 2 },
];
export const demo = {
  tables: [
    {
      name: 'people',
      rows: people,
      columns: Object.keys(people[0]).map((name) => ({ name })),
      count: 6,
      primaryKeys: ['id'],
    },
    {
      name: 'teams',
      rows: [
        { id: 1, name: 'Design' },
        { id: 2, name: 'Engineering' },
      ],
      columns: [{ name: 'id' }, { name: 'name' }],
      count: 2,
      primaryKeys: ['id'],
    },
  ],
  nodes: [
    ...people.map((p) => ({
      data: { id: 'p' + p.id, label: p.name, table: 'people', properties: p },
    })),
    ...['Design', 'Engineering'].map((name, i) => ({
      data: { id: 't' + (i + 1), label: name, table: 'teams', properties: { id: i + 1, name } },
    })),
  ],
  edges: people.map((p) => ({
    data: { id: 'e' + p.id, source: 'p' + p.id, target: 't' + p.team_id, label: 'team_id' },
  })),
  limit: 500,
};
