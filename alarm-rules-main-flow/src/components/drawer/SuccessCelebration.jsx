export default function SuccessCelebration() {
  return (
    <div className="proc-hero proc-hero--success">
      <div className="proc-hero__visual proc-hero__visual--success" aria-hidden="true">
        <span className="proc-hero__pulse proc-hero__pulse--success" />
        <span className="proc-hero__pulse proc-hero__pulse--success proc-hero__pulse--2" />
        <span className="proc-hero__particle proc-hero__particle--1" />
        <span className="proc-hero__particle proc-hero__particle--2" />
        <span className="proc-hero__particle proc-hero__particle--3" />
        <span className="proc-hero__particle proc-hero__particle--4" />
        <span className="proc-hero__particle proc-hero__particle--5" />
        <span className="proc-hero__particle proc-hero__particle--6" />
        <span className="proc-hero__hub proc-hero__hub--success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path
              className="proc-hero__check-stroke"
              d="M6 12l4 4 9-9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}
