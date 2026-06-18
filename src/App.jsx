import { AppProvider } from "./context/AppContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ConfigureCamerasOsd from "./components/ConfigureCamerasOsd";
import IPDrawer from "./components/IPDrawer";
import Toast from "./components/drawer/Toast";
import { useApp } from "./context/AppContext";

function AppShell() {
  const { toast, dismissToast, activeView } = useApp();
  const isConfigureOsd = activeView === "configure-osd";

  return (
    <div
      className={`main-screen flex min-h-screen text-[#e9edf5]${isConfigureOsd ? " main-screen--configure-osd" : ""}`}
    >
      {!isConfigureOsd && <Sidebar />}
      {isConfigureOsd ? <ConfigureCamerasOsd /> : <Dashboard />}
      {!isConfigureOsd && <IPDrawer />}
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
