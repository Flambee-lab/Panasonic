import { useApp } from "../context/AppContext";
import {
  AdvanceFunctionsPanel,
  AdvanceFunctionsToggle,
  useAdvanceFunctions,
} from "./AdvanceFunctionsFlyout";
import DeviceTable from "./DeviceTable";

export default function Dashboard() {
  const { stats } = useApp();
  const {
    open: advanceOpen,
    setOpen: setAdvanceOpen,
    handleAction: handleAdvanceAction,
    hasSelection,
  } = useAdvanceFunctions();

  return (
    <div className="content-shell">
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-search-row">
            <div className="scan-status-widget" data-scan-state="completed" aria-live="polite">
              <div className="scan-status-outer">
                <div className="scan-status-inner">
                  <div className="scan-status-body">
                    <div className="scan-status-thumb" aria-hidden="true">
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
                    </div>
                    <div className="scan-status-copy">
                      <div className="scan-status-line1">
                        <span className="scan-status-title">Devices</span>
                        <span className="scan-status-sep" aria-hidden="true">
                          {" "}
                          ·{" "}
                        </span>
                        <span className="scan-status-phase">Operational</span>
                      </div>
                      <p className="scan-status-detail">
                        Intel(R) Ethernet Connection (4)... · {stats.total} devices · stable network
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
              <AdvanceFunctionsPanel
                open={advanceOpen}
                onAction={handleAdvanceAction}
                hasSelection={hasSelection}
              />
            </div>
            <div className="dash-toolbar-right">
              <AdvanceFunctionsToggle open={advanceOpen} onOpenChange={setAdvanceOpen} />
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
