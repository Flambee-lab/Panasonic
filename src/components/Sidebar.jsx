import { useApp } from "../context/AppContext";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", src: "/assets/sidebar/1.svg", active: true },
  { id: "locks", label: "Cerraduras", src: "/assets/sidebar/2.svg" },
  { id: "logs", label: "Registros", src: "/assets/sidebar/3.svg" },
];

function NavIcon({ src, label }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center">
      <img
        src={src}
        alt=""
        width={20}
        height={20}
        className="h-5 w-5 object-contain"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </span>
  );
}

export default function Sidebar() {
  const { hasConflict, conflictCameras, openDrawer } = useApp();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col items-center justify-between bg-[#24252f] px-3 pb-3 pt-5"
      aria-label="Navegación principal"
    >
      <div className="flex flex-col items-center gap-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-300 ease-in-out ${
              item.active
                ? "border-white/10 bg-[#171b24] text-white"
                : "border-white/6 bg-transparent text-white/85 opacity-40 hover:opacity-70"
            }`}
            aria-label={item.label}
            title={item.label}
          >
            <NavIcon src={item.src} label={item.label} />
          </button>
        ))}

        <button
          type="button"
          onClick={() => openDrawer()}
          disabled={!hasConflict}
          className="icon-btn sidebar-ip-action relative mt-2"
          aria-label="Resolver conflicto de IP"
          title="Resolver conflicto de IP"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 7h16M4 12h10M4 17h6" strokeLinecap="round" />
            <circle cx="17" cy="12" r="2" fill="currentColor" />
          </svg>
          {hasConflict && (
            <span
              className="ip-badge-pulse absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff7a88] px-1 text-[10px] font-semibold text-[#1a0a0c]"
              aria-hidden="true"
            >
              {conflictCameras.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/6 bg-white/5 text-white/70 opacity-40"
          aria-label="Ajustes"
          title="Ajustes"
        >
          <img src="/assets/sidebar/NEW/NEW/NEW/Setteings.svg" alt="" className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/6 bg-white/5 text-white/70"
          aria-label="Perfil"
          title="Perfil"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="9" r="4" />
            <path d="M5 20c1.5-4 12.5-4 14 0" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
