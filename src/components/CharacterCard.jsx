import { useState } from 'react';
import { highlightText } from '../utils/search';

const ABILITY_TYPE_LABELS = {
  passive: 'Passive',
  basic: 'Basic',
  special: 'Special',
  ultimate: 'Ultimate',
};

const ABILITY_TYPE_COLORS = {
  passive: '#a78bfa',
  basic: '#60a5fa',
  special: '#34d399',
  ultimate: '#f97316',
};

function HighlightedText({ text, query }) {
  const parts = highlightText(text, query);
  return (
    <span>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark key={i} className="highlight">{part.text}</mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}

function AbilityCard({ ability, query, isPassive, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`ability-card ${isPassive ? 'passive' : ''} ${expanded ? 'expanded' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="ability-header">
        <span
          className="ability-type-badge"
          style={{ backgroundColor: ABILITY_TYPE_COLORS[ability.type] }}
        >
          {ABILITY_TYPE_LABELS[ability.type]}
        </span>
        <span className="ability-name">{ability.name}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`ability-chevron ${expanded ? 'expanded' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {expanded && (
        <div className="ability-description">
          <HighlightedText text={ability.description} query={query} />
        </div>
      )}
    </div>
  );
}

export default function CharacterCard({ result, query, allAbilities }) {
  const [showAll, setShowAll] = useState(false);

  const { character, matchedAbilities } = result;

  // Separate passive from others
  const passiveAbility = matchedAbilities.find((a) => a.type === 'passive');
  const otherMatched = matchedAbilities.filter((a) => a.type !== 'passive');

  // Get unmatched abilities from the full character data
  const matchedTypes = new Set(matchedAbilities.map((a) => a.type));
  const unmatchedAbilities = allAbilities
    ? ['basic', 'special', 'ultimate', 'passive']
        .filter((type) => !matchedTypes.has(type) && allAbilities[type])
        .map((type) => ({
          type,
          name: allAbilities[type].name,
          description: allAbilities[type].description,
        }))
    : [];

  return (
    <div className="character-card">
      <div className="character-header">
        <div className="character-portrait-wrapper">
          <img
            src={character.portrait}
            alt={character.name}
            className="character-portrait"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="portrait-fallback" style={{ display: 'none' }}>
            {character.name.charAt(0)}
          </div>
        </div>
        <div className="character-info">
          <h3 className="character-name">{character.name}</h3>
          <div className="character-traits">
            {character.traits.map((trait) => (
              <span key={trait} className="trait-tag">{trait}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="abilities-section">
        {/* Always show passive first if matched */}
        {passiveAbility && (
          <AbilityCard
            ability={passiveAbility}
            query={query}
            isPassive={true}
            defaultExpanded={true}
          />
        )}

        {/* Show other matched abilities */}
        {otherMatched.map((ability) => (
          <AbilityCard
            key={ability.type}
            ability={ability}
            query={query}
            isPassive={false}
            defaultExpanded={!!query}
          />
        ))}

        {/* Toggle for unmatched abilities */}
        {unmatchedAbilities.length > 0 && (
          <>
            {!showAll && (
              <button
                className="show-all-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAll(true);
                }}
              >
                Show {unmatchedAbilities.length} more {unmatchedAbilities.length === 1 ? 'ability' : 'abilities'}
              </button>
            )}
            {showAll &&
              unmatchedAbilities.map((ability) => (
                <AbilityCard
                  key={ability.type}
                  ability={ability}
                  query={query}
                  isPassive={ability.type === 'passive'}
                  defaultExpanded={false}
                />
              ))}
            {showAll && (
              <button
                className="show-all-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAll(false);
                }}
              >
                Show less
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
