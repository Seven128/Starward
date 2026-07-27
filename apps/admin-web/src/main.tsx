import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AdminPage from "./app/page";
import "./app/styles.css";

document.documentElement.dataset.reducedMotionReady = "true";

createRoot(document.getElementById("root")!).render(
  <StrictMode><AdminPage /></StrictMode>,
);
