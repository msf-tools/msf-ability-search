#!/usr/bin/env node

/**
 * MSF API Data Fetcher
 *
 * Fetches character data, traits, and ability descriptions from the
 * Marvel Strike Force API and outputs a normalized JSON file for the
 * frontend to consume.
 *
 * Environment variables required:
 *   MSF_CLIENT_ID     - Your OAuth2 Client ID from the MSF developer portal
 *   MSF_CLIENT_SECRET - Your OAuth2 Client Secret from the MSF developer portal
 *
 * Optional:
 *   MSF_API_KEY       - Override the default public beta API key
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
const TOKEN_URL = 'https://hydra-public.prod.m3.scopelypv.com/oauth2/token';

// Public beta API key — override with MSF_API_KEY env var if needed
const API_KEY = process.env.MSF_API_KEY || '17wMKJLRxy3pYDCKG5ciP7VSU45OVumB2biCzzgw';

// Client ID from the MSF developer portal M2M app registration
const CLIENT_ID = process.env.MSF_CLIENT_ID || 'e69a9dbb-1de7-45f2-9dcd-9d5aceb63f0c';

// Client secret — only available for M2M/backend app types, not required for SPA public clients
const CLIENT_SECRET = process.env.MSF_CLIENT_SECRET;

async function fetchAccessToken() {
  console.log('Fetching OAuth2 access token (client credentials)...');

  const body = new URLSearchParams({ grant_type: 'client_credentials' });

  // Use client_secret_basic: credentials in Authorization header as Base64
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Token response missing access_token: ${JSON.stringify(data)}`);
  }

  console.log(`  Token obtained (expires in ${data.expires_in}s)`);
  return data.access_token;
}

function makeHeaders(accessToken) {
  return {
    'x-api-key': API_KEY,
    Authorization: `Bearer ${accessToken}`,
    'User-Agent': 'MSFAbilitySearch/1.0 (Server)',
    Accept: 'application/json',
  };
}

async function fetchJSON(path, params = {}, headers) {
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

async function fetchAllCharacters(headers) {
  const allCharacters = [];
  let page = 1;
  const perPage = 20;

  while (true) {
    const data = await fetchJSON('/game/v1/characters', {
      lang: 'en',
      abilityKits: 'full',
      traitFormat: 'full',
      perPage: String(perPage),
      page: String(page),
    }, headers);

    const characters = data.data || data;
    if (!Array.isArray(characters) || characters.length === 0) break;

    allCharacters.push(...characters);
    console.log(`   Page ${page}: ${characters.length} characters (${allCharacters.length} total)`);

    const total = data.meta?.perTotal;
    if (total && allCharacters.length >= total) break;
    if (characters.length < perPage) break;

    page++;
  }

  return allCharacters;
}

async function fetchTraits(headers) {
  const data = await fetchJSON('/game/v1/traits', {
    lang: 'en',
    traitFormat: 'full',
  }, headers);

  return data.data || data;
}

function stripColorTags(text) {
  if (!text) return '';
  return text.replace(/<color=[^>]+>/g, '').replace(/<\/color>/g, '');
}

function getMaxLevelDescription(ability) {
  if (!ability?.levels) return '';
  const levels = ability.levels;
  const maxLevel = Math.max(...Object.keys(levels).map(Number));
  return stripColorTags(levels[maxLevel]?.description || '');
}

function normalizeCharacter(raw) {
  const char = {
    id: raw.id,
    name: raw.name,
    portrait: raw.portrait || null,
    traits: [],
    abilities: {
      basic: null,
      special: null,
      ultimate: null,
      passive: null,
    },
  };

  if (Array.isArray(raw.traits)) {
    char.traits = raw.traits.map((t) => (typeof t === 'string' ? t : t.name || t.id));
  }

  const abilityKit = raw.abilityKit || {};
  ['basic', 'special', 'ultimate', 'passive'].forEach((type) => {
    const ability = abilityKit[type];
    if (ability) {
      char.abilities[type] = {
        name: ability.name,
        description: getMaxLevelDescription(ability),
      };
    }
  });

  return char;
}

async function main() {
  console.log('MSF Ability Search - Data Fetcher');
  console.log('==================================');

  try {
    console.log('\n0. Authenticating...');
    const accessToken = await fetchAccessToken();
    const headers = makeHeaders(accessToken);

    console.log('\n1. Fetching characters...');
    const rawCharacters = await fetchAllCharacters(headers);
    console.log(`   Found ${Array.isArray(rawCharacters) ? rawCharacters.length : 'unknown'} characters`);

    console.log('\n2. Fetching traits...');
    const traits = await fetchTraits(headers);
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
