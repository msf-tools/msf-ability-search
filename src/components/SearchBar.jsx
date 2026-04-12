import { useState, useRef, useEffect } from 'react';

const ABILITY_SUGGESTIONS = [
  'speed down', 'speed up', 'stun', 'blind', 'heal block', 'ability block',
  'offense up', 'defense up', 'stealth', 'taunt', 'evade', 'counter',
  'bleed', 'regeneration', 'disrupt', 'immunity', 'deathproof', 'safeguard',
  'revive', 'trauma', 'burn', 'slow', 'deflect', 'charged', 'assist',
  'ability energy', 'positive effect', 'negative effect', 'prevent',
  'speed bar', 'block amount', 'flip',
];

export default function SearchBar({ abilityQuery, onAbilityQueryChange, filterText, onFilterTextChange }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (abilityQuery && abilityQuery.length >= 1) {
      const lower = abilityQuery.toLowerCase();
      const matches = ABILITY_SUGGESTIONS.filter((s) => s.includes(lower)).slice(0, 8);
      setFilteredSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [abilityQuery]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectSuggestion = (suggestion) => {
    onAbilityQueryChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="search-bar">
      <div className="search-field ability-search">
        <div className="search-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search abilities... (e.g. speed down, prevent, heal block)"
          value={abilityQuery}
          onChange={(e) => onAbilityQueryChange(e.target.value)}
          onFocus={() => {
            if (filteredSuggestions.length > 0) setShowSuggestions(true);
          }}
          className="search-input"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        {abilityQuery && (
          <button
            className="clear-btn"
            onClick={() => onAbilityQueryChange('')}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
        {showSuggestions && (
          <div className="suggestions" ref={suggestionsRef}>
            {filteredSuggestions.map((s) => (
              <button key={s} className="suggestion-item" onClick={() => selectSuggestion(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="search-field filter-search">
        <div className="search-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Filter by name or trait... (e.g. Mutant, Avenger)"
          value={filterText}
          onChange={(e) => onFilterTextChange(e.target.value)}
          className="search-input"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        {filterText && (
          <button
            className="clear-btn"
            onClick={() => onFilterTextChange('')}
            aria-label="Clear filter"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
