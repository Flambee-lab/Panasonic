import { useApp } from "../context/AppContext";

const NAV_ITEMS = [
  { id: "network", label: "Dashboard de Red", view: "network", src: "/assets/sidebar/1.svg" },
  { id: "logs", label: "Logs", view: null, src: "/assets/sidebar/3.svg" },
];

function NavIcon({ src }) {
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
  const { activeView, navigateToNetwork } = useApp();

  return (
    <aside
      className="app-sidebar fixed inset-y-0 left-0 z-30 flex w-16 flex-col items-center justify-between bg-[#24252f] px-3 pb-3 pt-5"
      aria-label="Main navigation"
    >
      <div className="flex flex-col items-center gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.view && activeView === item.view;
          return (
            <button
              key={item.id}
              type="button"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-300 ease-in-out ${
                isActive
                  ? "border-white/10 bg-[#171b24] text-white"
                  : "border-white/6 bg-transparent text-white/85 opacity-40 hover:opacity-70"
              }`}
              aria-label={item.label}
              title={item.label}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                if (item.view === "network") navigateToNetwork();
              }}
            >
              <NavIcon src={item.src} />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/6 bg-white/5 text-white/70 opacity-40"
          aria-label="Settings"
          title="Settings"
        >
          <img src="/assets/sidebar/NEW/NEW/NEW/Setteings.svg" alt="" className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/6 bg-white/5 text-white/70"
          aria-label="Profile"
          title="Profile"
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
