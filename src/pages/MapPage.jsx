import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const iconArbre = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:#e6f6e6;border:2px solid #2e7d32;font-size:16px;">🌳</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const iconFalta = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:#fff3e0;border:2px solid #ef6c00;font-size:16px;">🚧</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const iconBuit = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:#f2f2f2;border:2px solid #616161;font-size:16px;">⬜</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
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

  const fileInputRef = useRef(null);

  const isAuthed = !!session?.user;

  const cityOptions = useMemo(() => {
    const unique = [...new Set(points.map(p => p.city).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [points]);

  const filteredPoints = useMemo(() => {
    return points.filter(point => {
      if (point.status === "arbre" && !showArbre) return false;
      if (point.status !== "arbre" && point.kind === "buit" && !showBuit) return false;
      if (point.status !== "arbre" && point.kind === "falta" && !showFalta) return false;
      return true;
    });
  }, [points, showBuit, showFalta, showArbre]);

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

    const { data: sub } = supabase.auth.onAuthStateChange((_e, newSession) => {
      setSession(newSession);
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        err => console.log("GPS error", err)
      );
    }

    return () => sub.subscription.unsubscribe();

  }, []);

  useEffect(() => {
    loadData(cityFilter);
  }, [cityFilter]);

  function openCamera(kind) {

    if (!isAuthed) {
      alert("Has d'iniciar sessió per afegir un escossell.");
      return;
    }

    setKindToUpload(kind);
    fileInputRef.current?.click();
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

      const position = await getPosition({
        enableHighAccuracy: true,
        timeout: 15000
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setUserPos([lat, lng]);

    } catch (err) {

      alert("No he pogut obtenir la ubicació");
    }
  }

  async function handlePhotoUpload(event) {

    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus("Pujant foto...");

    try {

      const fileName = `${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase
        .storage
        .from("escossells")
        .upload(fileName, file);

      if (uploadError) {
        alert(uploadError.message);
        return;
      }

      const { data } = supabase.storage
        .from("escossells")
        .getPublicUrl(fileName);

      const publicUrl = data.publicUrl;

      const position = await getPosition({
        enableHighAccuracy: true
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const geoData = await reverseGeocode(lat, lng);

      const { data: result } = await supabase.rpc("insert_escossell", {
        new_lat: lat,
        new_lng: lng,
        new_address: geoData.address,
        new_city: geoData.city,
        new_country: geoData.country,
        new_comment: "Foto des del mòbil",
        new_foto_url: publicUrl,
        new_kind: kindToUpload,
      });

      if (result === "duplicate") {
        alert("Duplicat!");
      }

      if (result === "inserted") {
        alert("Inserit!");
        await loadData(cityFilter);
      }

    } catch (err) {

      alert(err.message);

    } finally {

      setLoading(false);
      setStatus("");
      event.target.value = "";
    }
  }

  async function markTree(point) {

    const { data: result } = await supabase.rpc("mark_tree_planted_nearby", {
      new_lat: point.latitude,
      new_lng: point.longitude,
      new_foto_url: null,
    });

    if (result === "tree_marked") {
      alert("Arbre marcat!");
      await loadData(cityFilter);
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

        {filteredPoints.map(point => (

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
                  style={{ width: 200, marginTop: 8 }}
                />
              )}

              <br />

              {point.status === "arbre" ? (
                <div style={{ marginTop: 10 }}>🌳 Ja hi ha arbre</div>
              ) : (
                isAuthed && (
                  <button
                    onClick={() => markTree(point)}
                    style={{ marginTop: 10 }}
                  >
                    🌳 Marcar arbre plantat
                  </button>
                )
              )}

            </Popup>

          </Marker>

        ))}

      </MapContainer>

      <div style={{
        position: "absolute",
        right: 14,
        top: 80,
        zIndex: 5000,
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}>

        <button
          title="Falta escossell"
          onClick={() => openCamera("falta")}
          style={fabStyle}
        >
          🚧
        </button>

        <button
          title="Escossell buit"
          onClick={() => openCamera("buit")}
          style={fabStyle}
        >
          ⬜
        </button>

        <button
          title="Centrar mapa"
          onClick={centerOnUser}
          style={fabStyle}
        >
          📍
        </button>

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
        <div style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          background: "white",
          padding: 10,
          borderRadius: 8
        }}>
          {status}
        </div>
      )}

    </div>
  );
}

const fabStyle = {
  width: 52,
  height: 52,
  borderRadius: 26,
  border: "1px solid #ddd",
  background: "white",
  fontSize: 22,
  cursor: "pointer",
  boxShadow: "0 3px 10px rgba(0,0,0,0.2)"
};