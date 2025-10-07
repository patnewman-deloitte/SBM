import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import MarketRadarTab from "./marketRadar/MarketRadarTab";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MarketRadarTab />
  </React.StrictMode>
);
