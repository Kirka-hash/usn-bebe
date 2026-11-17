import styles from './Checkbox.module.css';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
}

/** Чекбокс прототипа: 16px, радиус 4, синий квадрат с белой галочкой */
export function Checkbox({ label, checked, onChange, disabled, name }: CheckboxProps) {
  return (
    <label className={styles.row}>
      <input
        type="checkbox"
        name={name}
        className={styles.box}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.label}>{label}</span>
    </label>
  );
}
