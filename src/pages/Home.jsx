import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";


export default function Home({ setTab }) {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false)

  const isAuthed = !!session?.user;
  

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (error) {
      alert("Error login Google: " + error.message);
    }
  }

  async function loginWithEmail() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) alert("Error login: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function signupWithEmail() {
    setLoading(true);
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
    }
  }

  async function logout() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        alert("Error logout: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  

  return (
    
    <div
      style={{
        minHeight: "calc(100vh - 72px)",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
     //   backgroundImage: `url(${backgroundImage})`,
        backgroundImage: "url(/portada.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(10,40,25,0.45), rgba(10,40,25,0.75))",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 420,
          background: "rgba(255,255,255,0.14)",
          backdropFilter: "blur(8px)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          color: "white",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Onés?</div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            marginBottom: 12,
            textShadow: "0 4px 12px rgba(0,0,0,0.5)"
          }}
        >
          On és el meu arbre?
        </div>

        <div style={{ fontSize: 16, color: "rgba(255,255,255,0.92)", lineHeight: 1.5, marginBottom: 20 }}>
          Detecta escossells buits, punts on falta escossell i arbres replantats a la ciutat.
        </div>

        <button
          type="button"
          onClick={() => setTab("map")}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 12,
            border: "none",
            background: "#2e7d32",
            color: "white",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 18,
          }}
        >
          Entrar al mapa
        </button>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.25)",
            paddingTop: 18,
            marginTop: 4,
          }}
        >
          {!isAuthed ? (
            <>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Inicia sessió</div>

              <button
                onClick={loginWithGoogle}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  marginBottom: 10,
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "white",
                  cursor: "pointer",
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
                    padding: 10,
                    borderRadius: 10,
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
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    marginBottom: 10,
                  }}
                />

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    Entrar
                  </button>

                  <button
                    type="button"
                    onClick={signupWithEmail}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    Registrar
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}>
                Sessió iniciada com:
                <br />
                <b>{session.user.email}</b>
              </div>

              <button
                onClick={logout}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.25)",
            marginTop: 18,
            paddingTop: 18,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <button
            type="button"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "white",
              cursor: "pointer",
            }}
            onClick={() => setShowInfo(true)}
          >
            ℹ️ Com funciona
          </button>

          <button
            type="button"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "white",
              cursor: "pointer",
            }}
            onClick={() => {
              window.location.href =
                "mailto:contacte@example.com?subject=Suggeriment%20Escossells";
            }}
          >
            💬 Enviar suggeriment
          </button>
        </div>
      </div>
    </div>
  );

  {showInfo && <InfoScreen onClose={() => setShowInfo(false)} />}

  const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
    padding: 20,
  },

  container: {
    background: "white",
    borderRadius: 14,
    maxWidth: 520,
    width: "100%",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  header: {
    padding: "16px 18px",
    borderBottom: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  content: {
    padding: 18,
    overflowY: "auto",
    lineHeight: 1.6,
    fontSize: 15,
  },

  close: {
    border: "none",
    background: "transparent",
    fontSize: 20,
    cursor: "pointer",
  },
}
}