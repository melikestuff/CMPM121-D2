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
info.innerHTML =
  `Example image asset: <img src="${exampleIconUrl}" class="icon" />`;

const controls = document.createElement("div");
controls.className = "controls";

// Buttons
const clearBtn = document.createElement("button");
clearBtn.textContent = "Clear";
const undoBtn = document.createElement("button");
undoBtn.textContent = "Undo";
const redoBtn = document.createElement("button");
redoBtn.textContent = "Redo";

// Tool buttons
const thinBtn = document.createElement("button");
thinBtn.textContent = "Thin";
const thickBtn = document.createElement("button");
thickBtn.textContent = "Thick";

// Add all buttons to controls
controls.append(clearBtn, undoBtn, redoBtn, thinBtn, thickBtn);
document.body.append(appTitle, canvas, controls, info);

// --- Canvas setup ------------------------------------------------------------
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2D context not available");

// --- Marker Command Class ----------------------------------------------------
class MarkerLine {
  points: { x: number; y: number }[] = [];
  thickness: number;

  constructor(startX: number, startY: number, thickness: number) {
    this.points.push({ x: startX, y: startY });
    this.thickness = thickness;
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x + 0.5, this.points[0].y + 0.5);
    for (let i = 1; i < this.points.length; i++) {
      const pt = this.points[i];
      ctx.lineTo(pt.x + 0.5, pt.y + 0.5);
    }
    ctx.strokeStyle = "#000";
    ctx.lineWidth = this.thickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.closePath();
  }
}

// --- Display state -----------------------------------------------------------
let displayList: MarkerLine[] = [];
let redoStack: MarkerLine[] = [];
let currentStroke: MarkerLine | null = null;
let drawing = false;

// --- Current tool (marker style) --------------------------------------------
let currentThickness = 2; // default to thin

// --- Utility -----------------------------------------------------------------
function getCanvasCoords(ev: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.round((ev.clientX - rect.left) * (canvas.width / rect.width)),
    y: Math.round((ev.clientY - rect.top) * (canvas.height / rect.height)),
  };
}

function updateToolSelection(selectedBtn: HTMLButtonElement) {
  // Optional: simple visual feedback
  [thinBtn, thickBtn].forEach((btn) => btn.classList.remove("selectedTool"));
  selectedBtn.classList.add("selectedTool");
}

// --- Drawing Event Handlers --------------------------------------------------
canvas.addEventListener("mousedown", (ev) => {
  const { x, y } = getCanvasCoords(ev);
  drawing = true;
  currentStroke = new MarkerLine(x, y, currentThickness);
  displayList.push(currentStroke);
  redoStack = []; // clear redo history
  canvas.dispatchEvent(new Event("drawing-changed"));
});

globalThis.addEventListener("mousemove", (ev) => {
  if (!drawing || !currentStroke) return;
  const { x, y } = getCanvasCoords(ev as MouseEvent);
  currentStroke.drag(x, y);
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
  for (const cmd of displayList) {
    cmd.display(ctx);
  }
});

// --- Button Handlers ---------------------------------------------------------
clearBtn.addEventListener("click", () => {
  displayList = [];
  redoStack = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});

undoBtn.addEventListener("click", () => {
  if (displayList.length === 0) return;
  const last = displayList.pop()!;
  redoStack.push(last);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

redoBtn.addEventListener("click", () => {
  if (redoStack.length === 0) return;
  const restored = redoStack.pop()!;
  displayList.push(restored);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// Tool selection
thinBtn.addEventListener("click", () => {
  currentThickness = 2;
  updateToolSelection(thinBtn);
});

thickBtn.addEventListener("click", () => {
  currentThickness = 6;
  updateToolSelection(thickBtn);
});

// Default selected tool
updateToolSelection(thinBtn);
