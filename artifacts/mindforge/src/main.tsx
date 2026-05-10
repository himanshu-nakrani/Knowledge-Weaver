import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const saved = localStorage.getItem("yukara-theme") ?? localStorage.getItem("mindforge-theme");
const theme = saved === "light" ? "light" : "dark";
document.documentElement.classList.add(theme);

createRoot(document.getElementById("root")!).render(<App />);
