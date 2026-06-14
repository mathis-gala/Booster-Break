// Shared program for the booster opening, drawn twice from one mesh:
//   uMode 0 -> the pack body (stays put; its torn top rim pours out light)
//   uMode 1 -> the pre-cut top strip, rotating as one piece
//
// Cutting: dragging advances uFrontX; every column on the started side is
// "opened", lighting up the rim. Once cut across, uLaunch ramps 0->1 and the
// whole strip flies up, tumbles and fades while the opening flares.

export const BOOSTER_VERTEX_SHADER_SOURCE = `
precision mediump float;

attribute vec2 aPos;
attribute vec2 aUv;

uniform mat4 uMvp;
uniform float uMode;
uniform float uBaseline;
uniform float uBaselineY;
uniform float uHalfWidth;
uniform float uFrontX;
uniform float uDir;
uniform float uActive;
uniform float uProgress;
uniform float uLaunch;
uniform float uTime;

varying vec2 vUv;

void main() {
  vUv = aUv;
  vec3 pos = vec3(aPos, 0.0);

  // The top crimp is a single pre-cut rectangle. During the drag it rotates
  // around the lower corner opposite the cut direction, instead of being carved
  // into progressive blocks.
  if (uMode > 0.5) {
    float cutProgress = max(uActive * uProgress, uLaunch);
    float detach = smoothstep(0.02, 0.92, cutProgress);
    float stripT = smoothstep(uBaseline, 1.0, aUv.y);
    vec2 pivot = vec2(uDir > 0.0 ? uHalfWidth : -uHalfWidth, uBaselineY);
    vec2 rel = pos.xy - pivot;
    float detachAngle = -uDir * (detach * 0.24 + uLaunch * 0.28);
    float detachCos = cos(detachAngle);
    float detachSin = sin(detachAngle);

    pos.x = pivot.x + rel.x * detachCos - rel.y * detachSin;
    pos.y = pivot.y + rel.x * detachSin + rel.y * detachCos;
    pos.z += detach * stripT * 0.06;

    float launchAngle = -uDir * (uLaunch * 0.34);
    float launchCos = cos(launchAngle);
    float launchSin = sin(launchAngle);
    vec2 launchRel = pos.xy - pivot;
    pos.x = pivot.x + launchRel.x * launchCos - launchRel.y * launchSin;
    pos.y = pivot.y + launchRel.x * launchSin + launchRel.y * launchCos + uLaunch * 0.36;
    pos.z += uLaunch * 0.42;
    pos.x += uLaunch * uDir * 0.16 + sin(aUv.x * 3.0 + uLaunch * 5.0) * uLaunch * 0.06;
  }

  gl_Position = uMvp * vec4(pos, 1.0);
}
`

export const BOOSTER_FRAGMENT_SHADER_SOURCE = `
precision mediump float;

uniform sampler2D uTex;
uniform float uMode;
uniform float uFrontX;
uniform float uDir;
uniform float uActive;
uniform float uBaseline;
uniform float uProgress;
uniform float uTime;
uniform float uFlash;
uniform float uLaunch;

varying vec2 vUv;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float cutLine(float u) {
  float cell = fract(u * 42.0);
  float tooth = (1.0 - abs(cell * 2.0 - 1.0)) * 0.009;
  float micro = (hash21(vec2(floor(u * 84.0), 3.7)) - 0.5) * 0.003;
  return uBaseline - tooth + micro;
}

void main() {
  vec4 tex = texture2D(uTex, vUv);
  float tline = cutLine(vUv.x);
  float coverage = (uDir > 0.0) ? (uFrontX - vUv.x) : (vUv.x - uFrontX);
  // How far the blade has crossed this column.
  float opened = max(uActive > 0.5 ? smoothstep(0.0, 0.02, coverage) : 0.0, uLaunch);
  float stripLift = max(uActive * smoothstep(0.02, 0.08, uProgress), uLaunch);

  if (uMode > 0.5) {
    // ---- Pre-cut top strip (rotates as one rectangle) ----
    if (vUv.y < tline) discard;
    if (stripLift < 0.01) discard;
    if (tex.a < 0.02) discard;
    float alpha = tex.a * (1.0 - smoothstep(0.94, 1.0, uLaunch) * 0.25);
    if (alpha < 0.01) discard;
    vec3 col = tex.rgb;
    // Glowing torn bottom edge of the strip.
    float edge = smoothstep(0.07, 0.0, vUv.y - tline);
    float pulse = 0.7 + 0.3 * sin(uTime * 8.0);
    col += vec3(1.0, 0.72, 0.2) * edge * (uProgress * 0.9 + uLaunch * 1.8) * pulse;
    // Catches rare-card gold as it tumbles off.
    col += vec3(1.0, 0.72, 0.18) * uLaunch * 0.35;
    float blade = uActive * smoothstep(0.09, 0.0, abs(vUv.x - uFrontX)) * edge;
    col += vec3(1.0, 0.9, 0.42) * blade * 1.8;
    gl_FragColor = vec4(col, alpha);
    return;
  }

  // ---- Pack body ----
  // Once the pre-cut strip starts rotating, the original crimp is carried by
  // the strip pass. Keeping it in the body would show duplicate foil.
  if (vUv.y > tline && stripLift > 0.5) discard;
  if (tex.a < 0.02) discard;
  vec3 col = tex.rgb;

  // Foil-like sheen drifting over the wrapper.
  float sweep = sin((vUv.x * 1.25 - vUv.y * 0.7 + uTime * 0.22) * 3.14159);
  col += vec3(0.55, 0.72, 1.0) * smoothstep(0.6, 1.0, sweep) * 0.12;

  // Light pouring out of the torn opening along the top rim.
  float distBelow = tline - vUv.y;
  float inside = step(0.0, distBelow);
  float halo = smoothstep(0.18, 0.0, distBelow) * inside;
  float flicker = 0.78 + 0.22 * sin(uTime * 6.0 + vUv.x * 20.0);
  vec3 lightColor = vec3(1.0, 0.72, 0.22);
  col += lightColor * (opened * halo) * (0.8 + uLaunch * 3.2 + uFlash * 2.5) * flicker;
  // Hot white core right at the cut edge.
  float core = smoothstep(0.035, 0.0, distBelow) * inside;
  col += vec3(1.0, 0.92, 0.58) * core * opened * (1.0 + uLaunch * 2.5);

  float ray = smoothstep(0.68, 1.0, sin(vUv.x * 72.0 + uTime * 7.0) * 0.5 + 0.5);
  col += vec3(1.0, 0.76, 0.28) * ray * halo * opened * (0.35 + uLaunch * 0.9);
  vec2 sparkleCell = floor(vec2(vUv.x * 64.0, vUv.y * 42.0)) + vec2(floor(uTime * 9.0));
  float sparkle = step(0.965, hash21(sparkleCell));
  sparkle *= smoothstep(0.18, 0.0, abs(distBelow)) * opened;
  col += vec3(1.0, 0.9, 0.42) * sparkle * (0.45 + uLaunch);

  float blade = uActive * smoothstep(0.08, 0.0, abs(vUv.x - uFrontX)) * core;
  col += vec3(1.0, 0.9, 0.42) * blade * 2.3;
  col += vec3(1.0, 0.78, 0.28) * uFlash * 0.7;
  gl_FragColor = vec4(col, tex.a);
}
`
