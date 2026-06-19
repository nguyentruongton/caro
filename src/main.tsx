import React from "react";
import { createRoot } from "react-dom/client";
import "@bug-on/md3-react/material-symbols-cdn.css";
import "./styles.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
