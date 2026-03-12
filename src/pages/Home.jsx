import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function InfoScreen({ onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div style={styles.infoOverlay} onClick={onClose}>
      <div
        style={styles.infoPanel}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.infoHeader}>
          <div>
            <div style={styles.infoEyebrow}>Projecte</div>
            <h2 style={styles.infoTitle}>Com funciona l’aplicació</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={styles.iconCloseButton}
            aria-label="Tancar"
          >
            ✕
          </button>
        </div>

        <div style={styles.infoHero}>
          <div style={styles.infoHeroIcon}>🌳</div>
          <div>
            <div style={styles.infoHeroTitle}>Espai per explicar el projecte</div>
            <div style={styles.infoHeroText}>
              Aquí podràs posar una introducció curta i clara sobre què fa l’app
              i per a què serveix.
            </div>
          </div>
        </div>

        <div style={styles.infoBody}>
          <div style={styles.stepCard}>
            <div style={styles.stepBadge}>1</div>
            <div>
              <div style={styles.stepTitle}>Consulta el mapa</div>
              <div style={styles.stepText}>
                Explica aquí com es visualitzen els punts, els escossells o les
                incidències dins del mapa.
              </div>
            </div>
          </div>

          <div style={styles.stepCard}>
            <div style={styles.stepBadge}>2</div>
            <div>
              <div style={styles.stepTitle}>Interpreta la informació</div>
              <div style={styles.stepText}>
                Aquí pots afegir el significat dels colors, icones, categories o
                estats que feu servir.
              </div>
            </div>
          </div>

          <div style={styles.stepCard}>
            <div style={styles.stepBadge}>3</div>
            <div>
              <div style={styles.stepTitle}>Participa o comunica incidències</div>
              <div style={styles.stepText}>
                En aquest bloc pots indicar com col·laborar, suggerir millores o
                informar de nous casos.
              </div>
            </div>
          </div>

          <div style={styles.noteBox}>
            <div style={styles.noteTitle}>Text editable</div>
            <div style={styles.noteText}>
              Aquesta pantalla està preparada perquè substitueixis tot aquest
              contingut pel text final del projecte.
            </div>
          </div>
        </div>

        <div style={styles.infoFooter}>
          <button
            type="button"
            onClick={onClose}
            style={styles.primaryButton}
          >
            Entesos
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home({ setTab }) {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const isAuthed = !!session?.user;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

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
    <>
      <div
        style={styles.page}
      >
        <div style={styles.pageOverlay} />

        <div style={styles.card}>
          <div style={styles.brand}>Onés?</div>

          <div style={styles.title}>
            On és el meu arbre?
          </div>

          <div style={styles.subtitle}>
            Detecta escossells buits, punts on falta escossell i arbres
            replantats a la ciutat.
          </div>

          <button
            type="button"
            onClick={() => setTab("map")}
            style={styles.ctaButton}
          >
            Entrar al mapa
          </button>

          <div style={styles.section}>
            {!isAuthed ? (
              <>
                <div style={styles.sectionTitle}>Inicia sessió</div>

                <button
                  type="button"
                  onClick={loginWithGoogle}
                  style={styles.whiteButton}
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
                    style={styles.input}
                  />

                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password"
                    type="password"
                    autoComplete="current-password"
                    style={styles.input}
                  />

                  <div style={styles.rowButtons}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={styles.flexWhiteButton}
                    >
                      {loading ? "Carregant..." : "Entrar"}
                    </button>

                    <button
                      type="button"
                      onClick={signupWithEmail}
                      disabled={loading}
                      style={styles.flexWhiteButton}
                    >
                      Registrar
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div style={styles.loggedBox}>
                  Sessió iniciada com:
                  <br />
                  <b>{session.user.email}</b>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  disabled={loading}
                  style={styles.whiteButton}
                >
                  {loading ? "Sortint..." : "Logout"}
                </button>
              </>
            )}
          </div>

          <div style={styles.section}>
            <button
              type="button"
              style={styles.whiteButton}
              onClick={() => setShowInfo(true)}
            >
              ℹ️ Com funciona
            </button>

            <button
              type="button"
              style={styles.whiteButton}
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

      {showInfo && <InfoScreen onClose={() => setShowInfo(false)} />}
    </>
  );
}

