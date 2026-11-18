import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AlarmRulesAccess from "./components/AlarmRulesAccess";
import "./styles/new-alarm-rule.css";

const rootEl = document.getElementById("alarm-rules-root");

if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <AlarmRulesAccess />
    </StrictMode>
  );
}
