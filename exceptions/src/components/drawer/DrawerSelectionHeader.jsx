export default function DrawerSelectionHeader({ cameras }) {
  if (!cameras.length) return null;

  return (
    <div className="drawer-selection-header" aria-label="Selected devices">
      <p className="drawer-selection-header__label">Applying to</p>
      <div className="drawer-selection-header__pills">
        {cameras.map((cam) => (
          <span key={cam.id} className="drawer-device-pill">
            <span className="drawer-device-pill__alias">{cam.alias}</span>
            <span className="drawer-device-pill__model">{cam.model}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
