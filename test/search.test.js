import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSearchIndex,
  createAbilityFuse,
  expandQuery,
  searchAbilities,
  sortSearchResults,
} from '../src/utils/search.js';

const characters = [
  {
    id: 'fast-passive',
    name: 'Fast Passive',
    portrait: null,
    traits: ['HERO', 'GLOBAL', 'TECH', 'SUPPORT', 'WAR'],
    abilities: {
      basic: {
        name: 'Jab',
        description: 'Attack primary target.',
      },
      special: null,
      ultimate: null,
      passive: {
        name: 'Opening Tempo',
        description: 'On Spawn, fill Speed Bar by 20% and gain Immunity.',
      },
    },
  },
  {
    id: 'safeguard-counter',
    name: 'Safeguard Counter',
    portrait: null,
    traits: ['VILLAIN', 'COSMIC', 'MYSTIC', 'CONTROLLER', 'CRUCIBLE'],
    abilities: {
      basic: null,
      special: {
        name: 'Deny Protection',
        description: 'Clear Safeguard and remove 2 positive effects from all enemies.',
      },
      ultimate: null,
      passive: null,
    },
  },
];

test('expandQuery adds MSF concept aliases for user phrasing', () => {
  const expanded = expandQuery('prevent safeguard');

  assert.ok(expanded.includes('prevent safeguard'));
  assert.ok(expanded.includes('clear safeguard'));
  assert.ok(expanded.includes('cannot gain'));
});

test('concept-aware search finds speed bar and spawn immunity phrasing', () => {
  const fuse = createAbilityFuse(buildSearchIndex(characters));
  const results = searchAbilities(fuse, 'spawn immunity');

  assert.equal(results[0].character.id, 'fast-passive');
  assert.equal(results[0].matchedAbilities[0].type, 'passive');
});

test('search ranking prioritizes characters with passive matches', () => {
  const fuse = createAbilityFuse(buildSearchIndex(characters));
  const results = sortSearchResults(searchAbilities(fuse, 'speed bar'));

  assert.equal(results[0].character.id, 'fast-passive');
});

test('concept-aware search finds safeguard removal without exact wording', () => {
  const fuse = createAbilityFuse(buildSearchIndex(characters));
  const results = searchAbilities(fuse, 'prevent safeguard');

  assert.equal(results[0].character.id, 'safeguard-counter');
  assert.equal(results[0].matchedAbilities[0].type, 'special');
});
