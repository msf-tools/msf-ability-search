import { useState, useMemo } from 'react';

export default function TraitFilter({ characters, selectedTraits, onTraitsChange }) {
  const [expanded, setExpanded] = useState(false);

  const traitGroups = useMemo(() => {
    const traitCounts = new Map();
    characters.forEach((char) => {
      char.traits.forEach((trait) => {
        traitCounts.set(trait, (traitCounts.get(trait) || 0) + 1);
      });
    });

    // Group traits by category
    const origins = ['Bio', 'Mystic', 'Mutant', 'Skill', 'Tech'];
    const roles = ['Blaster', 'Brawler', 'Controller', 'Protector', 'Support'];
    const alignments = ['Hero', 'Villain'];
    const locations = ['Global', 'Cosmic', 'City'];

    const categorized = {
      Origin: origins.filter((t) => traitCounts.has(t)),
      Role: roles.filter((t) => traitCounts.has(t)),
      Alignment: alignments.filter((t) => traitCounts.has(t)),
      Location: locations.filter((t) => traitCounts.has(t)),
    };

    // Everything else goes into Teams
    const usedTraits = new Set([...origins, ...roles, ...alignments, ...locations]);
    const teamTraits = Array.from(traitCounts.keys())
      .filter((t) => !usedTraits.has(t))
      .sort();
    if (teamTraits.length > 0) {
      categorized['Team'] = teamTraits;
    }

    return { categorized, counts: traitCounts };
  }, [characters]);

  const toggleTrait = (trait) => {
    if (selectedTraits.includes(trait)) {
      onTraitsChange(selectedTraits.filter((t) => t !== trait));
    } else {
      onTraitsChange([...selectedTraits, trait]);
    }
  };

  return (
    <div className="trait-filter">
      <button
        className="trait-toggle-btn"
        onClick={() => setExpanded(!expanded)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
        Trait Filters
        {selectedTraits.length > 0 && (
          <span className="trait-count-badge">{selectedTraits.length}</span>
        )}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`chevron ${expanded ? 'expanded' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="trait-groups">
          {selectedTraits.length > 0 && (
            <button className="clear-traits-btn" onClick={() => onTraitsChange([])}>
              Clear all filters
            </button>
          )}
          {Object.entries(traitGroups.categorized).map(([group, traits]) => (
            <div key={group} className="trait-group">
              <div className="trait-group-label">{group}</div>
              <div className="trait-chips">
                {traits.map((trait) => (
                  <button
                    key={trait}
                    className={`trait-chip ${selectedTraits.includes(trait) ? 'active' : ''}`}
                    onClick={() => toggleTrait(trait)}
                  >
                    {trait}
                    <span className="trait-chip-count">{traitGroups.counts.get(trait)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