const styles = {
  page: {
    minHeight: "calc(100vh - 72px)",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundImage: "url(/portada.jpg)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  },

  pageOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to bottom, rgba(10,40,25,0.45), rgba(10,40,25,0.78))",
  },

  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 430,
    background: "rgba(255,255,255,0.14)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 12px 34px rgba(0,0,0,0.24)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.16)",
  },

  brand: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 8,
  },

  title: {
    fontSize: 32,
    fontWeight: 800,
    marginBottom: 12,
    lineHeight: 1.1,
    textShadow: "0 4px 12px rgba(0,0,0,0.5)",
  },

  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.92)",
    lineHeight: 1.5,
    marginBottom: 20,
  },

  ctaButton: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: "none",
    background: "#2e7d32",
    color: "white",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 18,
    boxShadow: "0 8px 20px rgba(46,125,50,0.35)",
  },

  section: {
    borderTop: "1px solid rgba(255,255,255,0.25)",
    paddingTop: 18,
    marginTop: 8,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  sectionTitle: {
    fontWeight: 700,
    marginBottom: 2,
  },

  whiteButton: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "white",
    cursor: "pointer",
    fontWeight: 600,
  },

  flexWhiteButton: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "white",
    cursor: "pointer",
    fontWeight: 600,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 11,
    borderRadius: 12,
    border: "1px solid #ddd",
    marginBottom: 8,
    outline: "none",
  },

  rowButtons: {
    display: "flex",
    gap: 8,
  },

  loggedBox: {
    marginBottom: 10,
    lineHeight: 1.5,
  },

  infoOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.52)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3000,
    padding: 16,
  },

  infoPanel: {
    width: "100%",
    maxWidth: 640,
    maxHeight: "88vh",
    overflow: "hidden",
    background: "linear-gradient(180deg, #ffffff 0%, #f7faf7 100%)",
    borderRadius: 24,
    boxShadow: "0 20px 60px rgba(0,0,0,0.28)",
    border: "1px solid rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
  },

  infoHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: "22px 22px 14px 22px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },

  infoEyebrow: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#2e7d32",
    marginBottom: 6,
  },

  infoTitle: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.15,
    color: "#17301d",
  },

  iconCloseButton: {
    border: "none",
    background: "rgba(0,0,0,0.05)",
    width: 40,
    height: 40,
    borderRadius: 999,
    fontSize: 18,
    cursor: "pointer",
    flexShrink: 0,
  },

  infoHero: {
    margin: "18px 22px 0 22px",
    padding: 18,
    borderRadius: 18,
    background: "linear-gradient(135deg, #edf7ee 0%, #f7fbf7 100%)",
    border: "1px solid rgba(46,125,50,0.12)",
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
  },

  infoHeroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    background: "#2e7d32",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    flexShrink: 0,
    boxShadow: "0 8px 18px rgba(46,125,50,0.22)",
  },

  infoHeroTitle: {
    fontWeight: 800,
    fontSize: 18,
    color: "#17301d",
    marginBottom: 6,
  },

  infoHeroText: {
    color: "#35513a",
    lineHeight: 1.55,
    fontSize: 15,
  },

  infoBody: {
    padding: 22,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  stepCard: {
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 18,
    background: "white",
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
  },

  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 999,
    background: "#2e7d32",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    flexShrink: 0,
  },

  stepTitle: {
    fontWeight: 800,
    color: "#17301d",
    marginBottom: 4,
  },

  stepText: {
    color: "#4a5f4f",
    lineHeight: 1.55,
    fontSize: 15,
  },

  noteBox: {
    padding: 16,
    borderRadius: 18,
    background: "#fffdf3",
    border: "1px solid rgba(200,170,60,0.25)",
  },

  noteTitle: {
    fontWeight: 800,
    marginBottom: 4,
    color: "#5c4b12",
  },

  noteText: {
    color: "#6b5a23",
    lineHeight: 1.55,
    fontSize: 15,
  },

  infoFooter: {
    padding: 18,
    borderTop: "1px solid rgba(0,0,0,0.06)",
    background: "rgba(255,255,255,0.9)",
  },

  primaryButton: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: 14,
    border: "none",
    background: "#2e7d32",
    color: "white",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(46,125,50,0.28)",
  },
};