/**
 * Full-screen menu overlay, built from data so later phases can add sections
 * (missions, create). Purely presentational: it renders sections of clickable
 * items and shows/hides itself. The Game supplies the sections and callbacks.
 */
export interface MenuItem {
  label: string;
  desc?: string;
  badge?: string;
  onClick: () => void;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export class Menu {
  private readonly root: HTMLElement;
  private readonly body: HTMLElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.id = "menu";
    this.root.innerHTML = `
      <div class="menu-panel">
        <div class="menu-title">SHATTERSAND</div>
        <div class="menu-sub">a superhero destruction sandbox</div>
        <div class="menu-body"></div>
        <div class="menu-foot">Esc returns here · M toggles sound</div>
      </div>`;
    document.getElementById("app")!.appendChild(this.root);
    this.body = this.root.querySelector(".menu-body")!;
    injectStyles();
  }

  render(sections: MenuSection[]): void {
    this.body.innerHTML = "";
    for (const section of sections) {
      const sec = document.createElement("div");
      sec.className = "menu-section";
      sec.innerHTML = `<div class="menu-section-title">${section.title}</div>`;
      const grid = document.createElement("div");
      grid.className = "menu-grid";
      for (const item of section.items) {
        const btn = document.createElement("button");
        btn.className = "menu-item";
        btn.innerHTML =
          `<span class="menu-item-label">${item.label}` +
          (item.badge ? ` <span class="menu-badge">${item.badge}</span>` : "") +
          `</span>` +
          (item.desc ? `<span class="menu-item-desc">${item.desc}</span>` : "");
        btn.addEventListener("click", item.onClick);
        grid.appendChild(btn);
      }
      sec.appendChild(grid);
      this.body.appendChild(sec);
    }
  }

  show(): void {
    this.root.style.display = "flex";
  }
  hide(): void {
    this.root.style.display = "none";
  }
}

function injectStyles(): void {
  if (document.getElementById("menu-styles")) return;
  const css = document.createElement("style");
  css.id = "menu-styles";
  css.textContent = `
    #menu {
      position: absolute; inset: 0; display: flex; align-items: center;
      justify-content: center; background: rgba(6,7,12,0.82);
      backdrop-filter: blur(3px); z-index: 50;
    }
    .menu-panel {
      width: min(640px, 92vw); max-height: 92vh; overflow-y: auto;
      padding: 28px 30px; border: 1px solid #2a2a3a; border-radius: 12px;
      background: linear-gradient(180deg,#14141d,#0d0d15);
      box-shadow: 0 24px 80px rgba(0,0,0,.6);
    }
    .menu-title {
      font-size: 34px; font-weight: 800; letter-spacing: 3px;
      background: linear-gradient(90deg,#ff9a3c,#ff5f6d,#8a7bff);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .menu-sub { color:#8b8b9e; font-size:12px; margin:2px 0 18px; letter-spacing:1px; }
    .menu-section-title {
      color:#cfcfe0; font-size:12px; text-transform:uppercase; letter-spacing:2px;
      margin:16px 0 8px; border-bottom:1px solid #23232f; padding-bottom:4px;
    }
    .menu-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    @media (max-width:520px){ .menu-grid{ grid-template-columns:1fr; } }
    .menu-item {
      all:unset; cursor:pointer; display:flex; flex-direction:column; gap:3px;
      padding:10px 12px; border:1px solid #2a2a3a; border-radius:8px; background:#171720;
      transition:border-color .12s, background .12s;
    }
    .menu-item:hover { border-color:#ffd479; background:#20202c; }
    .menu-item-label { font-weight:600; color:#f0f0f6; font-size:14px; }
    .menu-item-desc { color:#8b8b9e; font-size:11px; line-height:1.4; }
    .menu-badge {
      font-size:9px; padding:1px 5px; border-radius:4px; background:#2a2a3a;
      color:#b8b8cc; vertical-align:middle; letter-spacing:1px;
    }
    .menu-foot { color:#5a5a6c; font-size:11px; margin-top:20px; text-align:center; }
  `;
  document.head.appendChild(css);
}
