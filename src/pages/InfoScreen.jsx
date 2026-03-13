import { useEffect } from "react";
import "./Home.css";

export default function InfoScreen({ onClose }) {
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
    <div className="info-overlay" onClick={onClose}>
      <div className="info-panel" onClick={(e) => e.stopPropagation()}>
        <div className="info-header">
          <div>
            <div className="info-eyebrow">Projecte oness</div>
            <h2 className="info-title">Com funciona l’aplicació</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="icon-close-button"
            aria-label="Tancar"
          >
            ✕
          </button>
        </div>

        <div className="info-hero">
          <div className="info-hero-icon">🌳</div>
          <div>
            <div className="info-hero-title">Introducció</div>
            <div className="info-hero-text">
              Es tracta d'un petit projecte per situar en el mapa tots
              els espais buits deixats pels arbres desapareguts als carrers
            </div>
          </div>
        </div>

        <div className="info-body">
          <div className="step-card">
            <div className="step-badge">1</div>
            <div>
              <div className="step-title">El mapa</div>
              <div className="step-text">
                Al mapa hi trobem 3 marcadors diferents {" "}⬜ Escossells buits
                {" "}🚧 Falta escossell {" "}🌳 Arbre plantat
              </div>
            </div>
          </div>

          <div className="step-card">
            <div className="step-badge">2</div>
            <div>
              <div className="step-title">Com funciona?</div>
              <div className="step-text">
                Només cal fer una foto de l'escossells buit o de l'espai on
                hauria de ser-hi i ja està. I si el que veus és que s'ha
                replantat un arbre, polses damunt del marcador i queda recollit
                el canvi
              </div>
            </div>
          </div>

          <div className="step-card">
            <div className="step-badge">3</div>
            <div>
              <div className="step-title">Participació</div>
              <div className="step-text">
                Per informar l'app cal registrar-se. Per consultar no
              </div>
            </div>
          </div>

          <div className="note-box">
            <div className="note-title">Nota bene</div>
            <div className="note-text">
              Aquesta app és només un projecte. Pots utilitzar el correu de
              contacte per expressar la teva opinió o idees al respecte, si vols
            </div>
          </div>
        </div>

        <div className="info-footer">
          <button type="button" onClick={onClose} className="primary-button">
            Entesos
          </button>
        </div>
      </div>
    </div>
  );
}