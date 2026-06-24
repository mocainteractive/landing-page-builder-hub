import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { MocaProvider } from "@/lib/MocaProvider";
import { App } from "@/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MocaProvider>
      <App />
    </MocaProvider>
  </StrictMode>,
);
