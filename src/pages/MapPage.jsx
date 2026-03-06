import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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

const iconArbre = L.divIcon({
  className: "",
  html: `<div style="
    width:28px;height:28px;border-radius:14px;
    display:flex;align-items:center;justify-content:center;
    background:#e6f6e6;border:2px solid #2e7d32;
    font-size:16px;
  ">🌳</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const iconFalta = L.divIcon({
  className: "",
  html: `<div style="
    width:28px;height:28px;border-radius:14px;
    display:flex;align-items:center;justify-content:center;
    background:#fff3e0;border:2px solid #ef6c00;
    font-size:16px;
  ">🚧</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const iconBuit = L.divIcon({
  className: "",
  html: `<div style="
    width:28px;height:28px;border-radius:14px;
    display:flex;align-items:center;justify-content:center;
    background:#f2f2f2;border:2px solid #616161;
    font-size:16px;
  ">⬜</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

function getPointIcon(point) {
  if (point.status === "arbre") return iconArbre;
  if (point.kind === "falta") return iconFalta;
  return iconBuit;
}

function RecenterMap({ position, zoom = 17 }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    map.setView(position, zoom);
  }, [position, zoom, map]);

  return null;
}

export default function MapPage() {
  const [points, setPoints] = useState([]);
  const [userPos, setUserPos] = useState(null);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const [session, setSession] = useState(null);
  const [kindToUpload, setKindToUpload] = useState("buit");

  const [cityFilter, setCityFilter] = useState("");
  const [showBuit, setShowBuit] = useState(true);
  const [showFalta, setShowFalta] = useState(true);
  const [showArbre, setShowArbre] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isAuthed = !!session?.user;

  const cityOptions = useMemo(() => {
    const unique = [...new Set(points.map((p) => p.city).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [points]);

  const filteredPoints = useMemo(() => {
    return points.filter((point) => {
      if (point.status === "arbre" && !showArbre) return false;
      if (point.status !== "arbre" && point.kind === "buit" && !showBuit) return false;
      if (point.status !== "arbre" && point.kind === "falta" && !showFalta) return false;
      return true;
    });
  }, [points, showArbre, showBuit, showFalta]);

  async function loadData(selectedCity = cityFilter) {
    let query = supabase.from("escossells_map").select("*");

    if (selectedCity) {
      query = query.eq("city", selectedCity);
    }

    const { data, error } = await query;

    if (error) {
      console.error("ERROR LOAD:", error);
      return;
    }

    setPoints(data || []);
  }

  useEffect(() => {
    loadData();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPos([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.log("No puc centrar per GPS:", err?.code, err?.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadData(cityFilter);
  }, [cityFilter]);

  function getPosition(options) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation no disponible"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const geo = await res.json();

      const addressParts = geo.address || {};

      return {
        address: geo.display_name || "Adreça desconeguda",
        city:
          addressParts.city ||
          addressParts.town ||
          addressParts.village ||
          addressParts.municipality ||
          null,
        country: addressParts.country || null,
      };
    } catch {
      return {
        address: "Adreça desconeguda",
        city: null,
        country: null,
      };
    }
  }

  async function centerOnUser() {
    try {
      setLoading(true);
      setStatus("Centrant ubicació...");

      const position = await getPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setUserPos([lat, lng]);
    } catch (err) {
      alert("No he pogut obtenir la ubicació: " + err.message);
    } finally {
      setLoading(false);
      setStatus("");
    }
  }

  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus("Pujant foto...");

    try {
      const fileName = `${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("escossells")
        .upload(fileName, file);

      if (uploadError) {
        alert(uploadError.message);
        return;
      }

      const { data } = supabase.storage.from("escossells").getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      setStatus("Obtenint ubicació...");

      const position = await getPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setUserPos([lat, lng]);

      setStatus("Calculant adreça...");
      const geoData = await reverseGeocode(lat, lng);

      setStatus("Inserint punt...");

      const { data: result, error: rpcError } = await supabase.rpc("insert_escossell", {
        new_lat: lat,
        new_lng: lng,
        new_address: geoData.address,
        new_city: geoData.city,
        new_country: geoData.country,
        new_comment: "Foto des del mòbil",
        new_foto_url: publicUrl,
        new_kind: kindToUpload,
      });

      if (rpcError) {
        alert("Error RPC: " + (rpcError.message || JSON.stringify(rpcError)));
        return;
      }

      if (result === "not_logged") {
        alert("Has d'iniciar sessió per inserir fotos.");
        return;
      }

      if (result === "duplicate") {
        alert("Duplicat!");
        return;
      }

      if (result === "inserted") {
        alert("Inserit!");
        await loadData(cityFilter);
        return;
      }

      alert("Resposta inesperada: " + JSON.stringify(result));
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
      setStatus("");
      event.target.value = "";
    }
  }

  async function markTree(point) {
    if (!isAuthed) {
      alert("Has d'iniciar sessió per marcar un arbre.");
      return;
    }

    setLoading(true);
    setStatus("Marcant arbre...");

    try {
      const { data: result, error } = await supabase.rpc("mark_tree_planted_nearby", {
        new_lat: point.latitude,
        new_lng: point.longitude,
        new_foto_url: null,
      });

      if (error) {
        alert("Error RPC: " + error.message);
        return;
      }

      if (result === "tree_marked") {
        alert("Arbre marcat!");
        await loadData(cityFilter);
        return;
      }

      if (result === "no_nearby_point") {
        alert("No he trobat cap punt a prop.");
        return;
      }

      if (result === "not_logged") {
        alert("Has d'iniciar sessió.");
        return;
      }

      alert("Resposta inesperada: " + JSON.stringify(result));
    } finally {
      setLoading(false);
      setStatus("");
    }
  }

  return (
    <div style={{ height: "calc(100vh - 72px)", width: "100vw", position: "relative" }}>
      <MapContainer
        center={userPos || [41.3851, 2.1734]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <RecenterMap position={userPos} zoom={17} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {filteredPoints.map((point) => (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
            icon={getPointIcon(point)}
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
                  style={{ width: 200, marginTop: 8, borderRadius: 8 }}
                />
              )}

              <br />

              {point.status === "arbre" ? (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 10px",
                    background: "#e6f6e6",
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                >
                  🌳 Ja hi ha arbre
                </div>
              ) : (
                isAuthed && (
                  <button
                    type="button"
                    onClick={() => markTree(point)}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    🌳 Marcar arbre plantat
                  </button>
                )
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          zIndex: 5000,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            border: "1px solid #ddd",
            background: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            cursor: "pointer",
            fontSize: 20,
          }}
        >
          ⚙️
        </button>

        <button
          type="button"
          onClick={centerOnUser}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            border: "1px solid #ddd",
            background: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            cursor: "pointer",
            fontSize: 20,
          }}
        >
          📍
        </button>
      </div>

      {filtersOpen && (
        <div
          style={{
            position: "absolute",
            top: 70,
            right: 14,
            zIndex: 5000,
            width: 260,
            background: "white",
            borderRadius: 16,
            padding: 14,
            boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Filtres</div>

          <div style={{ marginBottom: 8, fontSize: 14 }}>Ciutat</div>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 8,
              border: "1px solid #ddd",
              marginBottom: 12,
            }}
          >
            <option value="">Totes les ciutats</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          <label style={{ display: "block", marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={showBuit}
              onChange={(e) => setShowBuit(e.target.checked)}
            />{" "}
            ⬜ Escossells buits
          </label>

          <label style={{ display: "block", marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={showFalta}
              onChange={(e) => setShowFalta(e.target.checked)}
            />{" "}
            🚧 Falta escossell
          </label>

          <label style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={showArbre}
              onChange={(e) => setShowArbre(e.target.checked)}
            />{" "}
            🌳 Arbre plantat
          </label>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 18,
          zIndex: 5000,
        }}
      >
        {isAuthed ? (
          <div
            style={{
              background: "white",
              padding: "12px 12px 10px 12px",
              borderRadius: 14,
              border: "1px solid #ddd",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              minWidth: 220,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Nou punt</div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => setKindToUpload("buit")}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: kindToUpload === "buit" ? "#eee" : "white",
                  cursor: "pointer",
                }}
              >
                ⬜ Buit
              </button>

              <button
                type="button"
                onClick={() => setKindToUpload("falta")}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: kindToUpload === "falta" ? "#eee" : "white",
                  cursor: "pointer",
                }}
              >
                🚧 Falta
              </button>
            </div>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              disabled={loading}
              style={{
                width: "100%",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => alert("Has d'iniciar sessió per afegir un escossell.")}
            style={{
              background: "white",
              border: "1px solid #ddd",
              padding: "12px 16px",
              borderRadius: "14px",
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            📷 Afegir escossell
          </button>
        )}
      </div>

      {loading && (
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 6000,
            background: "white",
            padding: "10px 14px",
            borderRadius: 12,
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