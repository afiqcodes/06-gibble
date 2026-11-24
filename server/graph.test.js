import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGraph, quote } from './graph.js';
test('quotes SQL identifiers', () => assert.equal(quote('a"b'), '"a""b"'));
test('composite foreign keys map to the correct vertices and skip nulls', () => {
  const tables = [
    {
      name: 'teams',
      primaryKeys: ['org', 'id'],
      rows: [
        { org: 1, id: 2, name: 'Design' },
        { org: 2, id: 2, name: 'Other' },
      ],
    },
    {
      name: 'people',
      primaryKeys: ['id'],
      rows: [
        { id: 7, name: 'Ahmad', org: 1, team: 2 },
        { id: 8, org: null, team: 2 },
      ],
    },
  ];
  const graph = makeGraph(tables, [
    {
      constraint_name: 'team_fk',
      source_table: 'people',
      target_table: 'teams',
      source_columns: ['org', 'team'],
      target_columns: ['org', 'id'],
    },
  ]);
  assert.equal(graph.nodes.length, 4);
  assert.equal(graph.edges.length, 1);
  assert.equal(graph.edges[0].data.target, JSON.stringify(['teams', 1, 2]));
  assert.equal(graph.edges[0].data.source, JSON.stringify(['people', 7]));
});
test('tables without keys retain distinct row vertices', () => {
  const graph = makeGraph(
    [{ name: 'notes', primaryKeys: [], rows: [{ name: 'same' }, { name: 'same' }] }],
    [],
  );
  assert.equal(new Set(graph.nodes.map((n) => n.data.id)).size, 2);
});

const entity = (name, rows, primaryKeys = ['id']) => ({
  name,
  rows,
  primaryKeys,
  columns: Object.keys(rows[0] || {}).map((name) => ({ name })),
});
const fk = (source, columns, target, targetColumns = ['id']) => ({
  constraint_name: source + '_' + columns.join('_'),
  source_table: source,
  source_columns: columns,
  target_table: target,
  target_columns: targetColumns,
});
test('enrollments become directed labeled edges with row properties', () => {
  const tables = [
    entity('students', [{ id: 15, name: 'Aiman' }]),
    entity('subjects', [{ id: 12, name: 'Frontend' }]),
    entity('enrollments', [{ student_id: 15, subject_id: 12 }], ['student_id', 'subject_id']),
  ];
  const graph = makeGraph(tables, [
    fk('enrollments', ['subject_id'], 'subjects'),
    fk('enrollments', ['student_id'], 'students'),
  ]);
  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.edges.length, 1);
  assert.deepEqual(graph.edges[0].data.properties, { student_id: 15, subject_id: 12 });
  assert.equal(graph.edges[0].data.label, 'enrolled in');
  assert.equal(graph.edges[0].data.source, JSON.stringify(['students', 15]));
  assert.equal(graph.edges[0].data.target, JSON.stringify(['subjects', 12]));
});
test('surrogate keys retain distinct parallel relationships and skip missing or null endpoints', () => {
  const tables = [
    entity('teachers', [{ id: 5, name: 'Han' }]),
    entity('subjects', [{ id: 17, name: 'Security' }]),
    entity('teaching_assignments', [
      { id: 1, teacher_id: 5, subject_id: 17 },
      { id: 2, teacher_id: 5, subject_id: 17 },
      { id: 3, teacher_id: null, subject_id: 17 },
      { id: 4, teacher_id: 5, subject_id: 99 },
    ]),
  ];
  const graph = makeGraph(tables, [
    fk('teaching_assignments', ['subject_id'], 'subjects'),
    fk('teaching_assignments', ['teacher_id'], 'teachers'),
  ]);
  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.edges.length, 2);
  assert.equal(new Set(graph.edges.map((e) => e.data.id)).size, 2);
  assert.ok(graph.edges.every((e) => e.data.label === 'teaches'));
});
test('named entities and junction tables referenced by other records remain vertices', () => {
  const tables = [
    entity('students', [{ id: 1, name: 'A' }]),
    entity('subjects', [{ id: 2, name: 'B' }]),
    entity('enrollments', [{ id: 3, student_id: 1, subject_id: 2 }]),
    entity('grades', [{ id: 4, enrollment_id: 3 }]),
  ];
  const graph = makeGraph(tables, [
    fk('enrollments', ['student_id'], 'students'),
    fk('enrollments', ['subject_id'], 'subjects'),
    fk('grades', ['enrollment_id'], 'enrollments'),
  ]);
  assert.equal(graph.nodes.length, 4);
  assert.equal(graph.edges.length, 3);
  const named = makeGraph(
    [
      entity('students', [{ id: 1, name: 'A' }]),
      entity('subjects', [{ id: 2, name: 'B' }]),
      entity('projects', [{ id: 3, name: 'Project', student_id: 1, subject_id: 2 }]),
    ],
    [fk('projects', ['student_id'], 'students'), fk('projects', ['subject_id'], 'subjects')],
  );
  assert.equal(named.nodes.length, 3);
  assert.equal(named.edges.length, 2);
});
test('self relationships and composite endpoint keys produce valid direct edges', () => {
  const people = entity(
    'people',
    [
      { org: 1, id: 2, name: 'A' },
      { org: 1, id: 3, name: 'B' },
    ],
    ['org', 'id'],
  );
  const links = entity(
    'friendships',
    [{ from_org: 1, from_id: 2, to_org: 1, to_id: 3 }],
    ['from_org', 'from_id', 'to_org', 'to_id'],
  );
  const graph = makeGraph(
    [people, links],
    [
      fk('friendships', ['to_org', 'to_id'], 'people', ['org', 'id']),
      fk('friendships', ['from_org', 'from_id'], 'people', ['org', 'id']),
    ],
  );
  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.edges.length, 1);
  assert.equal(graph.edges[0].data.source, JSON.stringify(['people', 1, 2]));
  assert.equal(graph.edges[0].data.target, JSON.stringify(['people', 1, 3]));
});
