import { useApp } from "../../context/AppContext";

export default function CgiSenderPanel() {
  const { cgiSender } = useApp();

  if (!cgiSender.visible) {
    return <div id="cgi-sender-container" className="is-hidden" aria-hidden="true" />;
  }

  const total = cgiSender.items.length;
  const startedLabel = cgiSender.startedAt
    ? cgiSender.startedAt.toLocaleTimeString("en-GB", { hour12: false })
    : "—";

  return (
    <div id="cgi-sender-container" role="status" aria-live="polite">
      <div className="cgi-sender__head">
        <h3 className="cgi-sender__title">CGI Transmission Queue</h3>
        <span className="cgi-sender__meta">
          Started {startedLabel} · {cgiSender.completedCount}/{total} completed
        </span>
      </div>
      <ul className="cgi-sender__list">
        {cgiSender.items.map((item) => (
          <li key={item.cameraId} className="cgi-sender__item">
            <span className="cgi-sender__item-name">{item.alias}</span>
            <span
              className={`cgi-sender__item-status${
                item.status === "sending"
                  ? " is-sending"
                  : item.status === "completed"
                    ? " is-done"
                    : ""
              }`}
            >
              {item.status === "sending" && (
                <>
                  <span className="cgi-spinner" aria-hidden="true" />
                  Sending...
                </>
              )}
              {item.status === "completed" && (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="#60c899" strokeWidth="1.5" />
                    <path
                      d="M8 12.5l2.5 2.5 5.5-5.5"
                      stroke="#60c899"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Completed.
                </>
              )}
              {item.status === "pending" && "Queued"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
