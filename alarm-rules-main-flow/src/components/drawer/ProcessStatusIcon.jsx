export default function ProcessStatusIcon({ status }) {
  if (status === "queued") {
    return (
      <span className="proc-icon proc-icon--queued" aria-hidden="true">
        <span className="proc-icon__dot" />
        <span className="proc-icon__dot" />
        <span className="proc-icon__dot" />
      </span>
    );
  }

  if (status === "writing") {
    return (
      <span className="proc-icon proc-icon--writing" aria-hidden="true">
        <span className="proc-icon__orbit" />
        <span className="proc-icon__orbit proc-icon__orbit--delay" />
        <span className="proc-icon__core">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
          </svg>
        </span>
      </span>
    );
  }

  return (
    <span className="proc-icon proc-icon--done" aria-hidden="true">
      <span className="proc-icon__ring" />
      <svg className="proc-icon__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path className="proc-icon__check-path" d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
