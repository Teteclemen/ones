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

  // Auth UI state
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isAuthed = !!session?.user;

  async function loadData() {
    const { data, error } = await supabase.from("escossells_map").select("*");
    if (error) {
      console.error("ERROR LOAD:", error);
      return;
    }
    setPoints(data || []);
  }

  useEffect(() => {
    loadData();

    // Auth: carregar sessió i subscriure canvis
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    // GPS per centrar
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
        reject(new Error("Geolocation no disponible en aquest navegador"));
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
      return geo.display_name || "Adreça desconeguda";
    } catch {
      return "Adreça desconeguda";
    }
  }

  // -------- AUTH ACTIONS --------
  async function loginWithGoogle() {
    setStatus("Obrint Google login...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setStatus("");
      alert("Error login Google: " + (error.message || "desconegut"));
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
      if (error) {
        alert("Error login: " + (error.message || "desconegut"));
        return;
      }
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
        alert("Error signup: " + (error.message || "desconegut"));
        return;
      }
      alert("Compte creat. Si tens confirmació d'email activa, revisa el correu.");
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

  // -------- UPLOAD / INSERT --------
  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAuthed) {
      alert("Has d'iniciar sessió per inserir punts.");
      event.target.value = "";
      return;
    }

    setLoading(true);
    setStatus("Pujant foto...");

    try {
      const fileName = `${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("escossells")
        .upload(fileName, file);

      if (uploadError) {
        console.error("ERROR UPLOAD:", uploadError);
        alert("Error pujant imatge: " + (uploadError.message || "desconegut"));
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("escossells")
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) {
        alert("No s'ha pogut obtenir URL pública");
        return;
      }

      setStatus("Obtenint ubicació...");
      const position = await getPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setUserPos([lat, lng]);

      setStatus("Calculant adreça...");
      const address = await reverseGeocode(lat, lng);

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
        alert("Error inserint: " + (error?.message || "desconegut"));
        return;
      }

      if (data === "duplicate") {
        alert("Duplicat!");
        return;
      }

      if (data === "inserted") {
        alert("Inserit!");
        await loadData();
        return;
      }

      alert("Resposta inesperada del servidor: " + JSON.stringify(data));
    } catch (err) {
      console.error("ERROR GENERAL:", err);
      alert("Error: " + (err?.message || JSON.stringify(err) || "desconegut"));
    } finally {
      setLoading(false);
      setStatus("");
      event.target.value = "";
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
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "white",
                marginBottom: 10,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Continua amb Google
            </button>

            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
              Email + password
            </div>

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              type="email"
              style={{
                width: "100%",
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
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #ddd",
                marginBottom: 10,
              }}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={loginWithEmail}
                disabled={loading || !email || !password}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "white",
                  cursor:
                    loading || !email || !password ? "not-allowed" : "pointer",
                }}
              >
                Entrar
              </button>
              <button
                onClick={signupWithEmail}
                disabled={loading || !email || !password}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "white",
                  cursor:
                    loading || !email || !password ? "not-allowed" : "pointer",
                }}
              >
                Registrar
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Sessió</div>
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              {session.user.email || session.user.id}
            </div>
            <button
              onClick={logout}
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "white",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    );
  }, [isAuthed, loading, email, password, session]);

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

      {authBox}

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoUpload}
        disabled={loading || !isAuthed}
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          zIndex: 1000,
          background: "white",
          padding: "12px",
          borderRadius: "8px",
          opacity: loading || !isAuthed ? 0.5 : 1,
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