import Fuse from 'fuse.js';

export const ABILITY_TYPES = ['passive', 'basic', 'special', 'ultimate'];

// Build a searchable index from character data
export function buildSearchIndex(characters) {
  // Create a flattened structure for ability searching
  const abilityEntries = [];

  characters.forEach((char) => {
    ABILITY_TYPES.forEach((type) => {
      const ability = char.abilities[type];
      if (ability) {
        const abilityName = ability.name || '';
        const abilityDescription = ability.description || '';
        abilityEntries.push({
          characterId: char.id,
          characterName: char.name,
          portrait: char.portrait,
          traits: char.traits,
          abilityType: type,
          abilityName,
          abilityDescription,
          abilitySearchText: buildConceptText(abilityName, abilityDescription, type),
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
      { name: 'abilitySearchText', weight: 0.45 },
      { name: 'abilityDescription', weight: 0.35 },
      { name: 'abilityName', weight: 0.2 },
    ],
    includeMatches: true,
    includeScore: true,
    threshold: 0.36,
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

export function sortSearchResults(results) {
  return [...results].sort((a, b) => {
    const aPassive = a.matchedAbilities.some((ability) => ability.type === 'passive') ? 0 : 1;
    const bPassive = b.matchedAbilities.some((ability) => ability.type === 'passive') ? 0 : 1;
    if (aPassive !== bPassive) return aPassive - bPassive;

    const aScore = Math.min(...a.matchedAbilities.map((ability) => ability.score ?? 1));
    const bScore = Math.min(...b.matchedAbilities.map((ability) => ability.score ?? 1));
    return aScore - bScore;
  });
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
  speed: ['speed up', 'speed down', 'speed bar', 'speed meter', 'turn meter', 'slow', 'speed'],
  'speed stat': ['speed up', 'speed down', 'speed', 'slow'],
  'speed bar': ['speed bar', 'speed meter', 'turn meter', 'reduce speed bar', 'fill speed bar'],
  'turn meter': ['speed bar', 'speed meter', 'turn meter'],
  slow: ['slow', 'speed down'],
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
  debuff: ['negative effect', 'negative effects', 'debuff', 'debuffs'],
  buff: ['positive effect', 'positive effects', 'buff', 'buffs'],
  cleanse: ['clear negative effects', 'clear', 'remove negative effects', 'cleanse'],
  strip: ['clear positive effects', 'remove positive effects', 'remove positive effect'],
  flip: ['flip positive effects', 'flip negative effects', 'flip'],
  safeguard: ['safeguard'],
  'prevent safeguard': ['prevent safeguard', 'clear safeguard', 'remove safeguard', 'cannot gain safeguard'],
  trauma: ['trauma'],
  burn: ['burn'],
  prevent: ['prevent', 'prevented', 'immune', 'cannot gain'],
  spawn: ['on spawn', 'spawn', 'when this character spawns'],
  immunity: ['immunity', 'immune', 'spawn immunity', 'on spawn immunity'],
  war: ['war', 'alliance war', 'war offense', 'war defense'],
  crucible: ['crucible', 'cosmic crucible'],
};

export function expandQuery(query) {
  const lower = query.toLowerCase().trim();
  const terms = new Set([lower]);

  Object.entries(KEYWORD_ALIASES).forEach(([keyword, aliases]) => {
    if (lower.includes(keyword)) {
      aliases.forEach((alias) => terms.add(alias));
    }
  });

  lower
    .split(/\s+/)
    .filter((word) => word.length >= 2)
    .forEach((word) => {
      if (lower.includes('prevent') && word === 'safeguard') return;
      const aliases = KEYWORD_ALIASES[word];
      if (aliases) {
        aliases.forEach((alias) => terms.add(alias));
      }
    });

  return Array.from(terms);
}

function buildConceptText(name, description, type) {
  const text = `${name} ${description}`.toLowerCase();
  const concepts = [type];

  if (/speed bar|speed meter|turn meter/.test(text)) {
    concepts.push('speed bar', 'turn meter', 'speed manipulation');
  }
  if (/speed up|speed down|slow/.test(text)) {
    concepts.push('speed stat', 'speed manipulation');
  }
  if (/on spawn|when this character spawns|spawn with/.test(text)) {
    concepts.push('spawn', 'opening effect');
  }
  if (/immunity|immune/.test(text)) {
    concepts.push('immunity', 'spawn immunity');
  }
  if (/safeguard/.test(text)) {
    concepts.push('safeguard');
  }
  if (/safeguard/.test(text) && /clear|remove|prevent|cannot gain/.test(text)) {
    concepts.push('prevent safeguard', 'remove safeguard');
  }
  if (/positive effect|positive effects|buff/.test(text)) {
    concepts.push('buff', 'positive effect');
  }
  if (/negative effect|negative effects|debuff/.test(text)) {
    concepts.push('debuff', 'negative effect');
  }
  if (/clear|remove/.test(text) && /positive effect|safeguard/.test(text)) {
    concepts.push('strip', 'remove positive effects');
  }
  if (/clear|remove/.test(text) && /negative effect/.test(text)) {
    concepts.push('cleanse', 'clear negative effects');
  }
  if (/war/.test(text)) {
    concepts.push('war', 'alliance war');
  }
  if (/crucible/.test(text)) {
    concepts.push('crucible', 'cosmic crucible');
  }

  return `${name} ${description} ${concepts.join(' ')}`;
}
