import { useState, useMemo } from 'react';
import { useCharacterData, useSearch } from './hooks/useCharacterData';
import SearchBar from './components/SearchBar';
import TraitFilter from './components/TraitFilter';
import CharacterCard from './components/CharacterCard';
import './App.css';

function App() {
  const { characters, abilityFuse, loading, error } = useCharacterData();
  const [abilityQuery, setAbilityQuery] = useState('');
  const [filterText, setFilterText] = useState('');
  const [traitFilters, setTraitFilters] = useState([]);

  const results = useSearch(characters, abilityFuse, abilityQuery, filterText, traitFilters);

  // Build a lookup for full ability data
  const characterMap = useMemo(() => {
    const map = new Map();
    characters.forEach((c) => map.set(c.id, c));
    return map;
  }, [characters]);

  const hasActiveSearch = abilityQuery.trim().length >= 2 || filterText.trim().length >= 2 || traitFilters.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-msf">MSF</span> Ability Search
        </h1>
        <p className="app-subtitle">Find characters by their abilities, traits, and keywords</p>
      </header>

      <main className="app-main">
        <SearchBar
          abilityQuery={abilityQuery}
          onAbilityQueryChange={setAbilityQuery}
          filterText={filterText}
          onFilterTextChange={setFilterText}
        />

        <TraitFilter
          characters={characters}
          selectedTraits={traitFilters}
          onTraitsChange={setTraitFilters}
        />

        {loading && (
          <div className="status-message">
            <div className="loading-spinner" />
            Loading character data...
          </div>
        )}

        {error && (
          <div className="status-message error">
            Failed to load data: {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="results-info">
              {hasActiveSearch ? (
                <span>{results.length} character{results.length !== 1 ? 's' : ''} found</span>
              ) : (
                <span>{characters.length} characters — search or filter to find abilities</span>
              )}
            </div>

            <div className="results-grid">
              {results.map((result) => (
                <CharacterCard
                  key={result.character.id}
                  result={result}
                  query={abilityQuery}
                  allAbilities={characterMap.get(result.character.id)?.abilities}
                />
              ))}
            </div>

            {hasActiveSearch && results.length === 0 && (
              <div className="status-message">
                No characters match your search. Try different keywords or filters.
              </div>
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Data sourced from the MSF API. Not affiliated with Scopely or Marvel.</p>
      </footer>
    </div>
  );
}

export default App;
