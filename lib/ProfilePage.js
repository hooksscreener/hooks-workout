// Profile page: calling card banner, a face in a circle, and five stat cards. Used for you and for the NPCs in the feed.
import { useRef } from "react";
import FeedBackground from "./FeedBackground";

const CARDS = [
  ["daysLogged", "Days logged"],
  ["favoriteDay", "Favorite workout day"],
  ["favoriteExercise", "Favorite exercise"],
  ["strongestExercise", "Strongest exercise"],
  ["leastFavoriteCategory", "Least favorite category"],
];

// Shrinks a picked photo to a small square so it can be stored on the device.
function squarePhoto(file, done) {
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const n = 256, c = document.createElement("canvas");
      c.width = n; c.height = n;
      const s = Math.min(img.width, img.height);
      c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, n, n);
      done(c.toDataURL("image/jpeg", 0.82));
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}

export default function ProfilePage({ name, subtitle, scene, stats, onClose, own = false, photo, onPhoto, onName, onChangeCard }) {
  const fileRef = useRef(null);
  const letter = (String(name || "").replace(/^NPC\s+/, "").trim().charAt(0) || "").toUpperCase();
  return (
    <div className="xpage pf-page" role="dialog" aria-label="Profile">
      <div className="xp-top">
        <button type="button" className="xp-back" onClick={onClose} aria-label="Back"><svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg></button>
        <div className="xp-title">Profile</div>
      </div>
      <div className="xp-scroll pf-scroll">
        <div className="pf-banner" style={scene ? undefined : { background: "linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 45%, #000))" }}>
          {scene && <FeedBackground scene={scene} dim={false} />}
          {own && onChangeCard && <button type="button" className="pf-card-btn" onClick={onChangeCard}>Change card</button>}
        </div>
        <div className="pf-avatar" aria-hidden={!own}>
          {photo ? <img src={photo} alt="" /> : letter ? <span>{letter}</span> : <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8" r="4.2" /><path d="M3.5 21c0-4.6 3.8-7.5 8.5-7.5s8.5 2.9 8.5 7.5z" /></svg>}
        </div>
        {own ? (
          <>
            <input className="pf-name-input" value={name || ""} placeholder="Add your name" maxLength={24} onChange={(e) => onName && onName(e.target.value)} aria-label="Your name" />
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f && onPhoto) squarePhoto(f, onPhoto); e.target.value = ""; }} />
            <div className="pf-photo-row">
              <button type="button" className="pf-link" onClick={() => fileRef.current && fileRef.current.click()}>{photo ? "Change photo" : "Add photo"}</button>
              {photo && <button type="button" className="pf-link" onClick={() => onPhoto && onPhoto("")}>Remove</button>}
            </div>
          </>
        ) : <div className="pf-name">{name}</div>}
        <div className="pf-sub">{subtitle}</div>
        <div className="pf-grid">
          {CARDS.map(([k, label], i) => {
            const c = (stats && stats[k]) || { value: "n/a", sub: "" };
            return (
              <div key={k} className={"pf-stat" + (i === 4 ? " wide" : "")}>
                <div className="pf-stat-l">{label}</div>
                <div className="pf-stat-v">{c.value}</div>
                {c.sub && <div className="pf-stat-s">{c.sub}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
