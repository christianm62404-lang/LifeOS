import type { ObjectiveStatus } from "../mission/objectives.ts";

/**
 * Mission overlay: a top-centre panel with the mission name, objective progress
 * bars and a countdown, plus a win/lose end banner with retry / menu actions.
 * DOM only; the Game feeds it state each frame.
 */
export class MissionHud {
  private readonly panel: HTMLElement;
  private readonly banner: HTMLElement;

  constructor() {
    injectStyles();
    this.panel = document.createElement("div");
    this.panel.id = "mission";
    this.panel.style.display = "none";
    this.banner = document.createElement("div");
    this.banner.id = "mission-banner";
    this.banner.style.display = "none";
    const stage = document.getElementById("stage")!;
    stage.appendChild(this.panel);
    stage.appendChild(this.banner);
  }

  setMission(name: string): void {
    this.panel.style.display = "block";
    this.panel.dataset.name = name;
  }

  hide(): void {
    this.panel.style.display = "none";
    this.banner.style.display = "none";
  }

  update(name: string, statuses: ObjectiveStatus[], remaining: number | null): void {
    const timer =
      remaining === null
        ? ""
        : `<span class="mission-timer ${remaining < 6 ? "urgent" : ""}">${remaining.toFixed(1)}s</span>`;
    const objs = statuses
      .map((s) => {
        const pct = Math.round(s.progress * 100);
        return (
          `<div class="mission-obj ${s.done ? "done" : ""}">` +
          `<span class="mission-check">${s.done ? "✓" : "○"}</span>` +
          `<span class="mission-label">${s.label}</span>` +
          `<span class="mission-bar"><span style="width:${pct}%"></span></span>` +
          `</div>`
        );
      })
      .join("");
    this.panel.innerHTML = `<div class="mission-head">${name}${timer}</div>${objs}`;
  }

  showEnd(won: boolean, reason: string, onRetry: () => void, onMenu: () => void): void {
    this.banner.style.display = "flex";
    this.banner.innerHTML = `
      <div class="banner-panel ${won ? "won" : "lost"}">
        <div class="banner-title">${won ? "MISSION COMPLETE" : "MISSION FAILED"}</div>
        <div class="banner-sub">${won ? "Well wrecked." : reason}</div>
        <div class="banner-actions">
          <button class="banner-btn" data-act="retry">Retry</button>
          <button class="banner-btn" data-act="menu">Menu</button>
        </div>
      </div>`;
    this.banner.querySelector('[data-act="retry"]')!.addEventListener("click", () => {
      this.banner.style.display = "none";
      onRetry();
    });
    this.banner.querySelector('[data-act="menu"]')!.addEventListener("click", () => {
      this.banner.style.display = "none";
      onMenu();
    });
  }
}

function injectStyles(): void {
  if (document.getElementById("mission-styles")) return;
  const css = document.createElement("style");
  css.id = "mission-styles";
  css.textContent = `
    #mission {
      position:absolute; top:8px; left:50%; transform:translateX(-50%);
      width:min(420px,70vw); padding:10px 14px; border:1px solid #2a2a3a;
      border-radius:8px; background:rgba(14,14,22,.82); z-index:20;
      font-size:12px; pointer-events:none;
    }
    .mission-head { font-weight:700; color:#f0f0f6; margin-bottom:6px; display:flex; justify-content:space-between; }
    .mission-timer { color:#9fe0a0; font-variant-numeric:tabular-nums; }
    .mission-timer.urgent { color:#ff6b6b; }
    .mission-obj { display:flex; align-items:center; gap:6px; margin:3px 0; color:#c9c9d8; }
    .mission-obj.done { color:#9fe0a0; }
    .mission-check { width:12px; }
    .mission-label { flex:1; }
    .mission-bar { width:70px; height:6px; background:#23232f; border-radius:3px; overflow:hidden; }
    .mission-bar > span { display:block; height:100%; background:linear-gradient(90deg,#ffb347,#ff5f6d); }
    .mission-obj.done .mission-bar > span { background:#4caf6d; }
    #mission-banner {
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      background:rgba(6,7,12,.7); z-index:60;
    }
    .banner-panel {
      text-align:center; padding:28px 40px; border-radius:12px;
      border:1px solid #2a2a3a; background:#12121b; box-shadow:0 20px 60px rgba(0,0,0,.6);
    }
    .banner-title { font-size:28px; font-weight:800; letter-spacing:2px; }
    .banner-panel.won .banner-title { color:#8ce0a0; }
    .banner-panel.lost .banner-title { color:#ff6b6b; }
    .banner-sub { color:#9a9aac; font-size:13px; margin:6px 0 18px; }
    .banner-actions { display:flex; gap:10px; justify-content:center; }
    .banner-btn {
      all:unset; cursor:pointer; padding:8px 18px; border-radius:8px;
      border:1px solid #2a2a3a; background:#1b1b26; color:#e8e8f0; font-size:13px;
    }
    .banner-btn:hover { border-color:#ffd479; background:#24242f; }
  `;
  document.head.appendChild(css);
}
