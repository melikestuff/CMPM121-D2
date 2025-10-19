import exampleIconUrl from "./noun-paperclip-7598668-00449F.png";
import "./style.css";

// --- UI Setup ---------------------------------------------------------------
const appTitle = document.createElement("h1");
appTitle.textContent = "Sticker Sketchpad";

const canvas = document.createElement("canvas");
canvas.id = "sketch-canvas";
canvas.width = 256;
canvas.height = 256;
canvas.setAttribute("aria-label", "Drawing canvas");

const info = document.createElement("p");
info.innerHTML = `Example image asset: <img src="${exampleIconUrl}" class="icon" />`;

const controls = document.createElement("div");
controls.className = "controls";
const clearBtn = document.createElement("button");
clearBtn.type = "button";
clearBtn.textContent = "Clear";
controls.appendChild(clearBtn);

// Append elements to page
document.body.append(appTitle, canvas, controls, info);

// --- Canvas setup ------------------------------------------------------------
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2D context not available");

// --- Display list state ------------------------------------------------------
// Each element in displayList is an array of points [{x, y}, ...]
let displayList: { x: number; y: number }[][] = [];
let currentStroke: { x: number; y: number }[] | null = null;
let drawing = false;

// --- Utility -----------------------------------------------------------------
function getCanvasCoords(ev: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.round((ev.clientX - rect.left) * (canvas.width / rect.width)),
    y: Math.round((ev.clientY - rect.top) * (canvas.height / rect.height)),
  };
}

// --- Drawing Event Handlers --------------------------------------------------
canvas.addEventListener("mousedown", (ev) => {
  drawing = true;
  currentStroke = [];
  const { x, y } = getCanvasCoords(ev);
  currentStroke.push({ x, y });
  displayList.push(currentStroke);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

globalThis.addEventListener("mousemove", (ev) => {
  if (!drawing || !currentStroke) return;
  const { x, y } = getCanvasCoords(ev as MouseEvent);
  currentStroke.push({ x, y });
  canvas.dispatchEvent(new Event("drawing-changed"));
});

globalThis.addEventListener("mouseup", () => {
  if (!drawing) return;
  drawing = false;
  currentStroke = null;
});

canvas.addEventListener("mouseleave", () => {
  if (!drawing) return;
  drawing = false;
  currentStroke = null;
});

// --- Redraw Observer ---------------------------------------------------------
canvas.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of displayList) {
    if (stroke.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x + 0.5, stroke[0].y + 0.5);
    for (let i = 1; i < stroke.length; i++) {
      const pt = stroke[i];
      ctx.lineTo(pt.x + 0.5, pt.y + 0.5);
    }
    ctx.stroke();
    ctx.closePath();
  }
});

// --- Clear Button ------------------------------------------------------------
clearBtn.addEventListener("click", () => {
  displayList = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});