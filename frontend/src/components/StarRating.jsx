// Read-only stars (value may be fractional) or, when onChange is given, a clickable 1-5 input.
export default function StarRating({ value = 0, onChange, size = 'text-xl' }) {
  const stars = [1, 2, 3, 4, 5];

  if (!onChange) {
    return (
      <span className={`${size} leading-none`} role="img" aria-label={`${value} out of 5 stars`}>
        {stars.map((n) => (
          <span key={n} className={value >= n - 0.25 ? 'text-yellow-400' : 'text-slate-300'}>★</span>
        ))}
      </span>
    );
  }

  return (
    <span className={`${size} leading-none`} role="radiogroup" aria-label="Rating">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          onClick={() => onChange(n)}
          className={`px-0.5 ${value >= n ? 'text-yellow-400' : 'text-slate-300'} hover:text-yellow-400`}
        >
          ★
        </button>
      ))}
    </span>
  );
}
