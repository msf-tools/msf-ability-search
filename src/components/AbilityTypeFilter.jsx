import { ABILITY_TYPES } from '../utils/search';

const ABILITY_LABELS = {
  passive: 'Passive',
  basic: 'Basic',
  special: 'Special',
  ultimate: 'Ultimate',
};

export default function AbilityTypeFilter({ selectedTypes, onTypesChange }) {
  const activeTypes = selectedTypes.length ? selectedTypes : ABILITY_TYPES;

  const toggleType = (type) => {
    const nextTypes = activeTypes.includes(type)
      ? activeTypes.filter((selected) => selected !== type)
      : [...activeTypes, type];

    onTypesChange(nextTypes.length === ABILITY_TYPES.length ? [] : nextTypes);
  };

  return (
    <div className="ability-type-filter" aria-label="Ability type filters">
      {ABILITY_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          className={`ability-type-chip ${activeTypes.includes(type) ? 'active' : ''}`}
          onClick={() => toggleType(type)}
          aria-pressed={activeTypes.includes(type)}
        >
          {ABILITY_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
