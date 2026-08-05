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
uniform sampler2D uMaterialTextureA;
uniform sampler2D uMaterialTextureB;
uniform sampler2D uMaterialTextureC;
uniform float uMotionPhase;
uniform float uMotion;
uniform float uIntensity;
uniform float uGlare;
uniform float uTextureScale;
uniform float uSeed;
uniform float uBandFrequency;
uniform vec2 uBandDirection;
uniform vec2 uLight;
uniform vec4 uArtworkRect;
uniform vec4 uStockRect;
uniform vec3 uEvolutionCircle;
uniform float uHasEvolutionCircle;
uniform int uProfile;

varying vec2 vUv;
varying vec3 vNormal;
varying float vSide;

float saturate(float value) {
  return clamp(value, 0.0, 1.0);
}

float inRect(vec2 point, vec4 rect) {
  vec2 lower = step(rect.xy, point);
  vec2 upper = step(point, rect.zw);
  return lower.x * lower.y * upper.x * upper.y;
}

float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

vec3 rainbow(float value) {
  return 0.52 + 0.48 * cos(6.2831853 * (vec3(0.0, 0.3333, 0.6667) + value));
}

vec2 materialUv(vec2 cardUv, float scale, vec2 offset) {
  vec2 topOriginUv = fract(cardUv * scale + offset);
  return vec2(topOriginUv.x, 1.0 - topOriginUv.y);
}

