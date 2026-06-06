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

float outsideArtWindow(vec2 uv) {
  float insideX = step(0.085, uv.x) * step(uv.x, 0.915);
  float insideY = step(0.49, uv.y) * step(uv.y, 0.87);
  return 1.0 - insideX * insideY;
}

float emblemPattern(vec2 uv) {
  vec2 grid = fract(uv * vec2(8.5, 12.0)) - 0.5;
  float ring = smoothstep(0.235, 0.215, abs(length(grid) - 0.22));
  float split = smoothstep(0.024, 0.0, abs(grid.y));
  float center = smoothstep(0.07, 0.045, length(grid));
  return max(ring, max(split * 0.55, center * 0.75));
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
    float band = sin((vUv.x * 1.5 + vUv.y * 0.8 + uTime * 0.22) * 18.0) * 0.5 + 0.5;
    float sweep = smoothstep(0.64, 1.0, band);
    color += rainbow(vUv.x + vUv.y + uTime * 0.05) * sweep * 0.27;
  }

  if (isFront && uFinish == 2) {
    float bodyFoil = outsideArtWindow(vUv);
    float angleGlow = pow(1.0 - abs(normal.z), 0.72);
    float diagonal = sin((vUv.x * 2.2 - vUv.y * 1.35 + normal.x * 0.95 + normal.y * 0.65 + uTime * 0.08) * 20.0);
    float prism = smoothstep(0.24, 1.0, diagonal * 0.5 + 0.5);
    float microLine = smoothstep(0.78, 1.0, sin((vUv.x + vUv.y * 0.42 + normal.x * 0.12) * 92.0) * 0.5 + 0.5);
    float emblem = emblemPattern(vUv + normal.xy * 0.035);
    float shine = sparkle(vUv * vec2(1.0, 1.2) + normal.xy * 0.06, uTime);
    vec3 prismColor = rainbow(vUv.x - vUv.y + normal.x * 0.34 + uTime * 0.035);
    vec3 foil = prismColor * (prism * 0.22 + microLine * 0.06 + emblem * 0.13);
    foil += vec3(0.85, 0.94, 1.0) * shine * 0.16;
    foil *= bodyFoil * (0.52 + angleGlow * 1.2);
    color = mix(color, color * 1.05 + foil, bodyFoil * (0.5 + angleGlow * 0.28));
  }

  gl_FragColor = vec4(color, texel.a);
}
`
