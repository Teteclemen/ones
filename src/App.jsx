import { useEffect, useMemo, useState } from "react";
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
  return iconBuit; // buit + pendent
}

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

  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [kind, setKind] = useState("buit");

  const [cityFilter, setCityFilter] = useState(null);

  const isAuthed = !!session?.user;

  async function loadData() {
    let query = supabase.from("escossells_map").select("*");

    if (cityFilter) {
      query = query.eq("city", cityFilter);
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
        (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.log("No puc centrar per GPS:", err?.code, err?.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => sub.subscription.unsubscribe();
  }, []);

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

  async function loginWithGoogle() {
    setStatus("Obrint Google login...");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (error) {
      setStatus("");
      alert("Error login Google: " + error.message);
    }
  }

  async function loginWithEmail() {
    setLoading(true);
    setStatus("Iniciant sessió...");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) alert("Error login: " + error.message);
    } finally {
      setLoading(false);
      setStatus("");
    }
  }

  async function signupWithEmail() {
    setLoading(true);
    setStatus("Creant compte...");

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        alert("Error signup: " + error.message);
        return;
      }

      alert("Compte creat.");
    } finally {
      setLoading(false);
      setStatus("");
    }
  }

  async function logout() {
    setLoading(true);
    setStatus("Tancant sessió...");

    try {
      await supabase.auth.signOut();
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
            new_kind: kind,
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
        await loadData();
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
      await loadData();
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

  const authBox = useMemo(() => {
    return (
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 4000,
          background: "white",
          padding: 12,
          borderRadius: 10,
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          width: 280,
        }}
      >
        {!isAuthed ? (
          <>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Login</div>

            <button
              onClick={loginWithGoogle}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: 10,
              }}
            >
              Continua amb Google
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                loginWithEmail();
              }}
            >
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email"
                type="email"
                autoComplete="email"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  marginBottom: 8,
                }}
              />

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                type="password"
                autoComplete="current-password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  marginBottom: 10,
                }}
              />

              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit">Entrar</button>
                <button type="button" onClick={signupWithEmail}>
                  Registrar
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 8 }}>Sessió: {session.user.email}</div>
            <button onClick={logout}>Logout</button>
          </>
        )}
      </div>
    );
  }, [isAuthed, email, password, session]);

  <div
  style={{
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 4000,
    background: "white",
    padding: 10,
    borderRadius: 10,
    boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
    display: "flex",
    gap: 8,
  }}
>
  <button
    type="button"
    onClick={() => setKind("buit")}
    style={{
      padding: "8px 10px",
      borderRadius: 8,
      border: "1px solid #ddd",
      background: kind === "buit" ? "#eee" : "white",
      cursor: "pointer",
    }}
  >
    ⬜ Buit
  </button>

  <button
    type="button"
    onClick={() => setKind("falta")}
    style={{
      padding: "8px 10px",
      borderRadius: 8,
      border: "1px solid #ddd",
      background: kind === "falta" ? "#eee" : "white",
      cursor: "pointer",
    }}
  >
    🚧 Falta
  </button>

  <select
  value={cityFilter || ""}
  onChange={(e) => setCityFilter(e.target.value || null)}
  style={{
    position: "absolute",
    top: 70,
    left: 10,
    zIndex: 4000,
    padding: 6
  }}
>
  <option value="">Totes les ciutats</option>
  <option value="Barcelona">Barcelona</option>
</select>
</div>

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <MapContainer
        center={userPos || [41.3851, 2.1734]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <RecenterMap position={userPos} zoom={17} />

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {points.map((point) => (
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

      {authBox}
      <div
          style={{
            position: "absolute",
            bottom: 20,
            right: 20,
            zIndex: 4000,
            background: "white",
            padding: 10,
            borderRadius: 10,
            boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <div>🌳 Arbre</div>
          <div>⬜ Escossell buit</div>
          <div>🚧 Falta escossell</div>
      </div>

      {/* Botó d'afegir: si NO hi ha login, no obre càmera, mostra missatge */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          zIndex: 1000,
        }}
      >
        {isAuthed ? (
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            disabled={loading}
            style={{
              background: "white",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "1px solid #ddd",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => alert("Has d'iniciar sessió per afegir un escossell.")}
            style={{
              background: "white",
              border: "1px solid #ddd",
              padding: "12px 16px",
              borderRadius: "10px",
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
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