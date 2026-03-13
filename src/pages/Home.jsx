import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import InfoScreen from "./InfoScreen";
import "./Home.css";

export default function Home({ setTab }) {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const isAuthed = !!session?.user;
  const isCheckingSession = !authReady;

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setAuthReady(true);
        if (newSession) setShowAuth(false);
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !isAuthed) return;

    const timer = window.setTimeout(() => {
      setTab("map");
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [authReady, isAuthed, setTab]);

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

      if (error) {
        alert("Error login: " + error.message);
      }
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

  function handleSuggestion() {
    window.location.href =
      "mailto:Climent.payme@gmail.com?subject=Suggeriment%20Escossells";
  }

  function handleAuthButton() {
    if (isCheckingSession) {
      setShowAuth((prev) => !prev);
      return;
    }

    if (isAuthed) {
      logout();
      return;
    }

    setShowAuth((prev) => !prev);
  }

  const showAuthForm = !isAuthed && showAuth;
  const showGuestButtons = !showAuthForm && !isAuthed;
  const showAuthedBox = isAuthed;

  return (
    <>
      <div className="home-page">
        <div className="home-page-overlay" />

        <div className="home-card">
          <div className="home-brand">Oness</div>

          <div className="home-title">On és el meu arbre?</div>

          <div className="home-subtitle">
            Detecta escossells buits, punts on falta escossell i arbres
            replantats a la ciutat.
          </div>

          <button
            type="button"
            onClick={() => setTab("map")}
            className="cta-button"
          >
            Entrar al mapa
          </button>

          {showGuestButtons && (
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="white-button"
            >
              Iniciar sessió
            </button>
          )}

          {showAuthForm && (
            <div className="home-section">
              <div className="section-title">Inicia sessió</div>

              <button
                type="button"
                onClick={loginWithGoogle}
                className="white-button"
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
                  className="auth-input"
                />

                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  type="password"
                  autoComplete="current-password"
                  className="auth-input"
                />

                <div className="row-buttons">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-white-button"
                  >
                    {loading ? "Carregant..." : "Entrar"}
                  </button>

                  <button
                    type="button"
                    onClick={signupWithEmail}
                    disabled={loading}
                    className="flex-white-button"
                  >
                    Registrar
                  </button>
                </div>
              </form>

              <button
                type="button"
                onClick={() => setShowAuth(false)}
                className="white-button"
              >
                Tancar
              </button>
            </div>
          )}

          {showAuthedBox && (
            <div className="home-section">
              <div className="logged-box">
                Sessió iniciada com:
                <br />
                <b>{session.user.email}</b>
              </div>

              <div className="autoredirect-note">
                Entrant automàticament al mapa...
              </div>
            </div>
          )}
        </div>

        <div className="home-bottom-bar">
          <button
            type="button"
            className="bottom-bar-button"
            onClick={handleAuthButton}
            disabled={loading}
          >
            {isAuthed ? (loading ? "Sortint..." : "Logout") : "Login"}
          </button>

          <button
            type="button"
            className="bottom-bar-button"
            onClick={() => setShowInfo(true)}
          >
            Com funciona
          </button>

          <button
            type="button"
            className="bottom-bar-button"
            onClick={handleSuggestion}
          >
            Suggeriment
          </button>
        </div>
      </div>

      {showInfo && <InfoScreen onClose={() => setShowInfo(false)} />}
    </>
  );
}