import { AppProvider } from "./context/AppContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ConfigureCamerasReview from "./components/ConfigureCamerasReview";
import ConfigureCamerasOsd from "./components/ConfigureCamerasOsd";
import ConfigCamerasDrawer from "./components/ConfigCamerasDrawer";
import IPDrawer from "./components/IPDrawer";
import Toast from "./components/drawer/Toast";
import { useApp } from "./context/AppContext";

function AppShell() {
  const { toast, dismissToast, activeView } = useApp();
  const isConfigureOsd = activeView === "configure-osd";
  const isConfigureReview = activeView === "configure-review";
  const hideSidebar = isConfigureOsd || isConfigureReview;

  return (
    <div
      className={`main-screen flex min-h-screen text-[#e9edf5]${
        isConfigureOsd || isConfigureReview ? " main-screen--configure-osd" : ""
      }`}
    >
      {!hideSidebar && <Sidebar />}
      {isConfigureOsd ? (
        <ConfigureCamerasOsd />
      ) : isConfigureReview ? (
        <ConfigureCamerasReview />
      ) : (
        <Dashboard />
      )}
      {!hideSidebar && <IPDrawer />}
      {isConfigureReview && <ConfigCamerasDrawer />}
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
