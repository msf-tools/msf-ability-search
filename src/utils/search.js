import Fuse from 'fuse.js';

// Build a searchable index from character data
export function buildSearchIndex(characters) {
  // Create a flattened structure for ability searching
  const abilityEntries = [];

  characters.forEach((char) => {
    ['basic', 'special', 'ultimate', 'passive'].forEach((type) => {
      const ability = char.abilities[type];
      if (ability) {
        abilityEntries.push({
          characterId: char.id,
          characterName: char.name,
          portrait: char.portrait,
          traits: char.traits,
          abilityType: type,
          abilityName: ability.name,
          abilityDescription: ability.description,
        });
      }
    });
  });

  return abilityEntries;
}

// Create Fuse instance for fuzzy searching ability descriptions
export function createAbilityFuse(abilityEntries) {
  return new Fuse(abilityEntries, {
    keys: [
      { name: 'abilityDescription', weight: 0.6 },
      { name: 'abilityName', weight: 0.4 },
    ],
    includeMatches: true,
    threshold: 0.3,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
}

// Create Fuse instance for searching character names/traits
export function createCharacterFuse(characters) {
  return new Fuse(characters, {
    keys: [
      { name: 'name', weight: 0.5 },
      { name: 'traits', weight: 0.5 },
    ],
    includeMatches: true,
    threshold: 0.3,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
}

// Search abilities by keyword and return grouped results per character
export function searchAbilities(abilityFuse, query) {
  if (!query || query.trim().length < 2) return [];

  const results = abilityFuse.search(query.trim());

  // Group by character
  const grouped = new Map();
  results.forEach((result) => {
    const { characterId } = result.item;
    if (!grouped.has(characterId)) {
      grouped.set(characterId, {
        character: {
          id: result.item.characterId,
          name: result.item.characterName,
          portrait: result.item.portrait,
          traits: result.item.traits,
        },
        matchedAbilities: [],
      });
    }
    grouped.get(characterId).matchedAbilities.push({
      type: result.item.abilityType,
      name: result.item.abilityName,
      description: result.item.abilityDescription,
      matches: result.matches,
      score: result.score,
    });
  });

  // Sort abilities within each character: passive first, then by score
  grouped.forEach((entry) => {
    entry.matchedAbilities.sort((a, b) => {
      if (a.type === 'passive' && b.type !== 'passive') return -1;
      if (a.type !== 'passive' && b.type === 'passive') return 1;
      return (a.score || 0) - (b.score || 0);
    });
  });

  return Array.from(grouped.values());
}

// Filter characters by name/trait filters
export function filterCharacters(characters, filterText) {
  if (!filterText || filterText.trim().length < 2) return characters;
  const fuse = createCharacterFuse(characters);
  const results = fuse.search(filterText.trim());
  return results.map((r) => r.item);
}

// Highlight matching text in a string
export function highlightText(text, query) {
  if (!query || query.trim().length < 2) return [{ text, highlight: false }];

  const keywords = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((k) => k.length >= 2);

  if (keywords.length === 0) return [{ text, highlight: false }];

  // Build a regex that matches any keyword
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), highlight: false });
    }
    parts.push({ text: match[0], highlight: true });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false });
  }

  return parts.length > 0 ? parts : [{ text, highlight: false }];
}

// Related keyword mapping for common MSF terms
const KEYWORD_ALIASES = {
  speed: ['speed up', 'speed down', 'speed bar', 'slow', 'speed'],
  heal: ['heal', 'regeneration', 'heal block', 'health'],
  stun: ['stun', 'stunned'],
  blind: ['blind', 'miss'],
  taunt: ['taunt'],
  stealth: ['stealth', 'invisible'],
  bleed: ['bleed', 'bleeding'],
  defense: ['defense up', 'defense down', 'armor'],
  offense: ['offense up', 'offense down', 'damage'],
  ability: ['ability block', 'ability energy'],
  block: ['ability block', 'block', 'blocked'],
  counter: ['counter', 'counter attack'],
  dodge: ['dodge', 'evade'],
  energy: ['ability energy', 'energy'],
  immunity: ['immunity', 'immune'],
  disrupt: ['disrupt', 'disrupted'],
  deathproof: ['deathproof', 'death proof'],
  revive: ['revive', 'resurrect'],
  debuff: ['negative effect', 'debuff'],
  buff: ['positive effect', 'buff'],
  cleanse: ['clear', 'remove', 'cleanse'],
  flip: ['flip'],
  safeguard: ['safeguard'],
  trauma: ['trauma'],
  burn: ['burn'],
  prevent: ['prevent', 'immune'],
};

export function expandQuery(query) {
  const lower = query.toLowerCase().trim();
  const aliases = KEYWORD_ALIASES[lower];
  if (aliases) {
    return aliases;
  }
  return [lower];
}
