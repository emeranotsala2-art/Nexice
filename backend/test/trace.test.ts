import { chainHash } from '../src/common';
import * as assert from 'assert';
const h1 = chainHash('GENESIS', 'o1', 'CREATED', { total: 100 });
const h2 = chainHash(h1, 'o1', 'VALIDATED', {});
assert.notStrictEqual(chainHash('GENESIS', 'o1', 'CREATED', { total: 999 }), h1, 'toute modification doit changer le hash');
assert.strictEqual(chainHash(h1, 'o1', 'VALIDATED', {}), h2, 'hash déterministe');
assert.strictEqual(chainHash('G', 'o', 'T', { b: 1, a: { y: 2, x: [1, { d: 4, c: 3 }] }, u: undefined }),
  chainHash('G', 'o', 'T', { a: { x: [1, { c: 3, d: 4 }], y: 2 }, b: 1 }), 'indépendant de l\'ordre des clés (jsonb)');
console.log('OK : chaîne de hash vérifiée');
