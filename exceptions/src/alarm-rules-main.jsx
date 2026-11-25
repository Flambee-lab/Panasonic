import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AlarmRulesAccess from "./components/AlarmRulesAccess";
import "./styles/new-alarm-rule.css";
import "./styles/live-events.css";
import "./styles/b2-manager.css";
import "./styles/new-exception-flow.css";

const rootEl = document.getElementById("alarm-rules-root");

if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <AlarmRulesAccess />
    </StrictMode>
  );
}
