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
const exportBtn = document.createElement("button");
exportBtn.textContent = "Export";

const thinBtn = document.createElement("button");
thinBtn.textContent = "Thin";
const thickBtn = document.createElement("button");
thickBtn.textContent = "Thick";

// Sticker buttons (default)
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
  exportBtn,
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
  color: string;
  constructor(
    startX: number,
    startY: number,
    thickness: number,
    color: string,
  ) {
    this.points.push({ x: startX, y: startY });
    this.thickness = thickness;
    this.color = color;
  }
  drag(x: number, y: number) {
    this.points.push({ x, y });
  }
  display(ctx: CanvasRenderingContext2D, scale = 1) {
    if (this.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(
      (this.points[0].x + 0.5) * scale,
      (this.points[0].y + 0.5) * scale,
    );
    for (let i = 1; i < this.points.length; i++) {
      const pt = this.points[i];
      ctx.lineTo((pt.x + 0.5) * scale, (pt.y + 0.5) * scale);
    }
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.thickness * scale;
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
  rotation: number;
  constructor(emoji: string, x: number, y: number, rotation: number) {
    this.emoji = emoji;
    this.x = x;
    this.y = y;
    this.rotation = rotation;
  }
  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  display(ctx: CanvasRenderingContext2D, scale = 1) {
    ctx.save();
    ctx.translate(this.x * scale, this.y * scale);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.font = `${24 * scale}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }
}

class ToolPreview {
  x: number;
  y: number;
  thickness: number;
  color: string;
  emoji: string | null;
  rotation: number;
  constructor(
    x: number,
    y: number,
    thickness: number,
    color: string,
    emoji: string | null,
    rotation: number,
  ) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
    this.color = color;
    this.emoji = emoji;
    this.rotation = rotation;
  }
  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    if (this.emoji) {
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.font = "24px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.emoji, 0, 0);
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
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
let currentColor = randomColor();
let currentRotation = randomRotation();

// --- Utility -----------------------------------------------------------------
function randomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 100%, 30%)`;
}

function randomRotation() {
  return Math.floor(Math.random() * 360);
}

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
    currentStroke = new MarkerLine(x, y, currentThickness, currentColor);
    displayList.push(currentStroke);
    redoStack = [];
  } else if (toolMode === "sticker") {
    currentSticker = new StickerCommand(
      currentStickerEmoji,
      x,
      y,
      currentRotation,
    );
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
      ? new ToolPreview(x, y, currentThickness, currentColor, null, 0)
      : new ToolPreview(
        x,
        y,
        currentThickness,
        "#000",
        currentStickerEmoji,
        currentRotation,
      );
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

// --- Export Button -----------------------------------------------------------
exportBtn.addEventListener("click", () => {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportCtx = exportCanvas.getContext("2d") as CanvasRenderingContext2D;

  const scale = 4;

  for (const cmd of displayList) cmd.display(exportCtx, scale);

  const link = document.createElement("a");
  link.href = exportCanvas.toDataURL("image/png");
  link.download = "sketchpad.png";
  link.click();
});

// Marker tool selection
thinBtn.addEventListener("click", () => {
  toolMode = "marker";
  currentThickness = 2;
  currentColor = randomColor();
  updateToolSelection(thinBtn);
});

thickBtn.addEventListener("click", () => {
  toolMode = "marker";
  currentThickness = 6;
  currentColor = randomColor();
  updateToolSelection(thickBtn);
});

// Sticker tool selection
function attachStickerHandler(btn: HTMLButtonElement) {
  btn.addEventListener("click", () => {
    toolMode = "sticker";
    currentStickerEmoji = btn.textContent!;
    currentRotation = randomRotation();
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
  controls.insertBefore(newBtn, addStickerBtn);
  toolMode = "sticker";
  currentStickerEmoji = newEmoji;
  currentRotation = randomRotation();
  updateToolSelection(newBtn);
});

// Default selected tool
updateToolSelection(thinBtn);
