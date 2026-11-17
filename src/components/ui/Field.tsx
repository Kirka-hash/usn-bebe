import { useId } from 'react';
import type { ChangeEvent } from 'react';
import styles from './Field.module.css';

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  /** Звёздочка в подписи, как в прототипе */
  mark?: boolean;
  error?: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  autoComplete?: string;
}

/** Поле анкеты: подпись 11px + инпут (радиус 6, рамка #dbdee5) */
export function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  required,
  mark,
  error,
  type = 'text',
  autoComplete,
}: FieldProps) {
  const id = useId();
  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {(required || mark) && ' *'}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        className={`${styles.input} ${error ? styles.invalid : ''}`}
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
      {error && (
        <p className={styles.error} id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
