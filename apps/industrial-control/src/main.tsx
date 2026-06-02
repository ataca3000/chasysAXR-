import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./ui/App";
import { initAwareness } from "./awareness";
import "./styles.css";

initAwareness();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
