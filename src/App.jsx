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
      return geo.display_name || "Adreça desconeguda";
    } catch {
      return "Adreça desconeguda";
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

      if (error) {
        alert("Error login: " + error.message);
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

    if (!isAuthed) {
      alert("Has d'iniciar sessió per inserir fotos.");
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

      const address = await reverseGeocode(lat, lng);

      setStatus("Inserint punt...");

      const { data: result } = await supabase.rpc("insert_escossell", {
        new_lat: lat,
        new_lng: lng,
        new_address: address,
        new_comment: "Foto des del mòbil",
        new_foto_url: publicUrl,
      });

      if (result === "duplicate") {
        alert("Duplicat!");
        return;
      }

      if (result === "inserted") {
        alert("Inserit!");
        await loadData();
      }
    } catch (err) {
      alert(err.message);
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
            <div>Sessió: {session.user.email}</div>
            <button onClick={logout}>Logout</button>
          </>
        )}
      </div>
    );
  }, [isAuthed, email, password, session]);

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
          <Marker key={point.id} position={[point.latitude, point.longitude]}>
            <Popup>
              <b>{point.address}</b>
              <br />
              {point.comentari}
              <br />
              {point.foto_url && (
                <img src={point.foto_url} alt="foto" style={{ width: 200 }} />
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
        disabled={loading}
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

      {loading && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            padding: "10px",
          }}
        >
          {status}
        </div>
      )}
    </div>
  );
}

export default App;