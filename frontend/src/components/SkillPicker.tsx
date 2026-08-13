import { useMemo, useState } from 'react';
import {
  SKILL_FIELDS,
  type SkillField,
} from '../data/skillsCatalog';

type Props = {
  selected: string[];
  onChange: (skills: string[]) => void;
  disabled?: boolean;
  optional?: boolean;
};

export function SkillPicker({ selected, onChange, disabled, optional }: Props) {
  const [fieldId, setFieldId] = useState(SKILL_FIELDS[0]?.id ?? '');

  const activeField: SkillField | undefined = useMemo(
    () => SKILL_FIELDS.find((f) => f.id === fieldId) ?? SKILL_FIELDS[0],
    [fieldId]
  );

  function toggleSkill(skill: string) {
    if (disabled) return;
    if (selected.includes(skill)) {
      onChange(selected.filter((s) => s !== skill));
    } else {
      onChange([...selected, skill]);
    }
  }

  function removeSkill(skill: string) {
    if (disabled) return;
    onChange(selected.filter((s) => s !== skill));
  }

  return (
    <div className="skill-picker">
      <div className="selected-skills" aria-live="polite">
        {selected.length ? (
          selected.map((skill) => (
            <span key={skill} className="skill-chip">
              {skill}
              <button
                type="button"
                className="skill-chip-remove"
                aria-label={`Remove ${skill}`}
                onClick={() => removeSkill(skill)}
                disabled={disabled}
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <p className="muted">
            {optional
              ? 'No skills selected yet (optional).'
              : 'No skills selected yet — choose a field, then pick skills below.'}
          </p>
        )}
      </div>

      <label>
        Skill field
        <select
          value={activeField?.id ?? ''}
          onChange={(e) => setFieldId(e.target.value)}
          disabled={disabled}
        >
          {SKILL_FIELDS.map((field) => (
            <option key={field.id} value={field.id}>
              {field.label}
            </option>
          ))}
        </select>
      </label>

      <div className="skill-options" role="group" aria-label={`${activeField?.label} skills`}>
        {activeField?.skills.map((skill) => {
          const isOn = selected.includes(skill);
          return (
            <button
              key={skill}
              type="button"
              className={`skill-option ${isOn ? 'selected' : ''}`}
              onClick={() => toggleSkill(skill)}
              disabled={disabled}
              aria-pressed={isOn}
            >
              {skill}
            </button>
          );
        })}
      </div>
      <p className="field-hint">
        Pick from the list only — this keeps matching consistent across volunteers and needs.
      </p>
    </div>
  );
}
