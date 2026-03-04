import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix icones Leaflet amb Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Component que recentra el mapa quan tenim posició
function RecenterMap({ position, zoom = 17 }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    map.setView(position, zoom);
  }, [position, zoom, map]);

  return null;
}

function App() {
  const [points, setPoints] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // 🔄 Carregar punts
  async function loadData() {
    const { data, error } = await supabase.from("escossells_map").select("*");

    if (error) {
      console.error("ERROR LOAD:", error);
      return;
    }

    console.log("PUNTS CARREGATS:", data);
    setPoints(data || []);
  }

  // Arrencada: carregar punts + demanar GPS per centrar
  useEffect(() => {
    loadData();

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.log("No puc centrar per GPS:", err?.code, err?.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Helper: geolocalització amb await
  function getPosition(options) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation no disponible en aquest navegador"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  // Helper: reverse geocoding (Nominatim)
  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const geo = await res.json();
      return geo.display_name || "Adreça desconeguda";
    } catch {
      return "Adreça desconeguda";
    }
  }

  // 📸 Foto + GPS + Insert
  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus("Pujant foto...");

    try {
      const fileName = `${Date.now()}_${file.name}`;

      // 1️⃣ Upload imatge
      const { error: uploadError } = await supabase.storage
        .from("escossells")
        .upload(fileName, file);

      if (uploadError) {
        console.error("ERROR UPLOAD:", uploadError);
        setStatus("Error pujant foto");
        alert("Error pujant imatge: " + (uploadError.message || "desconegut"));
        return;
      }

      // 2️⃣ Obtenir URL pública
      const { data: publicUrlData } = supabase.storage
        .from("escossells")
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) {
        setStatus("No s'ha pogut obtenir URL pública");
        alert("No s'ha pogut obtenir URL pública");
        return;
      }

      setStatus("Obtenint ubicació...");

      // 3️⃣ GPS
      const position = await getPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setUserPos([lat, lng]);

      // 4️⃣ Adreça (status abans, no després)
      setStatus("Calculant adreça...");
      const address = await reverseGeocode(lat, lng);

      // 5️⃣ RPC
      setStatus("Inserint punt...");
      const { data, error } = await supabase.rpc("insert_escossell", {
        new_lat: lat,
        new_lng: lng,
        new_address: address,
        new_comment: "Foto des del mòbil",
        new_foto_url: publicUrl,
      });

      if (error) {
        console.error("ERROR RPC:", error);
        setStatus("Error inserint");
        alert(
          "Error inserint: " +
            (error?.message || JSON.stringify(error) || "desconegut")
        );
        return;
      }

      if (data === "duplicate") {
        setStatus("Duplicat: ja hi ha un punt a prop.");
        alert("Duplicat!");
        return;
      }

      if (data === "inserted") {
        setStatus("Inserit!");
        alert("Inserit!");
        await loadData();
        return;
      }

      setStatus("Resposta inesperada");
      alert("Resposta inesperada del servidor: " + JSON.stringify(data));
    } catch (err) {
      console.error("ERROR GENERAL:", err);

      if (err && typeof err === "object" && "code" in err) {
        setStatus("Error obtenint GPS");
        alert("Error obtenint GPS: " + (err.message || "desconegut"));
      } else {
        setStatus("Error");
        alert("Error: " + (err?.message || JSON.stringify(err) || "desconegut"));
      }
    } finally {
      // IMPORTANT: reactivar botó i netejar estat sempre
      setLoading(false);
      setStatus("");
      event.target.value = "";
    }
  }

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <MapContainer
        center={userPos || [41.3851, 2.1734]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <RecenterMap position={userPos} zoom={17} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {points.map((point) => (
          <Marker key={point.id} position={[point.latitude, point.longitude]}>
            <Popup>
              <b>{point.address}</b>
              <br />
              {point.comentari}
              <br />
              {point.foto_url && (
                <img
                  src={point.foto_url}
                  alt="foto"
                  style={{
                    width: "200px",
                    marginTop: "8px",
                    borderRadius: "6px",
                  }}
                />
              )}
              <br />
              {point.created_at && (
                <small>{new Date(point.created_at).toLocaleString()}</small>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoUpload}
        disabled={loading}
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          zIndex: 1000,
          background: "white",
          padding: "12px",
          borderRadius: "8px",
          opacity: loading ? 0.5 : 1,
        }}
      />

      {loading && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 3000,
            background: "white",
            padding: "10px 14px",
            borderRadius: 10,
            boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
            fontSize: 14,
          }}
        >
          {status || "Processant..."}
        </div>
      )}
    </div>
  );
}

export default App;