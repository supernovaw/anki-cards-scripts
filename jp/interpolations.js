const curveDiscretization = 16;
const strokeDiscretization = 48;

// As t goes from 0 to 1, result goes from a to b (for numbers)
function f(a, b, t) {
  return a + t * (b - a);
}

// As t goes from 0 to 1, result goes from a to b (for { x, y } objects)
export function f_2d(a, b, t) {
  return {
    x: f(a.x, b.x, t),
    y: f(a.y, b.y, t)
  };
}

// Find a point that lies on a given Bezier curve
// This function works recursively, reducing the size until it is 1
function f_bezier(curvePoints, t) {
  if (curvePoints.length === 1) return curvePoints[0];

  const result = [];
  for (let i = 1; i < curvePoints.length; i++)
    result.push(f_2d(curvePoints[i - 1], curvePoints[i], t));

  return f_bezier(result, t);
}

// As t goes from 0 to 1, result goes from the beginning of path to the end of path
function f_discretePath(path, pathLength, t) {
  if (t === 1) return path[path.length - 1];
  let distance = pathLength * t; // distance that is left to go along the path

  for (let i = 0; i < path.length - 1; i++) {
    let segmentLength = xyDistance(path[i], path[i + 1]);
    // the iteration where distance will drop below segmentLength is the one where we have to interpolate between two path points
    if (distance > segmentLength) {
      distance -= segmentLength;
    } else {
      const segmentT = distance / segmentLength; // interpolation phase between two path points
      return f_2d(path[i], path[i + 1], segmentT);
    }
  }
  return path[path.length - 1];
}

/* Bezier strokes are strokes that consist of multiple quardatic or cubic Bezier curves. For example:
 * "C;44.5;28.5;45.71;28.39;47.56;28.16;49.73;27.86;C;49.73;27.86;57.39;
 * 26.82;69.05;25.0;71.0;25.0;C;71.0;25.0;73.5;25.0;75.0;24.5;76.25;24.75"
 * Tokens ("C", "Q" or numbers) are separated by semicolons. C (cubic) is followed by 4 XY coordinate
 * pairs (8 numbers), Q (quadratic) is followed by 3 XY coordinate pairs (6 numbers). */
function parseBezierStroke(bezierStroke) {
  const tokens = bezierStroke.split(";");
  const curves = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === "Q") curves.push([
      { x: +tokens[++i], y: +tokens[++i] },
      { x: +tokens[++i], y: +tokens[++i] },
      { x: +tokens[++i], y: +tokens[++i] }]);
    else if (tokens[i] === "C") curves.push([
      { x: +tokens[++i], y: +tokens[++i] },
      { x: +tokens[++i], y: +tokens[++i] },
      { x: +tokens[++i], y: +tokens[++i] },
      { x: +tokens[++i], y: +tokens[++i] }]);
    else throw new Error(`invalid token in "${bezierStroke}"`);
  }
  return curves;
}

// Distance between two { x, y } points
function xyDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function discretePathLength(path) {
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    length += xyDistance(a, b);
  }
  return length;
}

function getLastPoint(bezierStroke) {
  const lastCurve = bezierStroke[bezierStroke.length - 1];
  return lastCurve[lastCurve.length - 1];
}

// See kanji-animations.js (const discreteWritings) about the purpose of this transformation
export function bezierStrokeToDiscretePath(bezierStrokeText) {
  const bezierStroke = parseBezierStroke(bezierStrokeText);
  const lastPoint = getLastPoint(bezierStroke);

  // because the Bezier curves have different lengths, the resulting points in this step are uneven
  const unevenDiscretization = [];
  bezierStroke.forEach(curve => {
    for (let i = 0; i < curveDiscretization; i++)
      unevenDiscretization.push(f_bezier(curve, i / curveDiscretization));
  });
  unevenDiscretization.push(lastPoint);
  const udLength = discretePathLength(unevenDiscretization);

  // re-discretize the path, keeping the points evenly spaced this time
  const evenDiscretization = [];
  for (let i = 0; i < strokeDiscretization; i++)
    evenDiscretization.push(f_discretePath(unevenDiscretization, udLength, i / strokeDiscretization));
  evenDiscretization.push(lastPoint);

  return evenDiscretization;
}
