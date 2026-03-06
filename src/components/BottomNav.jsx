export default function BottomNav({ tab, setTab }) {
  const itemStyle = (name) => ({
    flex: 1,
    border: "none",
    background: "none",
    fontSize: 14,
    padding: "8px 0",
    cursor: "pointer",
    color: tab === name ? "#2e7d32" : "#666",
    fontWeight: tab === name ? "600" : "400",
    lineHeight: 1.2,
  });

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: "white",
        borderTop: "1px solid #ddd",
        display: "flex",
        zIndex: 6000,
      }}
    >
      <button style={itemStyle("home")} onClick={() => setTab("home")}>
        🏠
        <br />
        Inici
      </button>

      <button style={itemStyle("map")} onClick={() => setTab("map")}>
        🗺
        <br />
        Mapa
      </button>

      <button style={itemStyle("stats")} onClick={() => setTab("stats")}>
        📊
        <br />
        Estadístiques
      </button>
    </div>
  );
}