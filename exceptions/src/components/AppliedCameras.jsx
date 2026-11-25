import { CAMERA_GROUPS, CAMERAS } from "../data/alarm-cameras";

const ICONS = {
  server: "/assets/alarm-rules/cameras/server.svg",
  group: "/assets/alarm-rules/cameras/group.svg",
};

function supportsEvents(camera, eventTypeIds) {
  return !(camera.unsupported ?? []).some((gap) => eventTypeIds.includes(gap));
}

function GroupRow({ group, last }) {
  return (
    <div className={`camera-applied__row${last ? " is-last" : ""}${group.complete ? " is-complete" : ""}`}>
      <div className="camera-applied__title">
        {group.icon ? <img src={ICONS[group.icon]} alt="" title={group.kind} /> : <span className="camera-applied__slot" aria-hidden="true" />}
        <p>
          <strong title={group.kind}>{group.name}</strong>
          <span>{` · ${group.cameras.length}`}</span>
        </p>
      </div>
      {group.complete ? (
        <p className="camera-applied__all">All cameras in this {group.kind.toLowerCase()} that can run these events.</p>
      ) : (
        <div className="camera-applied__grid">
          {group.cameras.map((camera) => (
            <div className="camera-applied__camera" key={camera.id}>
              <img src="/assets/alarm-rules/cameras/camera.svg" alt="" />
              <span>{camera.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AppliedCameras({ ids, eventTypeIds = [] }) {
  const selected = new Set(ids);
  const filled = CAMERA_GROUPS.map((group) => {
    const cameras = CAMERAS.filter((camera) => camera.groupId === group.id && selected.has(camera.id)).sort(
      (left, right) => left.order - right.order,
    );
    const pool = CAMERAS.filter((camera) => camera.groupId === group.id && supportsEvents(camera, eventTypeIds));
    const reachable = pool.filter((camera) => !camera.offline);
    const complete = reachable.length > 0 && reachable.every((camera) => selected.has(camera.id));
    return { ...group, cameras, complete };
  }).filter((group) => group.cameras.length);

  const servers = filled.filter((group) => group.kind === "Server");
  const groups = filled.filter((group) => group.kind !== "Server");

  return (
    <div className="camera-applied">
      {servers.length ? (
        <div className="camera-applied__card">
          {servers.map((group, index) => (
            <GroupRow key={group.id} group={group} last={index === servers.length - 1} />
          ))}
        </div>
      ) : null}
      {groups.map((group) => (
        <div className="camera-applied__card" key={group.id}>
          <GroupRow group={group} last />
        </div>
      ))}
    </div>
  );
}
