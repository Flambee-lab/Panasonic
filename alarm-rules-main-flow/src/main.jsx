import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/device-table.css";
import "./styles/ict-ui.css";
import "./styles/configure-cameras.css";
import "./styles/camera-stream-preview.css";

const rootEl = document.getElementById("dashboard-root");

if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
