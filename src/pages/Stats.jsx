import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function StatCard({ title, value }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 16,
        padding: 18,
        boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ fontSize: 14, color: "#666", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

export default function Stats() {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      const { data, error } = await supabase.from("escossells_map").select("*");

      if (error) {
        console.error("ERROR STATS:", error);
        setLoading(false);
        return;
      }

      setPoints(data || []);
      setLoading(false);
    }

    loadStats();
  }, []);

  const buits = points.filter((p) => p.kind === "buit" && p.status !== "arbre").length;
  const falta = points.filter((p) => p.kind === "falta" && p.status !== "arbre").length;
  const arbres = points.filter((p) => p.status === "arbre").length;
  const total = points.length;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Estadístiques</div>
      <div style={{ color: "#666", marginBottom: 20 }}>
        Resum simple dels punts registrats al mapa.
      </div>

      {loading ? (
        <div>Carregant...</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <StatCard title="Total de punts" value={total} />
          <StatCard title="Escossells buits" value={buits} />
          <StatCard title="Falta escossell" value={falta} />
          <StatCard title="Arbres plantats" value={arbres} />
        </div>
      )}
    </div>
  );
}