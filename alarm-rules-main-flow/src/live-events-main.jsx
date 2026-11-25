import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LiveEventsScreen from "./components/LiveEventsScreen";
import "./styles/live-events.css";

createRoot(document.getElementById("live-events-root")).render(
  <StrictMode>
    <LiveEventsScreen />
  </StrictMode>,
);
