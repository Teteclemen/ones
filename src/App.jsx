import { useState } from "react";
import Home from "./pages/Home";
import MapPage from "./pages/MapPage";
import Stats from "./pages/Stats";
import BottomNav from "./components/BottomNav";

function App() {
  const [tab, setTab] = useState("home");

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7f7", paddingBottom: 72 }}>
      {tab === "home" && <Home setTab={setTab} />}
      {tab === "map" && <MapPage />}
      {tab === "stats" && <Stats />}

      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

export default App;