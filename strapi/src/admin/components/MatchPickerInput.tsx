/**
 * Custom field Input for match-content's `eventId` — replaces Strapi's
 * default number input (which formats multi-digit integers with thousand
 * separators, making an ID look like a currency figure) with a searchable
 * dropdown of the current season's matches fetched from the SI API, so
 * editors pick a match by team names instead of typing a raw event ID.
 */
import * as React from 'react';
import { Field, Combobox, ComboboxOption } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

interface MatchOption {
  id: number;
  label: string;
}

interface MatchPickerInputProps {
  name: string;
  label?: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value?: number | null;
  onChange: (name: string, value: number | null) => void;
}

const MatchPickerInput = React.forwardRef<HTMLInputElement, MatchPickerInputProps>(
  ({ name, label, hint, error, required, disabled, value, onChange }, ref) => {
    const { get } = useFetchClient();
    const [options, setOptions] = React.useState<MatchOption[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      let cancelled = false;
      get('/api/match-contents/matches')
        .then(({ data }) => {
          if (!cancelled) setOptions(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) setOptions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [get]);

    // The current value's match may not be in the (current-season) options list —
    // e.g. an older event — so fall back to showing the raw ID rather than blanking it.
    const selected = value != null ? options.find((option) => option.id === value) : undefined;

    return (
      <Field.Root name={name} error={error} hint={hint} required={required}>
        <Field.Label>{label}</Field.Label>
        <Combobox
          ref={ref}
          value={value != null ? String(value) : undefined}
          textValue={selected ? selected.label : value != null ? String(value) : undefined}
          disabled={disabled}
          loading={loading}
          loadingMessage="Loading matches…"
          noOptionsMessage={() => 'No matches found'}
          onChange={(next) => onChange(name, next ? Number(next) : null)}
          onClear={() => onChange(name, null)}
        >
          {options.map((option) => (
            <ComboboxOption key={option.id} value={String(option.id)}>
              {option.label}
            </ComboboxOption>
          ))}
        </Combobox>
        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

export default MatchPickerInput;
