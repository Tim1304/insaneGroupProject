// startScreen.js
// Fantasy start screen overlay + delayed game bootstrap.
// IMPORTANT: we DO NOT import game.js here.
// We dynamic-import it only after Start is pressed.

function injectStartScreenStyles() {
  const style = document.createElement("style");
  style.id = "start-screen-styles";
  style.textContent = `
    :root{
      --gold: #f6d27a;
      --gold2:#caa24a;
      --ink:  #0b0b10;
      --veil: rgba(0,0,0,.55);
      --veil2: rgba(0,0,0,.85);
      --panel: rgba(15,12,20,.55);
      --panel2: rgba(10,8,14,.78);
      --stroke: rgba(255,255,255,.14);
    }

    /* full-screen overlay */
    #startOverlay{
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: grid;
      place-items: center;
      overflow: hidden;
      user-select: none;
      background: radial-gradient(1200px 700px at 50% 40%, rgba(120,80,180,.20), rgba(0,0,0,.90)),
                  radial-gradient(900px 500px at 20% 30%, rgba(80,140,220,.14), transparent),
                  radial-gradient(700px 450px at 80% 70%, rgba(220,140,90,.10), transparent),
                  linear-gradient(180deg, #05050a 0%, #0a0710 35%, #06050b 100%);
    }

    /* animated fog layers */
    #startOverlay::before,
    #startOverlay::after{
      content:"";
      position:absolute;
      inset:-25%;
      background:
        radial-gradient(closest-side at 30% 40%, rgba(255,255,255,.08), transparent 70%),
        radial-gradient(closest-side at 70% 60%, rgba(255,255,255,.06), transparent 70%),
        radial-gradient(closest-side at 50% 50%, rgba(255,255,255,.05), transparent 70%);
      filter: blur(18px);
      opacity: .55;
      animation: fogDrift 18s linear infinite;
      pointer-events:none;
    }
    #startOverlay::after{
      opacity:.35;
      animation-duration: 26s;
      animation-direction: reverse;
      filter: blur(26px);
    }
    @keyframes fogDrift{
      0%{ transform: translate3d(-2%, -1%, 0) scale(1.02); }
      50%{ transform: translate3d(2%,  1%, 0) scale(1.06); }
      100%{ transform: translate3d(-2%, -1%, 0) scale(1.02); }
    }

    /* subtle star particles */
    .starfield{
      position:absolute;
      inset:0;
      pointer-events:none;
      opacity:.45;
      background-image:
        radial-gradient(1px 1px at 12% 28%, rgba(255,255,255,.65) 50%, transparent 52%),
        radial-gradient(1px 1px at 72% 18%, rgba(255,255,255,.55) 50%, transparent 52%),
        radial-gradient(1px 1px at 42% 62%, rgba(255,255,255,.50) 50%, transparent 52%),
        radial-gradient(1px 1px at 88% 54%, rgba(255,255,255,.45) 50%, transparent 52%),
        radial-gradient(1px 1px at 22% 78%, rgba(255,255,255,.40) 50%, transparent 52%),
        radial-gradient(1px 1px at 55% 40%, rgba(255,255,255,.50) 50%, transparent 52%);
      animation: twinkle 4.5s ease-in-out infinite;
    }
    @keyframes twinkle{
      0%,100%{ filter: brightness(0.9); transform: scale(1); }
      50%{ filter: brightness(1.2); transform: scale(1.01); }
    }

    /* main panel */
    .startPanel{
      width: min(820px, 92vw);
      padding: 44px 40px 34px;
      border-radius: 22px;
      background: linear-gradient(180deg, var(--panel) 0%, var(--panel2) 100%);
      border: 1px solid var(--stroke);
      box-shadow:
        0 24px 80px rgba(0,0,0,.65),
        inset 0 1px 0 rgba(255,255,255,.08);
      backdrop-filter: blur(10px);
      text-align: center;
      position: relative;
    }

    .crest{
      width: 120px;
      height: 120px;
      margin: 0 auto 18px;
      border-radius: 28px;
      background:
        radial-gradient(circle at 30% 30%, rgba(255,255,255,.18), transparent 55%),
        radial-gradient(circle at 70% 70%, rgba(255,255,255,.10), transparent 55%),
        linear-gradient(180deg, rgba(246,210,122,.30), rgba(202,162,74,.08));
      border: 1px solid rgba(246,210,122,.35);
      box-shadow:
        0 12px 34px rgba(0,0,0,.55),
        inset 0 1px 0 rgba(255,255,255,.18);
      display: grid;
      place-items: center;
      position: relative;
    }
    .crest::before{
      content:"✦";
      color: rgba(246,210,122,.85);
      font-size: 44px;
      text-shadow: 0 0 18px rgba(246,210,122,.35);
      transform: translateY(-1px);
    }

    .title{
      font-size: clamp(34px, 5vw, 54px);
      letter-spacing: 1px;
      margin: 0;
      color: #f7f3ff;
      text-shadow:
        0 2px 0 rgba(0,0,0,.45),
        0 0 28px rgba(130,90,210,.25);
    }
    .subtitle{
      margin: 10px 0 0;
      font-size: 15px;
      color: rgba(255,255,255,.78);
      letter-spacing: .3px;
    }

    .metaRow{
      margin-top: 22px;
      display: flex;
      gap: 14px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .chip{
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(0,0,0,.28);
      border: 1px solid rgba(255,255,255,.10);
      color: rgba(255,255,255,.82);
      font-size: 13px;
      letter-spacing: .25px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
    }
    .chip b{
      color: var(--gold);
      font-weight: 700;
      letter-spacing: .45px;
    }

    .divider{
      margin: 26px auto 20px;
      width: min(520px, 90%);
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(246,210,122,.45), transparent);
    }

    .startBtn{
      margin-top: 6px;
      appearance: none;
      border: none;
      cursor: pointer;
      padding: 14px 22px;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: .6px;
      color: #1a1206;
      background: linear-gradient(180deg, var(--gold) 0%, var(--gold2) 100%);
      box-shadow:
        0 18px 40px rgba(0,0,0,.45),
        inset 0 1px 0 rgba(255,255,255,.35);
      transition: transform .12s ease, filter .12s ease;
      min-width: 190px;
    }
    .startBtn:hover{ transform: translateY(-1px); filter: brightness(1.03); }
    .startBtn:active{ transform: translateY(0px) scale(.99); filter: brightness(.98); }

    .hint{
      margin-top: 16px;
      font-size: 12px;
      color: rgba(255,255,255,.55);
    }

    .error{
      margin-top: 14px;
      color: rgba(255,120,120,.92);
      font-size: 13px;
      display: none;
      white-space: pre-wrap;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}

function createStartOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "startOverlay";

  const stars = document.createElement("div");
  stars.className = "starfield";
  overlay.appendChild(stars);

  const panel = document.createElement("div");
  panel.className = "startPanel";

  const crest = document.createElement("div");
  crest.className = "crest";

  const h1 = document.createElement("h1");
  h1.className = "title";
  h1.textContent = "Initial Fantasy 10 000";

  const sub = document.createElement("p");
  sub.className = "subtitle";
  sub.textContent = "A realm awakens when you press Start.";

  const metaRow = document.createElement("div");
  metaRow.className = "metaRow";

  const chip1 = document.createElement("div");
  chip1.className = "chip";
  chip1.innerHTML = `Game: <b>Initial Fantasy 10 000</b>`;

  const chip2 = document.createElement("div");
  chip2.className = "chip";
  chip2.innerHTML = `Group Code: <b>5892</b>`;

  metaRow.appendChild(chip1);
  metaRow.appendChild(chip2);

  const divider = document.createElement("div");
  divider.className = "divider";

  const btn = document.createElement("button");
  btn.className = "startBtn";
  btn.type = "button";
  btn.textContent = "START";

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = "Tip: Once inside, click to lock pointer for FPS controls.";

  const err = document.createElement("div");
  err.className = "error";
  err.id = "startError";

  panel.appendChild(crest);
  panel.appendChild(h1);
  panel.appendChild(sub);
  panel.appendChild(metaRow);
  panel.appendChild(divider);
  panel.appendChild(btn);
  panel.appendChild(hint);
  panel.appendChild(err);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  return { overlay, btn, err };
}

async function bootGameAfterStart({ overlay, btn, err }) {
  btn.disabled = true;
  btn.textContent = "LOADING...";

  try {
    // This guarantees game.js doesn't execute until *now*.
    const mod = await import("../../game.js");

    if (!mod || typeof mod.startGame !== "function") {
      throw new Error(
        "game.js loaded, but it does not export startGame().\n" +
        "Did you apply the game.js refactor?"
      );
    }

    // Start the game (all renderer/scene setup happens inside startGame)
    mod.startGame();

    // Remove overlay
    overlay.remove();

    // Optional: remove injected CSS too (harmless if kept)
    const style = document.getElementById("start-screen-styles");
    if (style) style.remove();
  } catch (e) {
    console.error(e);
    err.style.display = "block";
    err.textContent =
      "Failed to start the game.\n\n" +
      (e && e.message ? e.message : String(e));

    btn.disabled = false;
    btn.textContent = "START";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  injectStartScreenStyles();
  const ui = createStartOverlay();
  ui.btn.addEventListener("click", () => bootGameAfterStart(ui));
});
