import assert from 'node:assert/strict';
import test from 'node:test';

import { cleanFigmaNode, createFigmaDesignSpec } from '../dist/services/figma/cleaner.js';

test('creates an exact recursive design spec from visible Figma nodes', () => {
  const cleaned = cleanFigmaNode({
    name: 'Viewport',
    type: 'FRAME',
    absoluteBoundingBox: { x: 10, y: 20, width: 800, height: 600 },
    children: [{
      name: 'Header',
      type: 'FRAME',
      layoutMode: 'HORIZONTAL',
      layoutSizingHorizontal: 'FILL',
      effects: [{ type: 'DROP_SHADOW', radius: 4 }],
      absoluteBoundingBox: { x: 10, y: 20, width: 800, height: 64 },
      children: [{
        name: 'Title',
        type: 'TEXT',
        characters: 'Orders',
        style: { fontFamily: 'Nunito', fontSize: 24 },
        absoluteBoundingBox: { x: 34, y: 36, width: 80, height: 32 },
      }],
    }, {
      name: 'Hidden',
      type: 'TEXT',
      visible: false,
      characters: 'Do not include',
      absoluteBoundingBox: { x: 0, y: 0, width: 10, height: 10 },
    }],
  });

  const spec = createFigmaDesignSpec(cleaned);
  assert.equal(spec.nodeCount, 3);
  assert.equal(spec.textNodeCount, 1);
  assert.equal(spec.boundingBoxCount, 3);
  assert.deepEqual(spec.nodes.map(({ path, name }) => ({ path, name })), [
    { path: '0', name: 'Viewport' },
    { path: '0.0', name: 'Header' },
    { path: '0.0.0', name: 'Title' },
  ]);
  assert.deepEqual(spec.nodes[1].effects, [{ type: 'DROP_SHADOW', radius: 4 }]);
  assert.equal(spec.nodes[1].layoutSizingHorizontal, 'FILL');
  assert.deepEqual(spec.nodes[2].absoluteBoundingBox, { x: 34, y: 36, width: 80, height: 32 });
  assert.equal(spec.nodes[2].characters, 'Orders');
});

test('rejects a design spec without visible text', () => {
  assert.throws(() => createFigmaDesignSpec({
    name: 'Viewport',
    type: 'FRAME',
    absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
    children: [{ name: 'Box', type: 'RECTANGLE', absoluteBoundingBox: { x: 0, y: 0, width: 10, height: 10 } }],
  }), /no visible text nodes/);
});
