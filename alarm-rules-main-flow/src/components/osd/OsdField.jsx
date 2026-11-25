function ChevronDown() {
  return (
    <svg viewBox="0 0 8 5" width="8" height="5" fill="none" aria-hidden="true">
      <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function OsdSelectField({ id, label, value, onChange, options, mono = false }) {
  return (
    <div className={`osd-field${mono ? " osd-field--mono" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div
        className={`osd-field__control osd-field__control--select${value ? "" : " is-placeholder"}`}
      >
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled={value !== ""}>
            Select…
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span className="osd-field__chevron" aria-hidden="true">
          <ChevronDown />
        </span>
      </div>
    </div>
  );
}

export function OsdTextField({ id, label, value, onChange, placeholder }) {
  return (
    <div className="osd-field">
      <label htmlFor={id}>{label}</label>
      <div className="osd-field__control">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
