#!/usr/bin/env node

/**
 * MSF API Data Fetcher
 *
 * Fetches character data, traits, and ability descriptions from the
 * Marvel Strike Force API and outputs a normalized JSON file for the
 * frontend to consume.
 *
 * Environment variables required:
 *   MSF_API_KEY       - Your API key from the MSF developer portal
 *   MSF_ACCESS_TOKEN  - OAuth2 bearer token
 *
 * Usage:
 *   node scripts/fetch-data.js
 *
 * This script is designed to be run by a GitHub Action on a schedule
 * to keep character data up to date.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data');

const BASE_URL = 'https://api.marvelstrikeforce.com';
const API_KEY = process.env.MSF_API_KEY;
const ACCESS_TOKEN = process.env.MSF_ACCESS_TOKEN;

if (!API_KEY || !ACCESS_TOKEN) {
  console.error('Missing required environment variables: MSF_API_KEY and MSF_ACCESS_TOKEN');
  console.error('Set these in your GitHub repository secrets or local .env file.');
  process.exit(1);
}

const headers = {
  'x-api-key': API_KEY,
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  'User-Agent': 'MSFAbilitySearch/1.0 (Server)',
  Accept: 'application/json',
};

async function fetchJSON(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  console.log(`  Fetching ${url.pathname}...`);
  const res = await fetch(url.toString(), { headers });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status} for ${path}: ${body}`);
  }

  return res.json();
}

async function fetchAllCharacters() {
  // Fetch characters with full ability kits
  const data = await fetchJSON('/game/v1/characters', {
    lang: 'en',
    abilityKits: 'full',
    statsFormat: 'csv',
    traitFormat: 'full',
    charInfo_char: 'full',
    perPage: '500',
  });

  return data.data || data;
}

async function fetchTraits() {
  const data = await fetchJSON('/game/v1/traits', {
    lang: 'en',
    traitFormat: 'full',
  });

  return data.data || data;
}

function normalizeCharacter(raw) {
  // Adapt this mapping based on actual API response structure
  // The API response structure may vary - adjust field names as needed
  const char = {
    id: raw.id || raw.characterId,
    name: raw.name || raw.displayName || raw.id,
    portrait: raw.portrait || raw.portraitUrl || raw.image || null,
    traits: [],
    abilities: {
      basic: null,
      special: null,
      ultimate: null,
      passive: null,
    },
  };

  // Extract traits
  if (Array.isArray(raw.traits)) {
    char.traits = raw.traits.map((t) => (typeof t === 'string' ? t : t.name || t.id));
  }

  // Extract abilities from ability kits
  const abilityKit = raw.abilityKit || raw.abilities || raw.abilityKits || {};
  const abilityTypes = ['basic', 'special', 'ultimate', 'passive'];

  abilityTypes.forEach((type) => {
    const ability = abilityKit[type];
    if (ability) {
      char.abilities[type] = {
        name: ability.name || ability.displayName || type,
        description: ability.description || ability.text || '',
      };
    }
  });

  // If abilities are in an array format instead
  if (Array.isArray(abilityKit)) {
    abilityKit.forEach((ability) => {
      const type = ability.type?.toLowerCase() || ability.abilityType?.toLowerCase();
      if (type && abilityTypes.includes(type)) {
        char.abilities[type] = {
          name: ability.name || ability.displayName || type,
          description: ability.description || ability.text || '',
        };
      }
    });
  }

  return char;
}

async function main() {
  console.log('MSF Ability Search - Data Fetcher');
  console.log('==================================');

  try {
    console.log('\n1. Fetching characters...');
    const rawCharacters = await fetchAllCharacters();
    console.log(`   Found ${Array.isArray(rawCharacters) ? rawCharacters.length : 'unknown'} characters`);

    console.log('\n2. Fetching traits...');
    const traits = await fetchTraits();
    console.log(`   Found ${Array.isArray(traits) ? traits.length : 'unknown'} traits`);

    console.log('\n3. Normalizing data...');
    const characters = Array.isArray(rawCharacters)
      ? rawCharacters.map(normalizeCharacter)
      : [];

    // Filter out characters with no abilities
    const validCharacters = characters.filter(
      (c) => c.abilities.basic || c.abilities.special || c.abilities.ultimate || c.abilities.passive
    );

    console.log(`   ${validCharacters.length} characters with ability data`);

    console.log('\n4. Writing output...');
    mkdirSync(OUTPUT_DIR, { recursive: true });

    writeFileSync(
      join(OUTPUT_DIR, 'characters.json'),
      JSON.stringify(validCharacters, null, 2)
    );

    // Also write a metadata file with last-updated timestamp
    writeFileSync(
      join(OUTPUT_DIR, 'meta.json'),
      JSON.stringify({
        lastUpdated: new Date().toISOString(),
        characterCount: validCharacters.length,
        traitCount: Array.isArray(traits) ? traits.length : 0,
      }, null, 2)
    );

    console.log(`   Written to ${OUTPUT_DIR}/characters.json`);
    console.log(`   Written to ${OUTPUT_DIR}/meta.json`);
    console.log('\nDone!');
  } catch (err) {
    console.error('\nFailed to fetch data:', err.message);
    process.exit(1);
  }
}

main();
