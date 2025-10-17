import exampleIconUrl from "./noun-paperclip-7598668-00449F.png";
import "./style.css";
// Keep the example image asset below the canvas
const info = document.createElement("p");
info.innerHTML =
  `Example image asset: <img src="${exampleIconUrl}" class="icon" />`;

// Add an app title programmatically (do not edit index.html)
const title = document.createElement("h1");
title.textContent = "Sticker Sketchpad";

// Create a 256x256 canvas
const canvas = document.createElement("canvas");
canvas.id = "sketch-canvas";

// Set size of canvas
canvas.height = 256;
canvas.width = 256;

canvas.setAttribute("aria-label", "Drawing canvas");

//Appends
document.body.appendChild(info);
document.body.appendChild(title);
document.body.appendChild(canvas);
