import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider, useApp } from "./context/AppContext";
import CameraMonitor from "./components/CameraMonitor";
import Toast from "./components/drawer/Toast";
import "./index.css";
import "./styles/ict-ui.css";

function MonitorShell() {
  const { cameras, toast, dismissToast } = useApp();
  const [camera, setCamera] = useState(() => cameras[0] ?? null);
  const active = cameras.find((item) => item.id === camera?.id) ?? cameras[0] ?? null;

  return (
    <>
      <CameraMonitor camera={active} onSelectCamera={setCamera} />
      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}

const rootEl = document.getElementById("monitor-root");

if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <AppProvider>
        <MonitorShell />
      </AppProvider>
    </StrictMode>
  );
}
