import { useMemo, useState } from "react";
import { groupCamerasByServer } from "../data/cameraServers";

const ASSET = "/assets/camera-monitor";

export default function CameraServersRail({ cameras, activeId, onSelectCamera }) {
  const servers = useMemo(() => groupCamerasByServer(cameras), [cameras]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [openIds, setOpenIds] = useState(() => new Set(servers[0] ? [servers[0].id] : []));

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return servers;
    return servers
      .map((server) => ({
        ...server,
        cameras: server.cameras.filter(
          (camera) =>
            camera.alias.toLowerCase().includes(needle) ||
            camera.deviceId.toLowerCase().includes(needle) ||
            server.name.toLowerCase().includes(needle)
        ),
      }))
      .filter((server) => server.name.toLowerCase().includes(needle) || server.cameras.length > 0);
  }, [query, servers]);

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className="camera-monitor__servers">
      <div className="camera-monitor__servers-head">
        <div className="camera-monitor__servers-title">
          <strong>All Servers</strong>
          <span>{servers.length}</span>
        </div>
        <button
          type="button"
          className="camera-monitor__servers-search"
          aria-label="Search servers and cameras"
          onClick={() => setSearchOpen((open) => !open)}
        >
          <img src={`${ASSET}/search.svg`} alt="" width={20} height={20} />
        </button>
      </div>
      {searchOpen ? (
        <input
          className="camera-monitor__servers-input"
          type="search"
          value={query}
          placeholder="Search"
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
        />
      ) : null}
      <div className="camera-monitor__servers-list">
        {visible.map((server) => {
          const open = openIds.has(server.id) && server.cameras.length > 0;
          return (
            <div key={server.id} className={`camera-monitor__server${open ? " is-open" : ""}`}>
              <button type="button" className="camera-monitor__server-row" onClick={() => toggle(server.id)}>
                <img
                  src={`${ASSET}/${open ? "server-row.svg" : "server-row-off.svg"}`}
                  alt=""
                  width={18}
                  height={18}
                />
                <span>{server.name}</span>
                <img
                  src={`${ASSET}/${open ? "caret-up.svg" : "caret-down.svg"}`}
                  alt=""
                  width={20}
                  height={20}
                />
              </button>
              {open
                ? server.cameras.map((camera) => {
                    const active = camera.id === activeId;
                    return (
                      <button
                        key={camera.id}
                        type="button"
                        className={`camera-monitor__cam-row${active ? " is-active" : ""}`}
                        onClick={() => onSelectCamera?.(camera)}
                      >
                        <img src={`${ASSET}/cam-list.svg`} alt="" width={16} height={16} />
                        <span>{camera.alias}</span>
                      </button>
                    );
                  })
                : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
