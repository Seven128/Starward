import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AdminPage from "./app/page";
import "./app/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><AdminPage /></StrictMode>,
);
