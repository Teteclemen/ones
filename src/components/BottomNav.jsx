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
          width: "100%",
          height: 72,
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",

          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid rgba(255,255,255,0.25)",

          zIndex: 5000
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