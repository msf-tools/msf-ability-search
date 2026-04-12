import { useState, useEffect, useMemo } from 'react';
import { buildSearchIndex, createAbilityFuse, searchAbilities, filterCharacters, expandQuery } from '../utils/search';

export function useCharacterData() {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/characters.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load character data');
        return res.json();
      })
      .then((data) => {
        setCharacters(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const abilityEntries = useMemo(() => buildSearchIndex(characters), [characters]);
  const abilityFuse = useMemo(() => createAbilityFuse(abilityEntries), [abilityEntries]);

  return { characters, abilityFuse, loading, error };
}

export function useSearch(characters, abilityFuse, abilityQuery, filterText, traitFilters) {
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

    // If there's an ability query, search abilities and intersect with filtered chars
    if (abilityQuery && abilityQuery.trim().length >= 2) {
      const expandedTerms = expandQuery(abilityQuery);
      const allResults = new Map();

      expandedTerms.forEach((term) => {
        const results = searchAbilities(abilityFuse, term);
        results.forEach((result) => {
          if (filteredIds.has(result.character.id)) {
            if (!allResults.has(result.character.id)) {
              allResults.set(result.character.id, result);
            } else {
              // Merge abilities
              const existing = allResults.get(result.character.id);
              result.matchedAbilities.forEach((ability) => {
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

      return Array.from(allResults.values());
    }

    // No ability query — return all filtered characters with all abilities
    return filteredChars.map((char) => ({
      character: {
        id: char.id,
        name: char.name,
        portrait: char.portrait,
        traits: char.traits,
      },
      matchedAbilities: ['passive', 'basic', 'special', 'ultimate']
        .filter((type) => char.abilities[type])
        .map((type) => ({
          type,
          name: char.abilities[type].name,
          description: char.abilities[type].description,
          matches: [],
          score: 0,
        })),
    }));
  }, [characters, abilityFuse, abilityQuery, filterText, traitFilters]);
}
