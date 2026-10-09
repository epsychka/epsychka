import { useId, type ReactNode } from 'react';

interface FieldProps {
  label: string;
  children: (id: string) => ReactNode;
  hint?: string;
  className?: string;
}

/** Label + control wrapper; passes a generated id to the control. */
export function Field({ label, children, hint, className }: FieldProps) {
  const id = useId();
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

interface NumberInputProps {
  id: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

/** Number input that never produces NaN and clamps to min/max. */
export function NumberInput({ id, value, onChange, min = 0, max = 600, step = 1 }: NumberInputProps) {
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={Number.isFinite(value) ? value : ''}
      onChange={(e) => {
        const n = e.target.valueAsNumber;
        onChange(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);
      }}
    />
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  const id = useId();
  return (
    <div className="field">
      {label && (
        <span className="field-label" id={id}>
          {label}
        </span>
      )}
      <div className="segmented" role="radiogroup" aria-labelledby={label ? id : undefined}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={value === o.value ? 'active' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
