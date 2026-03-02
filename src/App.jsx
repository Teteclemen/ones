import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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

function App() {
  const [points, setPoints] = useState([]);

  // 🔄 Carregar punts
  async function loadData() {
    const { data, error } = await supabase
      .from("escossells_map")
      .select("*");

    if (error) {
      console.error("ERROR LOAD:", error);
      return;
    }

    console.log("PUNTS CARREGATS:", data);
    setPoints(data || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  // 📸 Foto + GPS + Insert
  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("Fitxer seleccionat:", file.name);

    const fileName = `${Date.now()}_${file.name}`;

    // 1️⃣ Upload imatge
    const { error: uploadError } = await supabase
      .storage
      .from("escossells")
      .upload(fileName, file);

    if (uploadError) {
      console.error("ERROR UPLOAD:", uploadError);
      alert("Error pujant imatge");
      return;
    }

    // 2️⃣ Obtenir URL pública
    const { data: publicUrlData } = supabase
      .storage
      .from("escossells")
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      alert("No s'ha pogut obtenir URL pública");
      return;
    }

    console.log("URL pública:", publicUrl);

    // 3️⃣ Obtenir GPS
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        console.log("GPS:", lat, lng);

        // 4️⃣ Cridar RPC
        const { data, error } = await supabase.rpc(
          "insert_escossell",
          {
            new_lat: lat,
            new_lng: lng,
            new_address: "Auto GPS",
            new_comment: "Foto des del mòbil",
            new_foto_url: publicUrl,
          }
        );

        console.log("RPC RESULT:", data, error);

        if (error) {
          console.error("ERROR RPC:", error);
          alert("Error inserint");
          return;
        }

        if (data === "duplicate") {
          alert("Duplicat!");
        } else if (data === "inserted") {
          alert("Inserit!");
          await loadData();
        } else {
          alert("Resposta inesperada del servidor");
        }
      },
      (err) => {
        console.error("ERROR GPS:", err);
        alert("Error obtenint GPS");
      }
    );

    // reset input per poder tornar a pujar mateixa foto
    event.target.value = "";
  }

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <MapContainer
        center={[41.3851, 2.1734]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {points.map((point) => (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
          >
            <Popup>
              <b>{point.address}</b>
              <br />
              {point.comentari}
              <br />
              {point.foto_url && (
                <img
                  src={point.foto_url}
                  alt="foto"
                  style={{ width: "150px", marginTop: "8px" }}
                />
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
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          zIndex: 1000,
          background: "white",
          padding: "12px",
          borderRadius: "8px",
        }}
      />
    </div>
  );
}

export default App;