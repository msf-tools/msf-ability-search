import { useState, useEffect, useMemo } from 'react';
import {
  ABILITY_TYPES,
  buildSearchIndex,
  createAbilityFuse,
  searchAbilities,
  filterCharacters,
  expandQuery,
  sortSearchResults,
} from '../utils/search';

export function useCharacterData() {
  const [characters, setCharacters] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const dataBase = `${import.meta.env.BASE_URL}data`;

    Promise.all([
      fetch(`${dataBase}/characters.json`).then((res) => {
        if (!res.ok) throw new Error('Failed to load character data');
        return res.json();
      }),
      fetch(`${dataBase}/meta.json`).then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([data, metaData]) => {
        setCharacters(data);
        setMeta(metaData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const abilityEntries = useMemo(() => buildSearchIndex(characters), [characters]);
  const abilityFuse = useMemo(() => createAbilityFuse(abilityEntries), [abilityEntries]);

  return { characters, meta, abilityFuse, loading, error };
}

export function useSearch(characters, abilityFuse, abilityQuery, filterText, traitFilters, abilityTypeFilters) {
  return useMemo(() => {
    if (!characters.length) return [];

    // First filter characters by name/trait text and trait checkboxes
    let filteredChars = characters;

    if (filterText && filterText.trim().length >= 2) {
      filteredChars = filterCharacters(characters, filterText);
    }

    if (traitFilters && traitFilters.length > 0) {
      const filterSet = new Set(traitFilters.map((t) => t.toLowerCase()));
      filteredChars = filteredChars.filter((char) =>
        char.traits.some((trait) => filterSet.has(trait.toLowerCase()))
      );
    }

    const filteredIds = new Set(filteredChars.map((c) => c.id));
    const selectedAbilityTypes = abilityTypeFilters?.length ? abilityTypeFilters : ABILITY_TYPES;
    const selectedTypeSet = new Set(selectedAbilityTypes);

    // If there's an ability query, search abilities and intersect with filtered chars
    if (abilityQuery && abilityQuery.trim().length >= 2) {
      const expandedTerms = expandQuery(abilityQuery);
      const allResults = new Map();

      expandedTerms.forEach((term) => {
        const results = searchAbilities(abilityFuse, term);
        results.forEach((result) => {
          if (filteredIds.has(result.character.id)) {
            const matchedAbilities = result.matchedAbilities.filter((ability) =>
              selectedTypeSet.has(ability.type)
            );
            if (matchedAbilities.length === 0) return;

            if (!allResults.has(result.character.id)) {
              allResults.set(result.character.id, {
                ...result,
                matchedAbilities,
              });
            } else {
              // Merge abilities
              const existing = allResults.get(result.character.id);
              matchedAbilities.forEach((ability) => {
                const exists = existing.matchedAbilities.some(
                  (a) => a.type === ability.type
                );
                if (!exists) {
                  existing.matchedAbilities.push(ability);
                }
              });
            }
          }
        });
      });

      return sortSearchResults(Array.from(allResults.values()));
    }

    // No ability query — return all filtered characters with all abilities
    return filteredChars.map((char) => ({
      character: {
        id: char.id,
        name: char.name,
        portrait: char.portrait,
        traits: char.traits,
      },
      matchedAbilities: selectedAbilityTypes
        .filter((type) => char.abilities[type])
        .map((type) => ({
          type,
          name: char.abilities[type].name,
          description: char.abilities[type].description,
          matches: [],
          score: 0,
        })),
    })).filter((result) => result.matchedAbilities.length > 0);
  }, [characters, abilityFuse, abilityQuery, filterText, traitFilters, abilityTypeFilters]);
}
