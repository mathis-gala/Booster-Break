export const CARD_VERTEX_SHADER_SOURCE = `
attribute vec3 aPosition;
attribute vec2 aUv;
attribute vec3 aNormal;
attribute float aSide;

uniform mat4 uMvp;
uniform mat4 uModel;

varying vec2 vUv;
varying vec3 vNormal;
varying float vSide;

void main() {
  vUv = aUv;
  vSide = aSide;
  vNormal = normalize((uModel * vec4(aNormal, 0.0)).xyz);
  gl_Position = uMvp * vec4(aPosition, 1.0);
}
`

export const CARD_FRAGMENT_SHADER_SOURCE = `
precision mediump float;

uniform sampler2D uFrontTexture;
uniform float uTime;
uniform int uFinish;

varying vec2 vUv;
varying vec3 vNormal;
varying float vSide;

vec3 rainbow(float value) {
  return 0.52 + 0.48 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + value));
}

float sparkle(vec2 uv, float time) {
  vec2 cell = floor(uv * 34.0);
  vec2 local = fract(uv * 34.0) - 0.5;
  float seed = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
  float dotShape = smoothstep(0.12, 0.0, length(local));
  float blink = smoothstep(0.55, 1.0, sin(seed * 17.0 + time * 3.1) * 0.5 + 0.5);
  return dotShape * blink;
}

float emblemPattern(vec2 uv) {
  vec2 grid = fract(uv * vec2(8.5, 12.0)) - 0.5;
  float diamond = abs(grid.x) + abs(grid.y);
  float diamondEdge = smoothstep(0.035, 0.0, abs(diamond - 0.34));
  float slash = smoothstep(0.035, 0.0, abs(grid.x + grid.y * 0.65));
  float chevron = smoothstep(0.035, 0.0, abs(abs(grid.x) - grid.y - 0.12));
  float inset = smoothstep(0.13, 0.09, max(abs(grid.x), abs(grid.y)));
  return max(diamondEdge, max(slash * 0.42, max(chevron * 0.55, inset * 0.34)));
}

void main() {
  bool isFront = vSide > 0.5;
  if (!isFront) {
    discard;
  }

  vec4 texel = texture2D(uFrontTexture, vUv);
  if (texel.a < 0.01) {
    discard;
  }

  vec3 normal = normalize(vNormal);
  vec3 lightDirection = normalize(vec3(-0.25, 0.55, 0.8));
  float diffuse = max(dot(normal, lightDirection), 0.0);
  float rim = pow(1.0 - abs(normal.z), 2.0);
  vec3 color = texel.rgb * (0.64 + diffuse * 0.36) + rim * 0.08;

  if (isFront && uFinish == 1) {
    float angleGlow = pow(1.0 - abs(normal.z), 0.68);
    float diagonal = sin((vUv.x * 1.35 + vUv.y * 0.9 + normal.x * 0.9 + normal.y * 0.58 + uTime * 0.1) * 18.0);
    float sweep = smoothstep(0.28, 1.0, diagonal * 0.5 + 0.5);
    float glint = smoothstep(0.74, 1.0, sin((vUv.x - vUv.y * 0.48 + normal.x * 0.2) * 76.0) * 0.5 + 0.5);
    vec3 prismColor = rainbow(vUv.x + vUv.y + normal.x * 0.38 + uTime * 0.045);
    vec3 holo = prismColor * (sweep * 0.24 + glint * 0.08) * (0.62 + angleGlow * 1.1);
    color += holo * (0.52 + angleGlow * 0.32);
  }

  if (isFront && uFinish == 2) {
    float angleGlow = pow(1.0 - abs(normal.z), 0.72);
    float diagonal = sin((vUv.x * 2.2 - vUv.y * 1.35 + normal.x * 0.95 + normal.y * 0.65 + uTime * 0.08) * 20.0);
    float prism = smoothstep(0.24, 1.0, diagonal * 0.5 + 0.5);
    float microLine = smoothstep(0.72, 1.0, sin((vUv.x + vUv.y * 0.42 + normal.x * 0.12) * 104.0) * 0.5 + 0.5);
    float crossLine = smoothstep(0.82, 1.0, sin((vUv.x * 0.38 - vUv.y + normal.y * 0.16) * 78.0) * 0.5 + 0.5);
    float emblem = emblemPattern(vUv + normal.xy * 0.035);
    vec3 prismColor = rainbow(vUv.x - vUv.y + normal.x * 0.34 + uTime * 0.035);
    vec3 foil = prismColor * (prism * 0.16 + microLine * 0.09 + crossLine * 0.05 + emblem * 0.2);
    foil += vec3(0.72, 0.88, 1.0) * (microLine + crossLine) * 0.035;
    foil *= 0.48 + angleGlow * 1.05;
    color = mix(color, color * 1.035 + foil, 0.42 + angleGlow * 0.24);
  }

  gl_FragColor = vec4(color, texel.a);
}
`
