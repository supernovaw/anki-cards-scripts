import { bezierStrokeToDiscretePath, f_2d } from "./interpolations.js";
import { allLoadedDetails } from "./kanji-details-loader.js";

const strokeDuration = 200;
const unfinishedStrokeColor = "rgba(127, 127, 127, 0.5)"
const lineWidth = 3; // relative to 109, the box size

/* Writings stored in JSON files are represented by quadratic and cubic Bezier curves.
 * In order to render stroke animations, they are first converted into discrete paths
 * of points to enable continuously drawing them, as well as to spread points evenly (Bezier
 * curves, which are making up the strokes have different lengths). In order to save time on
 * these operations, results are stored in this object and are not discarded after use. */
const discreteWritings = {};

let canvases = [];
let animationStartedAt, elapsedTime; // performance.now() is used to track animation time
let latestLoopStartToken; // this makes old loops stop when a new loop is started

/* Transforms a writing, which conists of strokes, which consist of Bezier curves into
 * an array of strokes which are made of simple points that are evenly spaced and saves
 * the result. If this kanji has already been processed, does nothing. */
function discretizeWriting(kanji, details) {
  if (discreteWritings[kanji]) return;
  discreteWritings[kanji] = details.writing.map(bezierStrokeToDiscretePath);
}

// The "brush" is faster at the beginning of strokes and slower by the end, because of this function
function strokeEasingFunction(t) {
  return 1 - Math.pow(1 - t, 1.8);
}

// The stroke is drawn as t goes from 0 to 1; t=0.25 means 25% of it is to be drawn in this frame
function partiallyDrawStroke(ctx, path, t, foreground) {
  const segmentsNumber = path.length - 1;
  let completedSegments = Math.floor(segmentsNumber * t);
  if (completedSegments === segmentsNumber) completedSegments--; // prevents going out of bounds, just in case

  // draw the completed (opaque) part of the stroke (these two loops are kind of in reverse order, intentionally)
  ctx.strokeStyle = foreground;
  if (completedSegments > 0) {
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i <= completedSegments; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
  }

  // draw the portion of the partially completed segment
  const lastSegmentPhase = segmentsNumber * t % 1;
  const lastSegmentP1 = path[completedSegments];
  const lastSegmentP2 = path[completedSegments + 1];
  const lastSegmentEnd = f_2d(lastSegmentP1, lastSegmentP2, lastSegmentPhase);
  ctx.beginPath();
  ctx.moveTo(lastSegmentP1.x, lastSegmentP1.y);
  ctx.lineTo(lastSegmentEnd.x, lastSegmentEnd.y);
  ctx.stroke();
}

// This function has to be separated from partiallyDrawStroke to draw parts in correct order and prevent unpleasant overlapping
function partiallyDrawStrokeTransparentPart(ctx, path, t) {
  const segmentsNumber = path.length - 1;
  let completedSegments = Math.floor(segmentsNumber * t);
  if (completedSegments === segmentsNumber) completedSegments--; // prevents going out of bounds (just in case)

  // draw the unfinished (transparent) part of the stroke
  ctx.strokeStyle = unfinishedStrokeColor;
  ctx.beginPath();
  ctx.moveTo(path[completedSegments].x, path[completedSegments].y);
  for (let i = completedSegments + 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();
}

function drawStroke(ctx, path) {
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();
}

function renderCanvas(canvas) {
  // initialise context
  const size = 109; // this number comes from KanjiVG project's viewbox
  canvas.width = canvas.clientWidth * window.devicePixelRatio;
  canvas.height = canvas.clientHeight * window.devicePixelRatio;
  const scale = canvas.width / size;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, size, size);
  const computedStyle = getComputedStyle(canvas);
  const foreground = computedStyle.color;
  ctx.font = computedStyle.font;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";

  const writing = discreteWritings[canvas.getAttribute("kanji")];
  if (!writing) { // for missing writings, just print the kanji
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = foreground;
    ctx.fillText(canvas.getAttribute("kanji"), size / 2, size * 0.575);
    return;
  }

  // calculate which stroke is being drawn now and how much of it is already completed
  let currentStrokeIndex = (elapsedTime / strokeDuration) % writing.length;
  let currentStrokePhase = currentStrokeIndex % 1;
  currentStrokeIndex -= currentStrokePhase; // round down to integer
  currentStrokePhase = strokeEasingFunction(currentStrokePhase); // apply easing

  // render the transparent part of the currently drawn stroke
  partiallyDrawStrokeTransparentPart(ctx, writing[currentStrokeIndex], currentStrokePhase);

  // render unfinished strokes
  ctx.strokeStyle = unfinishedStrokeColor;
  for (let i = currentStrokeIndex + 1; i < writing.length; i++) drawStroke(ctx, writing[i]);

  // render finished strokes
  ctx.strokeStyle = foreground;
  for (let i = 0; i < currentStrokeIndex; i++) drawStroke(ctx, writing[i]);

  // render the currently drawn stroke
  partiallyDrawStroke(ctx, writing[currentStrokeIndex], currentStrokePhase, foreground);
}

function startAnimationLoop() {
  const thisLoopToken = latestLoopStartToken = Math.random();
  animationStartedAt = performance.now();
  function loop() {
    elapsedTime = performance.now() - animationStartedAt;
    canvases.forEach(renderCanvas);
    if (latestLoopStartToken === thisLoopToken) requestAnimationFrame(loop);
  }
  loop();
}

export function initAnimations() {
  canvases = document.querySelectorAll("canvas.kanji-animated");
  canvases.forEach(canvas => {
    const kanji = canvas.getAttribute("kanji");
    const details = allLoadedDetails[kanji];
    if (details) discretizeWriting(kanji, details);
  });
  startAnimationLoop();
}
