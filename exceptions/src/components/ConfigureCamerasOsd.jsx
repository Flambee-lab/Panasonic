import { useApp } from "../context/AppContext";
import CgiSenderPanel from "./osd/CgiSenderPanel";
import OsdConfigPanel from "./osd/OsdConfigPanel";
import OsdPreviewMonitor from "./osd/OsdPreviewMonitor";
import "../styles/configure-cameras.css";

export default function ConfigureCamerasOsd() {
  const { navigateToNetwork } = useApp();

  return (
    <div className="content-shell osd-view">
      <header className="osd-view__header">
        <div className="osd-view__header-left">
          <div className="osd-view__title-row">
            <button
              type="button"
              className="osd-back-btn"
              onClick={navigateToNetwork}
              aria-label="Back to network dashboard"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h1 className="osd-view__title">Configure Cameras</h1>
          </div>
        </div>
        <div className="osd-view__header-right" aria-hidden="true" />
      </header>

      <div className="osd-view__body">
        <div className="osd-split">
          <OsdPreviewMonitor />
          <OsdConfigPanel />
        </div>
        <div className="osd-view__cgi">
          <CgiSenderPanel />
        </div>
      </div>
    </div>
  );
}
