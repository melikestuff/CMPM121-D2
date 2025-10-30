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

// --- Buttons ----------------------------------------------------------------
const clearBtn = document.createElement("button");
clearBtn.textContent = "Clear";
const undoBtn = document.createElement("button");
undoBtn.textContent = "Undo";
const redoBtn = document.createElement("button");
redoBtn.textContent = "Redo";

const thinBtn = document.createElement("button");
thinBtn.textContent = "Thin";
const thickBtn = document.createElement("button");
thickBtn.textContent = "Thick";

// Sticker buttons (default set)
const stickerBtns: HTMLButtonElement[] = [];
const stickerSet = ["⭐", "🌸", "🔥"];
for (const emoji of stickerSet) {
  const btn = document.createElement("button");
  btn.textContent = emoji;
  stickerBtns.push(btn);
}

// Custom sticker button
const addStickerBtn = document.createElement("button");
addStickerBtn.textContent = "+ Custom";

// Assemble toolbar
controls.append(
  clearBtn,
  undoBtn,
  redoBtn,
  thinBtn,
  thickBtn,
  ...stickerBtns,
  addStickerBtn,
);
document.body.append(appTitle, canvas, controls, info);

// --- Canvas setup ------------------------------------------------------------
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

// --- Command classes ---------------------------------------------------------
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

class StickerCommand {
  emoji: string;
  x: number;
  y: number;
  constructor(emoji: string, x: number, y: number) {
    this.emoji = emoji;
    this.x = x;
    this.y = y;
  }
  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  display(ctx: CanvasRenderingContext2D) {
    ctx.font = "24px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y);
  }
}

class ToolPreview {
  x: number;
  y: number;
  thickness: number;
  constructor(x: number, y: number, thickness: number) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
  }
  display(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.closePath();
  }
}

// --- State -------------------------------------------------------------------
let displayList: (MarkerLine | StickerCommand)[] = [];
let redoStack: (MarkerLine | StickerCommand)[] = [];
let currentStroke: MarkerLine | null = null;
let currentSticker: StickerCommand | null = null;
let drawing = false;
let toolPreview: ToolPreview | null = null;

let toolMode: "marker" | "sticker" = "marker";
let currentThickness = 2;
let currentStickerEmoji = "⭐";

// --- Utility -----------------------------------------------------------------
function getCanvasCoords(ev: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.round((ev.clientX - rect.left) * (canvas.width / rect.width)),
    y: Math.round((ev.clientY - rect.top) * (canvas.height / rect.height)),
  };
}

function updateToolSelection(selectedBtn: HTMLButtonElement) {
  [thinBtn, thickBtn, ...stickerBtns, addStickerBtn].forEach((btn) =>
    btn.classList.remove("selectedTool")
  );
  selectedBtn.classList.add("selectedTool");
}

// --- Event Handlers ----------------------------------------------------------
canvas.addEventListener("mousedown", (ev) => {
  const { x, y } = getCanvasCoords(ev);
  if (toolMode === "marker") {
    drawing = true;
    currentStroke = new MarkerLine(x, y, currentThickness);
    displayList.push(currentStroke);
    redoStack = [];
  } else if (toolMode === "sticker") {
    currentSticker = new StickerCommand(currentStickerEmoji, x, y);
    displayList.push(currentSticker);
    redoStack = [];
  }
  canvas.dispatchEvent(new Event("drawing-changed"));
});

globalThis.addEventListener("mousemove", (ev) => {
  const { x, y } = getCanvasCoords(ev as MouseEvent);
  if (toolMode === "marker" && drawing && currentStroke) {
    currentStroke.drag(x, y);
    canvas.dispatchEvent(new Event("drawing-changed"));
  } else if (toolMode === "sticker" && currentSticker) {
    currentSticker.drag(x, y);
    canvas.dispatchEvent(new Event("drawing-changed"));
  } else {
    toolPreview = toolMode === "marker"
      ? new ToolPreview(x, y, currentThickness)
      : null;
    canvas.dispatchEvent(new Event("tool-moved"));
  }
});

globalThis.addEventListener("mouseup", () => {
  drawing = false;
  currentStroke = null;
  currentSticker = null;
});

canvas.addEventListener("mouseleave", () => {
  drawing = false;
  currentStroke = null;
  currentSticker = null;
  toolPreview = null;
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// --- Redraw Observers --------------------------------------------------------
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of displayList) cmd.display(ctx);
  if (!drawing && toolPreview) toolPreview.display(ctx);
}

canvas.addEventListener("drawing-changed", redraw);
canvas.addEventListener("tool-moved", redraw);

// --- Buttons -----------------------------------------------------------------
clearBtn.addEventListener("click", () => {
  displayList = [];
  redoStack = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});

undoBtn.addEventListener("click", () => {
  if (displayList.length === 0) return;
  redoStack.push(displayList.pop()!);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

redoBtn.addEventListener("click", () => {
  if (redoStack.length === 0) return;
  displayList.push(redoStack.pop()!);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// Marker tool selection
thinBtn.addEventListener("click", () => {
  toolMode = "marker";
  currentThickness = 2;
  updateToolSelection(thinBtn);
});

thickBtn.addEventListener("click", () => {
  toolMode = "marker";
  currentThickness = 6;
  updateToolSelection(thickBtn);
});

// Sticker tool selection
function attachStickerHandler(btn: HTMLButtonElement) {
  btn.addEventListener("click", () => {
    toolMode = "sticker";
    currentStickerEmoji = btn.textContent!;
    updateToolSelection(btn);
  });
}

for (const btn of stickerBtns) attachStickerHandler(btn);

// Custom sticker creation
addStickerBtn.addEventListener("click", () => {
  const newEmoji = prompt("Custom sticker text", "🧽");
  if (!newEmoji) return;
  const newBtn = document.createElement("button");
  newBtn.textContent = newEmoji;
  stickerBtns.push(newBtn);
  attachStickerHandler(newBtn);
  controls.insertBefore(newBtn, addStickerBtn); // place before the +Custom button
  toolMode = "sticker";
  currentStickerEmoji = newEmoji;
  updateToolSelection(newBtn);
});

// Default selected tool
updateToolSelection(thinBtn);
