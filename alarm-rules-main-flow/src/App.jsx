import { AppProvider } from "./context/AppContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ConfigureCamerasReview from "./components/ConfigureCamerasReview";
import ConfigureCamerasOsd from "./components/ConfigureCamerasOsd";
import ConfigCamerasDrawer from "./components/ConfigCamerasDrawer";
import IPDrawer from "./components/IPDrawer";
import ReportDrawer from "./components/ReportDrawer";
import FirmwareDrawer from "./components/FirmwareDrawer";
import FirmwareAlertBanner from "./components/FirmwareAlertBanner";
import Toast from "./components/drawer/Toast";
import { useApp } from "./context/AppContext";

function AppShell() {
  const { toast, dismissToast, activeView, firmwareUpdateCameras } = useApp();
  const isConfigureOsd = activeView === "configure-osd";
  const isConfigureReview = activeView === "configure-review";
  const hideSidebar = isConfigureOsd || isConfigureReview;
  const showFirmwareBanner = !hideSidebar && firmwareUpdateCameras.length > 0;

  return (
    <div
      className={`main-screen flex h-full min-h-0 flex-col overflow-hidden text-[#e9edf5]${
        isConfigureOsd || isConfigureReview ? " main-screen--configure-osd" : ""
      }${showFirmwareBanner ? " has-firmware-banner" : ""}`}
    >
      {showFirmwareBanner ? <FirmwareAlertBanner /> : null}
      {!hideSidebar && <Sidebar />}
      {isConfigureOsd ? (
        <ConfigureCamerasOsd />
      ) : isConfigureReview ? (
        <ConfigureCamerasReview />
      ) : (
        <Dashboard />
      )}
      {!hideSidebar && <IPDrawer />}
      {!hideSidebar && <ReportDrawer />}
      {!hideSidebar && <FirmwareDrawer />}
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
