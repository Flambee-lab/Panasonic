import { useApp } from "../context/AppContext";
import DeviceTable from "./DeviceTable";

export default function Dashboard() {
  const { hasConflict, duplicateIp, openDrawer, openDrawerForSelection, canChangeIp, stats } =
    useApp();

  return (
    <div className="content-shell">
      {hasConflict && (
        <div
          className="dash-alert-banner"
          role="alert"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="m-0 text-xs font-semibold uppercase tracking-wider text-[#ff7a88]">
                Critical alert
              </p>
              <p className="mt-1 max-w-2xl text-sm text-white/90">
                Duplicate IP addresses ({duplicateIp}) were detected on{" "}
                <strong className="text-white">{stats.conflicts} Panasonic cameras</strong>.
                The remaining devices ({stats.online}) are using unique IPs.
              </p>
            </div>
            <button type="button" onClick={() => openDrawer()} className="btn primary ip-banner-cta">
              Resolve IP conflict
            </button>
          </div>
        </div>
      )}

      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-search-row">
            <div
              className="scan-status-widget"
              data-scan-state={hasConflict ? "scanning" : "completed"}
              aria-live="polite"
            >
              <div className="scan-status-outer">
                <div className="scan-status-inner">
                  <div className="scan-status-body">
                    <div className="scan-status-thumb" aria-hidden="true">
                      {hasConflict ? (
                        <svg
                          className="scan-status-ico-scan"
                          style={{ opacity: 1 }}
                          viewBox="0 0 36 36"
                          fill="none"
                        >
                          <circle cx="18" cy="18" r="14" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                          <g className="scan-status-spin">
                            <circle
                              cx="18"
                              cy="18"
                              r="14"
                              stroke="#f0b85f"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeDasharray="22 66"
                            />
                          </g>
                        </svg>
                      ) : (
                        <svg
                          className="scan-status-ico-done"
                          style={{ opacity: 1 }}
                          viewBox="0 0 36 36"
                          fill="none"
                        >
                          <circle cx="18" cy="18" r="14" stroke="#60c899" strokeWidth="2" />
                          <path
                            d="M11.5 18.2l4.2 4.3 9.3-9.4"
                            stroke="#60c899"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="scan-status-copy">
                      <div className="scan-status-line1">
                        <span className="scan-status-title">Devices</span>
                        <span className="scan-status-sep" aria-hidden="true">
                          {" "}
                          ·{" "}
                        </span>
                        <span className="scan-status-phase">
                          {hasConflict ? "IP conflict" : "Operational"}
                        </span>
                      </div>
                      <p className="scan-status-detail">
                        Intel(R) Ethernet Connection (4)... · {stats.total} devices
                        {hasConflict
                          ? ` · ${stats.conflicts} in conflict`
                          : " · stable network"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="search-field">
              <svg
                className="search-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="6" />
                <path d="M16 16l4 4" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                name="dash-search"
                placeholder="Search"
                autoComplete="off"
                aria-label="Search devices by name, IP, or model"
              />
            </div>
            <button type="button" className="filters-btn">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 10l5 5 5-5H7z" />
              </svg>
              Filters
            </button>
          </div>
        </div>
        <div className="topbar-orbs" aria-hidden="true">
          <button type="button" className="orb-btn" tabIndex={-1}>
            <span className="orb-placeholder" />
          </button>
          <button type="button" className="orb-btn" tabIndex={-1}>
            <span className="orb-placeholder" />
          </button>
          <button type="button" className="orb-btn" tabIndex={-1}>
            <span className="orb-placeholder" />
          </button>
        </div>
      </header>

      <main className="table-wrap">
        <div className="dash-card">
          <div className="dash-toolbar dash-toolbar--sticky">
            <div className="dash-toolbar-left">
              <button
                type="button"
                className="pill-action"
                onClick={openDrawerForSelection}
                disabled={!canChangeIp}
                title={
                  canChangeIp
                    ? "Change IP for selected cameras in conflict"
                    : "Select one or more cameras with duplicate IP"
                }
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                Change IP
              </button>
              <button type="button" className="pill-action">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="12" cy="8" r="3" />
                  <path d="M6 20c0-4 3-6 6-6s6 2 6 6" />
                </svg>
                Register Admin
              </button>
              <div className="duo-btn" role="group" aria-label="Import and export">
                <button type="button" aria-label="Download">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 4v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 20h14" strokeLinecap="round" />
                  </svg>
                </button>
                <button type="button" aria-label="Upload">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 20V8m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 4h14" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="dash-toolbar-right">
              <label className="switch-inline dash-toggle">
                Advance functions
                <span className="toggle-switch">
                  <input type="checkbox" />
                  <span className="toggle-slider" />
                </span>
              </label>
            </div>
          </div>

          <div className="dashboard-content">
            <DeviceTable />
          </div>
        </div>
      </main>
    </div>
  );
}
