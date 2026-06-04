import { useCallback, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { getCameraThumbUrl } from "../data/cameraThumbs";
import { getTechnicalStatusLabel } from "../data/initialCameras";

function SortHeader({ label, className = "" }) {
  return (
    <span className={`th-sort ${className}`}>
      <span className="th-sort__label">{label}</span>
      <svg className="th-sort-icon" viewBox="0 0 8 12" fill="currentColor" aria-hidden="true">
        <path d="M4 0l3 4H1L4 0z" opacity="0.55" />
        <path d="M4 12L1 8h6L4 12z" opacity="0.55" />
      </svg>
    </span>
  );
}

function TechnicalStatusBadge({ status }) {
  const isConflict = status === "conflict";
  return (
    <span
      className={`tech-status-badge ${
        isConflict ? "tech-status-badge--conflict" : "tech-status-badge--ok"
      }`}
    >
      {getTechnicalStatusLabel(status)}
    </span>
  );
}

export default function DeviceTable() {
  const { cameras, selectedIds, setSelectedIds } = useApp();

  const allSelected = cameras.length > 0 && selectedIds.size === cameras.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < cameras.length;

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === cameras.length) return new Set();
      return new Set(cameras.map((c) => c.id));
    });
  }, [cameras, setSelectedIds]);

  const toggleRow = useCallback(
    (id) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [setSelectedIds]
  );

  const selectAllRef = useCallback(
    (node) => {
      if (node) node.indeterminate = someSelected;
    },
    [someSelected]
  );

  const rows = useMemo(
    () =>
      cameras.map((camera) => {
        const isConflict = camera.status === "conflict";
        const isSelected = selectedIds.has(camera.id);
        const rowClass = [
          isConflict ? "device-row--conflict" : "",
          isSelected ? "device-row--selected" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const thumbUrl = getCameraThumbUrl(camera.id);

        return (
          <tr
            key={camera.id}
            className={rowClass}
            onClick={(e) => {
              if (e.target.closest('input.check[type="checkbox"]')) return;
              toggleRow(camera.id);
            }}
          >
            <td className="td-check">
              <input
                className="check"
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleRow(camera.id)}
                aria-label={`Select ${camera.alias}`}
                onClick={(e) => e.stopPropagation()}
              />
            </td>
            <td className="td-cam">
              <div className="camera-thumb">
                <div className="camera-thumb-inner">
                  <img src={thumbUrl} alt="" />
                </div>
                <div className="camera-thumb-hover" aria-hidden="true">
                  <img src={thumbUrl} alt="" />
                </div>
              </div>
            </td>
            <td className="td-device">
              <div className="device-text">
                <span className="device-id">{camera.deviceId}</span>
                <span className="device-sub">{camera.alias}</span>
              </div>
            </td>
            <td className="td-model">{camera.model}</td>
            <td className="td-mac">{camera.mac}</td>
            <td className="td-fw">{camera.firmware}</td>
            <td className="td-ip">{camera.ip}</td>
            <td className="td-tech">
              <TechnicalStatusBadge status={camera.status} />
            </td>
          </tr>
        );
      }),
    [cameras, selectedIds, toggleRow]
  );

  return (
    <div className="dashboard-pane table-card">
      <div className="data-table-wrap dash-table-scroll">
        <table className="data-table">
          <colgroup>
            <col className="data-table-col-check" style={{ width: "44px" }} />
            <col className="data-table-col-cam" style={{ width: "92px" }} />
            <col className="data-table-col-device" style={{ width: "14%" }} />
            <col className="data-table-col-model" style={{ width: "12%" }} />
            <col className="data-table-col-mac" style={{ width: "14%" }} />
            <col className="data-table-col-fw" style={{ width: "10%" }} />
            <col className="data-table-col-ip" style={{ width: "12%" }} />
            <col className="data-table-col-tech" style={{ width: "14%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className="th-check">
                <input
                  ref={selectAllRef}
                  className="check"
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th className="th-cam" scope="col">
                <SortHeader label="Camera linked" />
              </th>
              <th className="th-device" scope="col">
                <SortHeader label="Camera / Alias" />
              </th>
              <th className="th-model" scope="col">
                <SortHeader label="Model" />
              </th>
              <th className="th-mac" scope="col">
                <SortHeader label="Mac Address" />
              </th>
              <th className="th-fw" scope="col">
                <SortHeader label="Version" />
              </th>
              <th className="th-ip" scope="col">
                <SortHeader label="IP address" />
              </th>
              <th className="th-tech" scope="col">
                <SortHeader label="Technical status" />
              </th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </div>
  );
}
