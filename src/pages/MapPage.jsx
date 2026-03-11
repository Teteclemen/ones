import { useEffect, useMemo, useRef, useState } from "react";
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

function FabButton({
  icon,
  label,
  onClick,
  background = "white",
  active,
  setActive,
}) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {(active === label) && (
        <div
          style={{
            position: "absolute",
            right: 66,
            whiteSpace: "nowrap",
            background: "rgba(34,34,34,0.92)",
            color: "white",
            padding: "8px 10px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          }}
        >
          {label}
        </div>
      )}

      <button
        type="button"
        title={label}
        aria-label={label}
        onMouseEnter={() => setActive(label)}
        onMouseLeave={() => setActive(null)}
        onFocus={() => setActive(label)}
        onBlur={() => setActive(null)}
        onTouchStart={() => setActive(label)}
        onClick={onClick}
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "1px solid #ddd",
          background,
          fontSize: 22,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        {icon}
      </button>
    </div>
  );
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

  const [activeFab, setActiveFab] = useState(null);

  const fileInputRef = useRef(null);
  const fabLabelTimerRef = useRef(null);

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

    return () => {
      sub.subscription.unsubscribe();
      if (fabLabelTimerRef.current) {
        clearTimeout(fabLabelTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadData(cityFilter);
  }, [cityFilter]);

  function showFabLabel(label) {
    setActiveFab(label);

    if (fabLabelTimerRef.current) {
      clearTimeout(fabLabelTimerRef.current);
    }

    fabLabelTimerRef.current = setTimeout(() => {
      setActiveFab(null);
    }, 1400);
  }

  function getPosition(options) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation no disponible"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  function openCamera(kind) {
    if (!isAuthed) {
      alert("Has d'iniciar sessió per afegir un escossell.");
      return;
    }

    setFiltersOpen(false);
    setKindToUpload(kind);
    fileInputRef.current?.click();
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
      setFiltersOpen(false);
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
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      <MapContainer
        center={userPos || [41.3851, 2.1734]}
        zoom={13}
        style={{ height: "calc(100% - 72px)", width: "100%" }}
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
          onClick={() => {
            setFiltersOpen((v) => !v);
            showFabLabel("Filtres");
          }}
          onMouseEnter={() => setActiveFab("Filtres")}
          onMouseLeave={() => setActiveFab(null)}
          onFocus={() => setActiveFab("Filtres")}
          onBlur={() => setActiveFab(null)}
          title="Filtres"
          aria-label="Filtres"
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

        {activeFab === "Filtres" && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 58,
              background: "rgba(34,34,34,0.92)",
              color: "white",
              padding: "8px 10px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
            }}
          >
            Filtres
          </div>
        )}
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
          bottom: 90,
          right: 14,
          zIndex: 5000,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <FabButton
          icon="🚧"
          label="Falta escossell"
          background="#fff3e0"
          active={activeFab}
          setActive={setActiveFab}
          onClick={() => {
              showFabLabel("Falta escossell");
              setTimeout(() => {
                openCamera("falta");
              }, 400);
          }}
        />

        <FabButton
          icon="⬜"
          label="Escossell buit"
          background="#f2f2f2"
          active={activeFab}
          setActive={setActiveFab}
          onClick={() => {
            showFabLabel("Escossell buit");
            setTimeout(() => {
              openCamera("buit");
            }, 400);
          }}
        />

        <FabButton
          icon={<span style={{ display: "inline-block", transform: "translateY(1px)" }}>📍</span>}
          label="Centrar mapa"
          background="white"
          active={activeFab}
          setActive={setActiveFab}
          onClick={() => {
            showFabLabel("Centrar mapa");
            centerOnUser();
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 90,
          zIndex: 4500,
          background: "rgba(255,255,255,0.96)",
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: "8px 10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        <div>🌳 Arbre plantat</div>
        <div>⬜ Escossell buit</div>
        <div>🚧 Falta escossell</div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoUpload}
        style={{ display: "none" }}
      />

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