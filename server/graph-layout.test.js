import test from 'node:test';
import assert from 'node:assert/strict';
import cytoscape from 'cytoscape';
import { groupedPositions, arrangeGraph } from '../src/graph-layout.js';

const node = (id, table, label = id) => ({ data: { id, table, label } });
const edge = (source, target) => ({ data: { id: source + '-' + target, source, target } });
const nodes = [
  node('Alice', 'people'),
  node('Ben', 'people'),
  node('Clara', 'people'),
  node('Dan', 'people'),
  node('Design', 'teams'),
  node('Engineering', 'teams'),
];
const edges = [
  edge('Alice', 'Design'),
  edge('Ben', 'Engineering'),
  edge('Clara', 'Design'),
  edge('Dan', 'Engineering'),
];

function crossings(positions) {
  let count = 0;
  edges.forEach(({ data: a }, index) => {
    for (const { data: b } of edges.slice(index + 1)) {
      if (a.source === b.source || a.target === b.target) continue;
      if (
        (positions.get(a.source).y - positions.get(b.source).y) *
          (positions.get(a.target).y - positions.get(b.target).y) <
        0
      )
        count++;
    }
  });
  return count;
}

test('opening a graph groups tables, separates nodes, and removes avoidable crossings', () => {
  const alphabetical = new Map(nodes.map(({ data }, index) => [data.id, { y: index }]));
  assert.ok(crossings(alphabetical) > 0, 'fixture starts with crossing relationships');
  const positions = groupedPositions(nodes, edges);
  assert.equal(crossings(positions), 0);
  assert.equal(positions.get('Alice').x, positions.get('Ben').x);
  assert.notEqual(positions.get('Alice').x, positions.get('Design').x);
  assert.equal(new Set([...positions.values()].map(({ x, y }) => `${x}:${y}`)).size, nodes.length);
});

test('reopening the same data gives a stable layout even if database row order changes', () => {
  const expected = groupedPositions(nodes, edges);
  const actual = groupedPositions([...nodes].reverse(), [...edges].reverse());
  assert.deepEqual(actual, expected);
});

test('label dimensions reserve space and isolated or self-linked vertices remain visible', () => {
  const items = [
    node('a', 'first'),
    node('b', 'first'),
    node('c', 'second'),
    node('isolated', 'second'),
  ];
  const sizes = new Map([['a', { w: 600, h: 300 }]]);
  const positions = groupedPositions(
    items,
    [edge('a', 'a'), edge('a', 'c'), edge('unknown', 'c')],
    sizes,
  );
  assert.equal(positions.size, 4);
  assert.ok(Math.abs(positions.get('a').y - positions.get('b').y) >= 340);
  assert.ok(Math.abs(positions.get('a').x - positions.get('c').x) > 400);
  assert.ok([...positions.values()].every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
  assert.equal(groupedPositions([], []).size, 0);
});

test('Cytoscape applies grouped positions and untangling preserves a search filter', () => {
  const cy = cytoscape({
    headless: true,
    styleEnabled: true,
    elements: [...nodes, ...edges],
    layout: { name: 'preset' },
    style: [{ selector: '.search-hidden', style: { display: 'none' } }],
  });
  try {
    arrangeGraph(cy);
    assert.equal(cy.getElementById('Alice').position('x'), cy.getElementById('Ben').position('x'));
    assert.notEqual(
      cy.getElementById('Alice').position('x'),
      cy.getElementById('Design').position('x'),
    );
    const hidden = cy.getElementById('Dan');
    const before = { ...hidden.position() };
    hidden.addClass('search-hidden');
    arrangeGraph(cy);
    assert.equal(hidden.visible(), false);
    assert.deepEqual(hidden.position(), before);
    assert.ok(cy.nodes(':visible').every((item) => Number.isFinite(item.position('x'))));
  } finally {
    cy.destroy();
  }
});

test('single-table graphs can use the spread layout and an empty graph is safe', () => {
  const cy = cytoscape({
    headless: true,
    elements: [node('one', 'people'), node('two', 'people'), edge('one', 'two')],
  });
  try {
    arrangeGraph(cy);
    assert.ok(
      cy
        .nodes()
        .every(
          (item) => Number.isFinite(item.position('x')) && Number.isFinite(item.position('y')),
        ),
    );
    assert.notDeepEqual(cy.getElementById('one').position(), cy.getElementById('two').position());
    cy.elements().remove();
    assert.doesNotThrow(() => arrangeGraph(cy));
  } finally {
    cy.destroy();
  }
});