void main() {
  if (vSide <= 0.5) {
    discard;
  }

  vec4 texel = texture2D(uFrontTexture, vUv);
  if (texel.a < 0.01) {
    discard;
  }

  // A normal finish is deliberately byte-for-byte free of material lighting.
  if (uProfile == 0) {
    gl_FragColor = texel;
    return;
  }

  vec2 cardUv = vec2(vUv.x, 1.0 - vUv.y);
  vec3 normal = normalize(vNormal);
  float motionGate = step(0.5, uMotion);
  float time = uMotionPhase * motionGate;
  float idlePhase = time * 6.2831853 + uSeed * 5.7;
  float idleLightGate = uProfile == 3 ? 0.0 : motionGate;
  vec2 idleLight = idleLightGate * vec2(
    sin(idlePhase),
    cos(idlePhase + uSeed * 3.1)
  ) * vec2(0.42, 0.34);
  vec2 animatedLight = uLight + idleLight;
  vec3 lightDirection = normalize(vec3(animatedLight.x * 0.58, -animatedLight.y * 0.58, 1.35));
  vec3 halfDirection = normalize(lightDirection + vec3(0.0, 0.0, 1.0));
  float alignment = saturate(dot(normal, halfDirection));
  float specular = pow(alignment, 30.0);
  float fresnel = pow(1.0 - max(normal.z, 0.0), 1.35);
  float response = saturate(0.035 + specular * 0.52 + fresnel * 0.7);
  float glareResponse = saturate(pow(alignment, 70.0) * 0.72 + fresnel * 0.32);

  vec2 reflectionCenter = vec2(
    0.5 + (animatedLight.x - normal.x * 1.55) * 0.35,
    0.5 + (animatedLight.y + normal.y * 1.55) * 0.35
  );
  vec2 reflectionDelta = (cardUv - reflectionCenter) * vec2(1.0, 1.42);
  float reflectionSpot = exp(-dot(reflectionDelta, reflectionDelta) * 7.2);

  float artworkMask = inRect(cardUv, uArtworkRect);
  float stockMask = inRect(cardUv, uStockRect);
  float borderMask = 1.0 - stockMask;
  float evolutionMask = 0.0;
  if (uHasEvolutionCircle > 0.5) {
    vec2 evolutionDelta = cardUv - uEvolutionCircle.xy;
    evolutionDelta.y *= 88.0 / 63.0;
    float evolutionDistance = length(evolutionDelta);
    evolutionMask = 1.0 - smoothstep(
      uEvolutionCircle.z - 0.002,
      uEvolutionCircle.z + 0.002,
      evolutionDistance
    );
  }
  float materialMask = 1.0;
  if (uProfile == 1) {
    materialMask = max(artworkMask, borderMask) * (1.0 - evolutionMask);
  } else if (uProfile == 2) {
    materialMask = stockMask * (1.0 - artworkMask) * (1.0 - evolutionMask);
  } else if (uProfile == 9) {
    materialMask = artworkMask * (1.0 - evolutionMask);
  }

  float drift = time + sin(idlePhase * 2.0 + uSeed * 11.0) * 0.055 * motionGate;
  float bandCoordinate = dot(
    cardUv + vec2(normal.x * 0.18, normal.y * 0.14) + idleLight * 0.12,
    uBandDirection
  );
  float bandPhase = bandCoordinate * uBandFrequency + drift + uSeed * 0.73;
  float primaryBand = sin(bandPhase * 6.2831853) * 0.5 + 0.5;
  float secondaryBand = sin((bandPhase * 2.0 + uSeed * 0.17) * 6.2831853) * 0.5 + 0.5;
  float band = primaryBand * 0.86 + secondaryBand * 0.14;
  float stripeHighlight = pow(primaryBand, 2.4);
  vec3 prism = rainbow(
    bandPhase * 0.19 + normal.x * 0.11 - normal.y * 0.08 + time * 0.81
  );

  if (uProfile == 8) {
    band = primaryBand * 0.7 + secondaryBand * 0.3;
    prism = mix(vec3(luminance(prism)), prism, 0.72);
  }

  vec2 offsetA = vec2(fract(uSeed * 3.17), fract(uSeed * 7.91));
  vec2 offsetB = vec2(fract(uSeed * 11.43 + 0.31), fract(uSeed * 5.37 + 0.67));
  vec2 offsetC = vec2(fract(uSeed * 2.73 + 0.53), fract(uSeed * 13.11 + 0.19));
  float textureMotionGate = uProfile == 3 || uProfile == 5 || uProfile == 7 || uProfile == 10
    ? 0.0
    : motionGate;
  vec2 textureDrift = textureMotionGate * (
    vec2(
      sin(idlePhase + uSeed * 1.9),
      cos(idlePhase * 2.0 + uSeed * 2.7)
    ) * 0.065
  );
  float textureBScale = uProfile == 5 || uProfile == 7
    ? uTextureScale * 2.38
    : uTextureScale * 0.82;
  vec3 textureA = texture2D(
    uMaterialTextureA,
    materialUv(cardUv, uTextureScale, offsetA + textureDrift)
  ).rgb;
  vec3 textureB = texture2D(
    uMaterialTextureB,
    materialUv(cardUv, textureBScale, offsetB - textureDrift * 0.72)
  ).rgb;
  vec3 textureC = texture2D(
    uMaterialTextureC,
    materialUv(cardUv, uTextureScale * 1.18, offsetC + textureDrift * 1.24)
  ).rgb;

  float classicBorderBoost = uProfile == 1
    ? mix(1.0, 1.42, borderMask)
    : 1.0;
  float materialResponse = response * uIntensity * materialMask * classicBorderBoost;
  float horizontalStripeBoost = uProfile == 1 || uProfile == 7 || uProfile == 9 ? 1.35 : 1.0;
  float stripeProfileBoost = uProfile == 3
    ? 1.12
    : uProfile == 2
      ? 1.18
      : horizontalStripeBoost;
  float bandResponse = materialResponse * stripeProfileBoost * mix(0.3, 0.92, band);
  float chromaStrength = bandResponse * (uProfile == 8 ? 2.2 : 1.42);
  if (uProfile == 2) {
    chromaStrength *= 1.08;
  }

  vec3 color = texel.rgb;
  float sourceLuminance = luminance(color);
  vec3 materialPrism = uProfile == 2
    ? mix(vec3(luminance(prism)), prism, 0.68)
    : prism;
  vec3 luminanceTint = materialPrism * sourceLuminance * 1.18;
  vec3 prismTarget = mix(
    color * (0.84 + materialPrism * 0.34),
    luminanceTint,
    0.52
  );
  if (uProfile == 8) {
    prismTarget = mix(color, luminanceTint, 0.84);
  }
  color = mix(color, prismTarget, saturate(chromaStrength));
  color += mix(prism, vec3(0.9, 0.94, 0.95), 0.58) * bandResponse * 0.18;
  float highlightResponse = materialResponse * stripeHighlight;
  color += mix(prism, vec3(0.94, 0.97, 1.0), 0.5) * highlightResponse *
    (uProfile == 1 || uProfile == 7 || uProfile == 9 ? 0.26 : 0.13);
  if (uProfile == 1 || uProfile == 9) {
    color += mix(prism, vec3(0.88, 0.94, 0.96), 0.24) * bandResponse * 0.25;
  } else if (uProfile == 2) {
    color += mix(prism, vec3(0.9, 0.94, 0.95), 0.46) * bandResponse * 0.28;
  }

  // Each recipe gets one material-breakup source. Star stock is handled below.
  if (uProfile != 3) {
    float breakup = luminance(textureA);
    float centeredBreakup = uProfile == 1 || uProfile == 7 || uProfile == 9
      ? breakup - 0.5
      : breakup * 0.65;
    color *= 1.0 + centeredBreakup * materialResponse * 0.13;
  }

  if (uProfile == 3) {
    float valueA = max(textureA.r, max(textureA.g, textureA.b));
    float valueB = max(textureB.r, max(textureB.g, textureB.b));
    float signalA = smoothstep(0.13, 0.76, valueA);
    float signalB = smoothstep(0.18, 0.82, valueB);
    vec3 starColor = textureA * signalA + textureB * signalB * 0.72;
    color += starColor * uIntensity * materialMask * 0.42;
  }

  if (uProfile == 5 || uProfile == 7) {
    float etching = luminance(textureB) * 2.0 - 1.0;
    float relief = (0.045 + response * 0.085) * uIntensity * materialMask;
    color *= 1.0 + etching * relief;
  }

  if (uProfile == 7 || uProfile == 10) {
    vec3 glitterBase = textureC;
    vec3 glitterLayerB = texture2D(
      uMaterialTextureC,
      materialUv(cardUv, uTextureScale * 2.05, offsetC + vec2(0.37, 0.61))
    ).rgb;
    if (uProfile == 10) {
      glitterBase = texture2D(
        uMaterialTextureB,
        materialUv(cardUv, uTextureScale * 1.18, offsetB)
      ).rgb;
      glitterLayerB = texture2D(
        uMaterialTextureB,
        materialUv(cardUv, uTextureScale * 2.05, offsetB + vec2(0.37, 0.61))
      ).rgb;
    }
    float glitterValueA = max(glitterBase.r, max(glitterBase.g, glitterBase.b));
    float glitterValueB = max(glitterLayerB.r, max(glitterLayerB.g, glitterLayerB.b));
    float glitterA = smoothstep(0.38, 0.82, glitterValueA);
    float glitterB = smoothstep(0.4, 0.84, glitterValueB);
    float glitter = saturate(glitterA + glitterB * 0.85);
    float glitterCore = saturate(
      smoothstep(0.72, 0.96, glitterValueA) +
      smoothstep(0.74, 0.96, glitterValueB)
    );
    float glitterGate = 0.5 + glareResponse * 0.32 + reflectionSpot * 0.42;
    vec3 glitterColor = mix(
      max(glitterBase, glitterLayerB) * 1.55,
      vec3(0.94, 0.98, 1.0),
      0.62
    );
    color += glitterColor * glitter * glitterGate * uIntensity * 0.5;
    color += vec3(1.0, 0.98, 0.92) * glitterCore * glitterGate * uIntensity * 0.38;
  }

  if (uProfile == 2) {
    float metalTexture = luminance(textureB) - 0.5;
    float metalLight = (response * 0.62 + reflectionSpot * glareResponse * 0.58) * uIntensity;
    color *= 1.0 + metalTexture * materialMask * metalLight * 0.208;
    color += vec3(0.72, 0.8, 0.84) * materialMask * metalLight * 0.286;
  }

  float glare = reflectionSpot * glareResponse * uGlare * materialMask * classicBorderBoost;
  color += vec3(0.88, 0.93, 0.95) * glare * 0.34;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), texel.a);
}
`
