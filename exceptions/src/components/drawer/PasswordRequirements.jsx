const RULES = [
  { key: "length", label: "8–32 characters" },
  { key: "uppercase", label: "One uppercase letter (A–Z)" },
  { key: "number", label: "One number (0–9)" },
  { key: "symbol", label: "One special character" },
];

export default function PasswordRequirements({ checks, matchOk, showMatch }) {
  return (
    <ul className="pwd-requirements" aria-live="polite">
      {RULES.map(({ key, label }) => (
        <li
          key={key}
          className={`pwd-requirements__item${checks[key] ? " is-met" : ""}`}
        >
          <span className="pwd-requirements__dot" aria-hidden="true" />
          {label}
        </li>
      ))}
      {showMatch && (
        <li className={`pwd-requirements__item${matchOk ? " is-met" : ""}`}>
          <span className="pwd-requirements__dot" aria-hidden="true" />
          Passwords match
        </li>
      )}
    </ul>
  );
}
