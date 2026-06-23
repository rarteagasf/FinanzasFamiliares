import { formatCurrency } from '../../utils';

export default function CurrencyValue({ value, style, className }) {
  const num = Number(value);
  const isNegative = !isNaN(num) && num < 0;

  return (
    <span
      className={className}
      style={{
        color: isNegative ? 'var(--danger)' : undefined,
        ...style
      }}
    >
      {formatCurrency(value)}
    </span>
  );
}
