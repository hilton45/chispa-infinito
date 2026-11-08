import { Container, Geometry, Graphics, Mesh, Shader } from 'pixi.js';
import { GENERATORS } from '@/data/generators';
import { hslToHexNumber, hslToRgbNormalized } from '@/utils/Color';
import { ActiveQualityTier } from './QualityGovernor';

const MAX_VISIBLE_PER_TYPE = 14;
const MAX_TOTAL_BODIES = 16 * MAX_VISIBLE_PER_TYPE; // 224 bodies

// Vertex shader for batched orbital bodies (includes vertex wave displacement for #12 Brana)
const ORBIT_BODY_VERT = `
  precision highp float;
  in vec2 aPosition;
  in vec2 aUV;
  in vec4 aBodyData;

  out vec2 vUV;
  out vec4 vBodyData;

  uniform mat3 uProjectionMatrix;
  uniform mat3 uWorldTransformMatrix;
  uniform mat3 uTransformMatrix;
  uniform float uTime;

  void main(void) {
    vUV = aUV;
    vBodyData = aBodyData;

    vec2 pos = aPosition;
    float genIndex = floor(aBodyData.x + 0.5);
    float seed = aBodyData.z;
    float scale = aBodyData.w;

    // #12 Brana: Vertex shader undulating membrane displacement
    if (abs(genIndex - 12.0) < 0.2) {
      float wave = sin(aUV.x * 3.8 + uTime * 3.6 + seed) * cos(aUV.y * 2.5 - uTime * 2.4) * 5.5 * scale;
      pos.y += wave;
      pos.x += cos(aUV.y * 3.2 + uTime * 2.8 + seed) * 2.5 * scale;
    }

    mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
    gl_Position = vec4((mvp * vec3(pos, 1.0)).xy, 0.0, 1.0);
  }
`;

// Fragment shader implementing the 16 distinct procedural celestial bodies
const ORBIT_BODY_FRAG = `
  precision highp float;
  in vec2 vUV;
  in vec4 vBodyData;
  out vec4 finalColor;

  uniform float uTime;
  uniform vec3 uEraAccent;

  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.53);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm4(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.03 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  float fbm5(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.04 + vec2(2.3, 5.7);
      a *= 0.5;
    }
    return v;
  }

  mat2 rot2D(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
  }

  void main(void) {
    vec2 p = vUV; // [-1, 1]
    float r = length(p);
    if (r > 1.0) {
      discard;
    }

    int gen = int(floor(vBodyData.x + 0.5));
    float depthAlpha = vBodyData.y;
    float seed = vBodyData.z;
    float angle = atan(p.y, p.x);

    vec3 col = vec3(0.0);
    float alpha = 0.0;

    if (gen == 1) {
      // 1. ÁTOMO: Glowing nucleus + 3 electrons with 32-point fading ribbon trails
      float nuc = smoothstep(0.20, 0.04, r) + pow(0.05 / max(r, 0.02), 1.3) * 0.45;
      col += mix(vec3(0.22, 0.78, 1.0), vec3(1.0), smoothstep(0.14, 0.0, r)) * nuc;
      alpha = clamp(nuc, 0.0, 1.0);

      for (int e = 0; e < 3; e++) {
        float fe = float(e);
        vec2 ep = rot2D(fe * 1.0472 + seed * 0.3) * p;
        ep.y *= 2.15; // Elliptical orbital plane
        float er = length(ep);
        float eAng = atan(ep.y, ep.x);
        float ringDist = abs(er - 0.68);
        // 32-point equivalent continuous analytical ribbon trail behind electron head
        float headAngle = uTime * (4.8 + fe * 0.9) + seed + fe * 2.1;
        float trailPhase = fract((headAngle - eAng) / 6.2831853);
        // Trail occupies 65% of orbit behind head (equivalent to 32-segment ribbon fade)
        float ribbonFade = smoothstep(0.68, 0.0, trailPhase) * step(0.001, trailPhase);
        float ribbonWidth = mix(0.065, 0.012, trailPhase);
        float ribbon = smoothstep(ribbonWidth, 0.0, ringDist) * ribbonFade;
        // Bright electron head
        vec2 headPos = vec2(cos(headAngle), sin(headAngle)) * 0.68;
        float headGlow = smoothstep(0.14, 0.0, length(ep - headPos));
        vec3 eCol = mix(vec3(0.35, 0.88, 1.0), vec3(1.0), headGlow);
        col += eCol * (ribbon * 0.85 + headGlow * 1.5);
        alpha = max(alpha, ribbon * 0.75 + headGlow);
      }
    } else if (gen == 2) {
      // 2. NUBE DE GAS: 4-octave domain-warped FBM, dual emission colors and drift
      vec2 wp = p * 2.2 + vec2(uTime * 0.18, -uTime * 0.14) + seed;
      vec2 q = vec2(fbm4(wp), fbm4(wp + vec2(4.2, 1.8)));
      float density = fbm4(wp + 2.1 * q);
      float mask = smoothstep(0.22, 0.78, density) * smoothstep(0.98, 0.25, r);
      vec3 c1 = uEraAccent;
      vec3 c2 = vec3(1.0, 0.58, 0.24);
      col = mix(c1, c2, clamp(q.x * 1.3, 0.0, 1.0)) * mask * 1.45;
      col += vec3(1.0, 0.96, 0.88) * smoothstep(0.58, 0.85, density) * smoothstep(0.55, 0.0, r) * 0.9;
      alpha = clamp(mask * 0.92, 0.0, 1.0);
    } else if (gen == 3) {
      // 3. PROTOESTRELLA: Noisy accretion disk + two bipolar jets with traveling pulses and flares
      vec2 rp = rot2D(seed * 0.7) * p;
      // Bipolar jets along Y axis
      float jetMask = smoothstep(0.18, 0.0, abs(rp.x)) * smoothstep(0.98, 0.15, abs(rp.y));
      float pulseKnot = 0.55 + 0.45 * sin(abs(rp.y) * 18.0 - uTime * 9.5 + seed);
      vec3 jetCol = vec3(1.0, 0.85, 0.38) * jetMask * pulseKnot * 1.6;
      // Noisy warm accretion disk
      vec2 dp = vec2(rp.x, rp.y * 2.4);
      float dr = length(dp);
      float diskNoise = fbm4(dp * 4.5 + uTime * 0.8 + seed);
      float disk = smoothstep(0.75, 0.20, dr) * (0.65 + 0.55 * diskNoise);
      // Central protostar ignition core + cross flare
      float core = smoothstep(0.26, 0.0, r);
      float flare = smoothstep(0.04, 0.0, abs(p.x)) * smoothstep(0.65, 0.0, abs(p.y))
                  + smoothstep(0.04, 0.0, abs(p.y)) * smoothstep(0.65, 0.0, abs(p.x));
      col = vec3(1.0, 0.45, 0.12) * disk * 1.3 + jetCol + vec3(1.0, 0.95, 0.82) * (core * 1.6 + flare * 0.75);
      alpha = clamp(disk + jetMask * 0.85 + core, 0.0, 1.0);
    } else if (gen == 4) {
      // 4. ESTRELLA ENANA: Sphere with granulation, sunspots, limb darkening and coronal eruptions
      float sphereR = 0.56;
      float corona = pow(0.11 / max(r - sphereR * 0.75, 0.03), 1.45) * smoothstep(1.0, sphereR, r);
      // Occasional coronal loop eruption
      float eruptAngle = seed + floor(uTime * 0.5) * 2.1;
      float eruptArc = smoothstep(0.35, 0.0, abs(angle - eruptAngle)) * smoothstep(0.12, 0.0, abs(r - 0.72)) * sin(fract(uTime * 0.5) * 3.14159);
      col = vec3(1.0, 0.65, 0.18) * (corona * 0.85 + eruptArc * 1.8);
      alpha = clamp(corona * 0.75 + eruptArc, 0.0, 1.0);

      if (r < sphereR) {
        float nr = r / sphereR;
        float z = sqrt(max(0.01, 1.0 - nr * nr));
        vec2 suv = p / (sphereR * (0.65 + 0.35 * z));
        float gran = fbm4(suv * 5.2 + uTime * 0.35 + seed);
        float spots = smoothstep(0.30, 0.18, gran) * smoothstep(0.2, 0.8, nr);
        float limb = pow(z, 0.62);
        vec3 surf = mix(vec3(0.85, 0.32, 0.06), vec3(1.0, 0.92, 0.65), limb * (0.55 + 0.45 * gran));
        surf *= (1.0 - spots * 0.65);
        col = mix(col, surf * 1.35, smoothstep(sphereR, sphereR - 0.04, r));
        alpha = 1.0;
      }
    } else if (gen == 5) {
      // 5. PÚLSAR: Tiny neutron sphere + 2 conical beams with god rays, pulse synced with audio tempo
      float beamAxis = uTime * 6.5 + seed;
      vec2 bp = rot2D(-beamAxis) * p;
      float cone = pow(max(0.0, abs(bp.x) / max(r, 0.001)), 10.0) * smoothstep(0.98, 0.12, r);
      float godRayNoise = 0.65 + 0.35 * sin(r * 24.0 - uTime * 16.0 + atan(bp.y, bp.x) * 8.0);
      float audioPulse = 0.82 + 0.32 * sin(uTime * 12.56637); // 2 Hz harmonic beat
      float core = smoothstep(0.18, 0.0, r) * audioPulse;
      float halo = pow(0.06 / max(r, 0.025), 1.4) * smoothstep(0.95, 0.15, r);
      col = vec3(0.15, 0.88, 1.0) * (cone * godRayNoise * 1.75 + halo * 0.65) * audioPulse + vec3(1.0) * core * 1.8;
      alpha = clamp(cone * 0.9 + halo * 0.6 + core, 0.0, 1.0);
    } else if (gen == 6) {
      // 6. NEBULOSA: 5-octave volumetric FBM, two emission colors and dark light-absorbing dust lanes
      vec2 np = p * 2.1 + seed;
      vec2 warp = vec2(fbm4(np + uTime * 0.1), fbm4(np - uTime * 0.08 + 3.1));
      float gas = fbm5(np + 1.85 * warp);
      float dust = fbm5(np * 1.6 - 1.4 * warp + vec2(7.2, 2.9));
      float radial = smoothstep(0.98, 0.18, r);
      float emissionMask = smoothstep(0.24, 0.82, gas) * radial;
      vec3 hAlpha = vec3(1.0, 0.24, 0.52);
      vec3 oIII = mix(vec3(0.18, 0.88, 0.96), uEraAccent, 0.5);
      vec3 nebCol = mix(hAlpha, oIII, smoothstep(0.3, 0.75, warp.x)) * emissionMask * 1.65;
      // Embedded young star cluster highlights
      nebCol += vec3(1.0, 0.97, 0.9) * pow(max(0.0, gas - 0.55) * 2.2, 2.4) * radial;
      // Dark dust absorption lanes (Beer-Lambert law extinction)
      float dustLane = smoothstep(0.48, 0.76, dust) * smoothstep(0.85, 0.15, r);
      nebCol *= exp(-dustLane * 2.4);
      col = nebCol;
      alpha = clamp(emissionMask * 0.95, 0.0, 1.0);
    } else if (gen == 7) {
      // 7. AGUJERO NEGRO: Accretion disk with Doppler beaming, photon ring & gravitational shadow
      vec2 dp = rot2D(0.35 + seed * 0.2) * p;
      // Lensed upper/lower arch + tilted accretion disk
      float diskR = length(vec2(dp.x, dp.y * 2.65));
      float archR = length(vec2(dp.x, abs(dp.y) * 1.35));
      float swirl = fbm4(vec2(atan(dp.y, dp.x) * 2.0 + uTime * 2.2, diskR * 6.0));
      float disk = smoothstep(0.88, 0.34, diskR) * smoothstep(0.22, 0.34, diskR) * (0.7 + 0.5 * swirl);
      float lensedArch = smoothstep(0.56, 0.30, archR) * smoothstep(0.23, 0.31, archR) * 0.65;
      // Relativistic Doppler beaming: left/approaching side burns bright yellow-white, receding side deep orange-red
      float doppler = clamp(0.65 - dp.x * 1.15, 0.22, 1.85);
      vec3 diskCol = mix(vec3(0.95, 0.28, 0.06), vec3(1.0, 0.94, 0.72), clamp((doppler - 0.3) * 0.75, 0.0, 1.0));
      // Crisp photon ring at r = 0.26
      float photonRing = smoothstep(0.035, 0.0, abs(r - 0.26)) * 2.1;
      // Event horizon shadow inside r < 0.25
      float shadow = smoothstep(0.24, 0.27, r);
      col = (diskCol * (disk + lensedArch) * doppler * 1.45 + vec3(1.0, 0.92, 0.68) * photonRing) * shadow;
      alpha = clamp((disk + lensedArch + photonRing) * shadow + smoothstep(0.26, 0.22, r) * 0.98, 0.0, 1.0);
    } else if (gen == 8) {
      // 8. GALAXIA: Logarithmic spiral arms with density waves, dark dust lanes & bright galactic bulge
      vec2 gp = rot2D(0.4) * p;
      gp.y *= 1.45; // Inclined galactic disk
      float gr = length(gp);
      float gAng = atan(gp.y, gp.x) - uTime * 0.85 + seed;
      // 2 main logarithmic spiral arms + secondary harmonic
      float logR = log(max(gr, 0.04)) * 3.4;
      float spiral = cos(gAng * 2.0 - logR);
      float armDensity = pow(max(0.0, 0.5 + 0.5 * spiral), 2.2) * smoothstep(0.92, 0.12, gr);
      float gasTurb = fbm4(gp * 5.0 - uTime * 0.3);
      // Dark dust lane along inner edge of spiral arms
      float dustLane = pow(max(0.0, 0.5 + 0.5 * sin(gAng * 2.0 - logR - 0.7)), 4.0) * smoothstep(0.75, 0.15, gr);
      float bulge = exp(-gr * 5.2) * 1.8;
      vec3 armCol = mix(uEraAccent, vec3(0.65, 0.82, 1.0), 0.45) * armDensity * (0.75 + 0.5 * gasTurb) * 1.5;
      armCol *= exp(-dustLane * 1.4);
      col = armCol + vec3(1.0, 0.92, 0.74) * bulge;
      alpha = clamp((armDensity + bulge) * smoothstep(1.0, 0.75, gr), 0.0, 1.0);
    } else if (gen == 9) {
      // 9. CÚMULO GALÁCTICO: Shared gravitational halo + multi-sized embedded elliptical/spiral sub-galaxies
      float halo = exp(-r * 2.6) * 0.65;
      col = vec3(0.52, 0.62, 1.0) * halo;
      float subAlpha = halo;
      for (int k = 0; k < 9; k++) {
        float fk = float(k);
        float a = seed + fk * 2.39996 + sin(uTime * 0.7 + fk) * 0.35;
        float d = (0.14 + mod(fk * 0.19, 0.58));
        vec2 gPos = vec2(cos(a), sin(a)) * d;
        float sz = (0.07 + mod(fk, 3.0) * 0.035);
        float gGlow = smoothstep(sz, 0.0, length(p - gPos));
        col += mix(vec3(1.0, 0.88, 0.68), uEraAccent, mod(fk, 2.0) * 0.5) * gGlow * 1.5;
        subAlpha = max(subAlpha, gGlow);
      }
      alpha = clamp(subAlpha * smoothstep(1.0, 0.75, r), 0.0, 1.0);
    } else if (gen == 10) {
      // 10. UNIVERSO: Cosmic web of filaments with bright galactic supercluster nodes & edge scattering
      vec2 up = p * 3.2 + seed;
      float n1 = fbm4(up + uTime * 0.12);
      float n2 = fbm4(up * 1.9 - uTime * 0.1);
      // Ridged multifractal cosmic web filaments
      float ridge = pow(max(0.0, 1.0 - abs(n1 - 0.5) * 4.2), 2.6);
      float nodes = pow(max(0.0, ridge * n2), 1.8) * 3.2;
      float sphere = smoothstep(0.92, 0.75, r);
      float rimScatter = smoothstep(0.55, 0.88, r) * smoothstep(0.95, 0.82, r);
      col = (uEraAccent * ridge * 1.3 + vec3(1.0, 0.98, 0.92) * nodes + vec3(0.38, 0.78, 1.0) * rimScatter * 1.4) * sphere;
      alpha = clamp((ridge * 0.85 + rimScatter + 0.25) * sphere, 0.0, 1.0);
    } else if (gen == 11) {
      // 11. CUÁSAR: Ultra-bright AGN core + long relativistic jet with superluminal traveling pulses
      vec2 qp = rot2D(seed + uTime * 0.15) * p;
      float jet = smoothstep(0.11, 0.0, abs(qp.y)) * smoothstep(0.99, 0.08, abs(qp.x));
      float knots = 0.6 + 0.4 * sin(abs(qp.x) * 26.0 - uTime * 15.0);
      float core = exp(-r * 6.0) * 2.2;
      float spikes = (smoothstep(0.03, 0.0, abs(p.x)) + smoothstep(0.03, 0.0, abs(p.y))) * smoothstep(0.75, 0.0, r);
      col = vec3(0.78, 0.35, 1.0) * jet * knots * 1.8 + vec3(1.0, 0.96, 1.0) * (core + spikes * 0.9);
      alpha = clamp(jet * 0.95 + core + spikes * 0.7, 0.0, 1.0);
    } else if (gen == 12) {
      // 12. BRANA: Undulating membrane (displaced in vertex shader) with luminous hyperspatial grid
      vec2 gp = p * 4.5;
      vec2 grid = abs(fract(gp - 0.5) - 0.5);
      float lines = smoothstep(0.12, 0.02, min(grid.x, grid.y));
      float waveGlow = 0.65 + 0.35 * sin(p.x * 5.0 + uTime * 4.0 + seed);
      float env = smoothstep(0.95, 0.35, r);
      col = mix(vec3(0.12, 0.88, 0.78), vec3(1.0), lines * 0.6) * (lines * 1.4 + 0.35) * waveGlow * env;
      alpha = clamp((lines * 0.9 + 0.35) * env, 0.0, 1.0);
    } else if (gen == 13) {
      // 13. CUERDA CÓSMICA: Standing harmonic waves with intense glow and plasma halo
      vec2 sp = rot2D(seed) * p;
      float envX = smoothstep(0.95, 0.1, abs(sp.x));
      float w1 = sin(sp.x * 6.283 + seed) * sin(uTime * 8.0) * 0.28 * envX;
      float w2 = sin(sp.x * 12.566) * cos(uTime * 13.0 + seed) * 0.14 * envX;
      float dist1 = abs(sp.y - w1);
      float dist2 = abs(sp.y - w2);
      float stringCore = smoothstep(0.055, 0.0, dist1) + smoothstep(0.04, 0.0, dist2) * 0.7;
      float stringHalo = (pow(0.025 / max(dist1, 0.012), 1.2) + pow(0.018 / max(dist2, 0.012), 1.2) * 0.6) * 0.35;
      float radialFade = smoothstep(0.98, 0.2, abs(sp.x));
      col = (vec3(1.0, 0.25, 0.45) * stringHalo + vec3(1.0, 0.94, 0.96) * stringCore * 1.6) * radialFade;
      alpha = clamp((stringCore + stringHalo) * radialFade, 0.0, 1.0);
    } else if (gen == 14) {
      // 14. BURBUJA DE MULTIVERSO: Thin-film interference iridescence, moving reflections & Fresnel rim
      float bubbleR = 0.78;
      if (r < bubbleR + 0.06) {
        float nr = clamp(r / bubbleR, 0.0, 1.0);
        float z = sqrt(max(0.001, 1.0 - nr * nr));
        float fresnel = pow(1.0 - z, 2.8);
        // Thin-film optical path difference modulated by swirling surface thickness
        float filmThickness = 3.5 * z + fbm4(p * 3.0 + uTime * 0.45 + seed) * 2.2;
        vec3 irid = 0.55 + 0.45 * cos(filmThickness * vec3(1.0, 1.28, 1.62) + uTime * 1.8);
        // Moving specular highlight
        vec2 specPos = vec2(-0.32 + 0.08 * cos(uTime * 1.5), -0.32 + 0.08 * sin(uTime * 1.5));
        float spec = smoothstep(0.22, 0.0, length(p - specPos));
        float rim = smoothstep(bubbleR + 0.04, bubbleR - 0.02, r);
        col = (irid * (0.32 + fresnel * 1.55) + vec3(1.0) * spec * 1.4) * rim;
        alpha = clamp((0.24 + fresnel * 0.85 + spec) * rim, 0.0, 1.0);
      }
    } else if (gen == 15) {
      // 15. MENTE CÓSMICA: Neural network graph with traveling action-potential pulses along edges
      float somaCore = smoothstep(0.22, 0.0, r);
      float axonGlow = 0.0;
      float nodeGlow = 0.0;
      for (int k = 0; k < 6; k++) {
        float fk = float(k);
        float a = seed + fk * 1.0472;
        vec2 dir = vec2(cos(a), sin(a));
        float proj = clamp(dot(p, dir), 0.0, 0.78);
        float dLine = length(p - dir * proj);
        float pulsePos = fract(uTime * 1.4 + fk * 0.19 + seed);
        float pulse = smoothstep(0.16, 0.0, abs(proj / 0.78 - pulsePos));
        axonGlow += smoothstep(0.045, 0.0, dLine) * (0.45 + pulse * 1.45);
        nodeGlow += smoothstep(0.13, 0.0, length(p - dir * 0.78));
      }
      col = vec3(0.20, 0.92, 0.65) * (axonGlow + nodeGlow * 1.2) + vec3(1.0, 0.98, 0.92) * (somaCore * 1.6 + nodeGlow * 0.6);
      alpha = clamp(somaCore + axonGlow + nodeGlow, 0.0, 1.0);
    } else {
      // 16. CHISPA ORIGINAL: Golden miniature core containing another core inside (2-level recursion)
      // Level 1 outer golden core + ring + rays
      float r1 = r;
      float ring1 = smoothstep(0.035, 0.0, abs(r1 - 0.72));
      float rays1 = (0.5 + 0.5 * sin(angle * 8.0 + uTime * 2.5)) * smoothstep(0.95, 0.25, r1);
      // Level 2 inner recursive orbiting core
      vec2 subCenter = vec2(cos(uTime * 3.2 + seed), sin(uTime * 3.2 + seed)) * 0.36;
      float r2 = length(p - subCenter);
      float subCore = smoothstep(0.18, 0.0, r2) + smoothstep(0.025, 0.0, abs(r2 - 0.24));
      // Level 2 central nested spark
      float innerSpark = smoothstep(0.24, 0.0, r1) + smoothstep(0.025, 0.0, abs(r1 - 0.34));
      col = vec3(1.0, 0.82, 0.24) * (ring1 * 1.3 + rays1 * 0.85) + vec3(1.0, 0.97, 0.86) * (innerSpark * 1.6 + subCore * 1.5);
      alpha = clamp(ring1 + rays1 * 0.75 + innerSpark + subCore, 0.0, 1.0);
    }

    // Apply 3D orbital depth brightness & alpha
    col *= (0.75 + 0.45 * depthAlpha);
    finalColor = vec4(col, alpha * depthAlpha);
  }
`;

// GPU Instanced Sub-Particle Cloud Shader for #8 Galaxy (>= 3,000 stars in High) & #9 Galactic Cluster (150-300 points)
const SUB_CLOUD_VERT = `
  precision highp float;
  in vec2 aCorner;
  in vec4 aOrbitSeed; // x: parentTrack (8 or 9), y: parentBodyIdx, z: localRadius, w: localAngle
  in vec3 aStarStyle; // x: size, y: colorMix, z: angularSpeed

  out vec2 vUV;
  out vec3 vColor;
  out float vAlpha;

  uniform mat3 uProjectionMatrix;
  uniform mat3 uWorldTransformMatrix;
  uniform mat3 uTransformMatrix;
  uniform float uTime;
  uniform vec3 uEraAccent;
  uniform vec4 uGalaxyCenters[14];  // xy = screen pos, z = scale, w = depthAlpha
  uniform vec4 uClusterCenters[14]; // xy = screen pos, z = scale, w = depthAlpha

  void main(void) {
    vUV = aCorner;
    int trackType = int(floor(aOrbitSeed.x + 0.5));
    int bIdx = int(clamp(floor(aOrbitSeed.y + 0.5), 0.0, 13.0));

    vec4 parent = trackType == 8 ? uGalaxyCenters[bIdx] : uClusterCenters[bIdx];
    float activeScale = parent.z;
    if (activeScale <= 0.001) {
      gl_Position = vec4(-2.0, -2.0, 0.0, 1.0);
      vAlpha = 0.0;
      vColor = vec3(0.0);
      return;
    }

    float rad = aOrbitSeed.z * activeScale;
    float theta = aOrbitSeed.w + uTime * aStarStyle.z;
    vec2 localOffset;
    if (trackType == 8) {
      // Logarithmic spiral arm density wave offset
      float armAngle = theta + log(max(aOrbitSeed.z, 0.08)) * 2.4;
      localOffset = vec2(cos(armAngle) * rad, sin(armAngle) * rad * 0.66);
      float c = cos(0.4), s = sin(0.4);
      localOffset = mat2(c, -s, s, c) * localOffset;
      vColor = mix(uEraAccent, vec3(1.0, 0.94, 0.82), aStarStyle.y);
    } else {
      // Bounded virial swarm motion inside Galactic Cluster
      float wobble = sin(uTime * 1.4 + aOrbitSeed.w * 3.0) * 0.18 * rad;
      localOffset = vec2(cos(theta) * (rad + wobble), sin(theta) * (rad - wobble));
      vColor = mix(vec3(0.65, 0.75, 1.0), vec3(1.0, 0.92, 0.78), aStarStyle.y);
    }

    float ptSize = aStarStyle.x * clamp(activeScale / 18.0, 0.5, 1.6);
    vec2 worldPos = parent.xy + localOffset + aCorner * ptSize;

    vAlpha = parent.w * (0.55 + 0.45 * aStarStyle.y);
    mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
    gl_Position = vec4((mvp * vec3(worldPos, 1.0)).xy, 0.0, 1.0);
  }
`;

const SUB_CLOUD_FRAG = `
  precision highp float;
  in vec2 vUV;
  in vec3 vColor;
  in float vAlpha;
  out vec4 finalColor;

  void main(void) {
    float d = length(vUV);
    if (d > 1.0 || vAlpha <= 0.001) discard;
    float glow = exp(-d * d * 4.2);
    finalColor = vec4(vColor * (1.1 + glow * 0.6), glow * vAlpha);
  }
`;

interface OrbitalBodyInstance {
  genIndex: number; // 1 to 16
  angle: number;
  speed: number;
  birthScale: number;
  seed: number;
}

interface OrbitTrack {
  genId: string;
  genIndex: number; // 1 to 16
  rxRatio: number;
  ryRatio: number;
  tiltAngle: number;
  baseSpeed: number;
  ownedCount: number;
  bodies: OrbitalBodyInstance[];
}

export class OrbitsLayer {
  public backContainer: Container;
  public frontContainer: Container;
  private backOrbitLines: Graphics;
  private frontOrbitLines: Graphics;

  private backBodiesMesh: Mesh<Geometry, Shader>;
  private frontBodiesMesh: Mesh<Geometry, Shader>;
  private bodiesShader: Shader;

  private backPositions: Float32Array;
  private backBodyData: Float32Array;
  private frontPositions: Float32Array;
  private frontBodyData: Float32Array;

  // Instanced GPU star/cluster cloud (3,200 galaxy stars + 260 cluster stars = 3,460 particles)
  private subCloudMesh!: Mesh<Geometry, Shader>;
  private subCloudShader!: Shader;
  private galaxyCentersUniform = new Float32Array(14 * 4);
  private clusterCentersUniform = new Float32Array(14 * 4);

  private tracks: OrbitTrack[] = [];

  public blackHoleScreenPos: { active: boolean; x: number; y: number } = {
    active: false,
    x: 0.5,
    y: 0.5,
  };

  constructor() {
    this.backContainer = new Container();
    this.frontContainer = new Container();

    this.backOrbitLines = new Graphics();
    this.frontOrbitLines = new Graphics();

    this.backContainer.addChild(this.backOrbitLines);
    this.frontContainer.addChild(this.frontOrbitLines);

    this.bodiesShader = Shader.from({
      gl: {
        vertex: ORBIT_BODY_VERT,
        fragment: ORBIT_BODY_FRAG,
      },
      resources: {
        bodyUniforms: {
          uTime: { value: 0, type: 'f32' },
          uEraAccent: { value: [0.22, 0.74, 0.97], type: 'vec3<f32>' },
        },
      },
    });

    const backBatch = this.createBodiesBatchMesh();
    this.backBodiesMesh = backBatch.mesh;
    this.backPositions = backBatch.positions;
    this.backBodyData = backBatch.bodyData;

    const frontBatch = this.createBodiesBatchMesh();
    this.frontBodiesMesh = frontBatch.mesh;
    this.frontPositions = frontBatch.positions;
    this.frontBodyData = frontBatch.bodyData;

    this.backContainer.addChild(this.backBodiesMesh);
    this.frontContainer.addChild(this.frontBodiesMesh);

    this.initInstancedGalaxyAndClusterCloud(3200, 260);
    this.initTracks();
  }

  private createBodiesBatchMesh(): {
    mesh: Mesh<Geometry, Shader>;
    positions: Float32Array;
    bodyData: Float32Array;
  } {
    const positions = new Float32Array(MAX_TOTAL_BODIES * 4 * 2);
    const uvs = new Float32Array(MAX_TOTAL_BODIES * 4 * 2);
    const bodyData = new Float32Array(MAX_TOTAL_BODIES * 4 * 4);
    const indices = new Uint32Array(MAX_TOTAL_BODIES * 6);

    for (let i = 0; i < MAX_TOTAL_BODIES; i++) {
      const vBase = i * 4;
      const uvIdx = vBase * 2;
      uvs[uvIdx + 0] = -1;
      uvs[uvIdx + 1] = -1;
      uvs[uvIdx + 2] = 1;
      uvs[uvIdx + 3] = -1;
      uvs[uvIdx + 4] = 1;
      uvs[uvIdx + 5] = 1;
      uvs[uvIdx + 6] = -1;
      uvs[uvIdx + 7] = 1;

      const iBase = i * 6;
      indices[iBase + 0] = vBase + 0;
      indices[iBase + 1] = vBase + 1;
      indices[iBase + 2] = vBase + 2;
      indices[iBase + 3] = vBase + 0;
      indices[iBase + 4] = vBase + 2;
      indices[iBase + 5] = vBase + 3;
    }

    const geometry = new Geometry({
      attributes: {
        aPosition: {
          buffer: positions,
          format: 'float32x2',
          stride: 2 * 4,
          offset: 0,
        },
        aUV: {
          buffer: uvs,
          format: 'float32x2',
          stride: 2 * 4,
          offset: 0,
        },
        aBodyData: {
          buffer: bodyData,
          format: 'float32x4',
          stride: 4 * 4,
          offset: 0,
        },
      },
      indexBuffer: indices,
    });

    const mesh = new Mesh({ geometry, shader: this.bodiesShader });
    return { mesh, positions, bodyData };
  }

  private initInstancedGalaxyAndClusterCloud(galaxyStars: number, clusterPoints: number): void {
    const total = galaxyStars + clusterPoints;
    const corners = new Float32Array(total * 4 * 2);
    const orbitSeed = new Float32Array(total * 4 * 4);
    const starStyle = new Float32Array(total * 4 * 3);
    const indices = new Uint32Array(total * 6);

    for (let i = 0; i < total; i++) {
      const isGalaxy = i < galaxyStars;
      const trackType = isGalaxy ? 8 : 9;
      const parentIdx = i % MAX_VISIBLE_PER_TYPE;
      const normR = isGalaxy ? Math.pow(Math.random(), 0.75) * 0.92 + 0.06 : Math.pow(Math.random(), 0.6) * 0.88 + 0.05;
      const angle = Math.random() * Math.PI * 2;
      const size = isGalaxy ? 1.1 + Math.random() * 1.4 : 1.4 + Math.random() * 2.2;
      const colorMix = Math.random();
      const speed = isGalaxy ? (0.45 / (0.25 + normR)) : (Math.random() - 0.5) * 0.8;

      const vBase = i * 4;
      const cIdx = vBase * 2;
      corners[cIdx + 0] = -1;
      corners[cIdx + 1] = -1;
      corners[cIdx + 2] = 1;
      corners[cIdx + 3] = -1;
      corners[cIdx + 4] = 1;
      corners[cIdx + 5] = 1;
      corners[cIdx + 6] = -1;
      corners[cIdx + 7] = 1;

      for (let v = 0; v < 4; v++) {
        const oIdx = (vBase + v) * 4;
        orbitSeed[oIdx + 0] = trackType;
        orbitSeed[oIdx + 1] = parentIdx;
        orbitSeed[oIdx + 2] = normR;
        orbitSeed[oIdx + 3] = angle;

        const sIdx = (vBase + v) * 3;
        starStyle[sIdx + 0] = size;
        starStyle[sIdx + 1] = colorMix;
        starStyle[sIdx + 2] = speed;
      }

      const iBase = i * 6;
      indices[iBase + 0] = vBase + 0;
      indices[iBase + 1] = vBase + 1;
      indices[iBase + 2] = vBase + 2;
      indices[iBase + 3] = vBase + 0;
      indices[iBase + 4] = vBase + 2;
      indices[iBase + 5] = vBase + 3;
    }

    const geometry = new Geometry({
      attributes: {
        aCorner: {
          buffer: corners,
          format: 'float32x2',
          stride: 2 * 4,
          offset: 0,
        },
        aOrbitSeed: {
          buffer: orbitSeed,
          format: 'float32x4',
          stride: 4 * 4,
          offset: 0,
        },
        aStarStyle: {
          buffer: starStyle,
          format: 'float32x3',
          stride: 3 * 4,
          offset: 0,
        },
      },
      indexBuffer: indices,
    });

    this.subCloudShader = Shader.from({
      gl: {
        vertex: SUB_CLOUD_VERT,
        fragment: SUB_CLOUD_FRAG,
      },
      resources: {
        subCloudUniforms: {
          uTime: { value: 0, type: 'f32' },
          uEraAccent: { value: [0.22, 0.74, 0.97], type: 'vec3<f32>' },
          uGalaxyCenters: { value: this.galaxyCentersUniform, type: 'vec4<f32>', size: 14 },
          uClusterCenters: { value: this.clusterCentersUniform, type: 'vec4<f32>', size: 14 },
        },
      },
    });

    this.subCloudMesh = new Mesh({ geometry, shader: this.subCloudShader });
    this.frontContainer.addChild(this.subCloudMesh);
  }

  private initTracks(): void {
    this.tracks = GENERATORS.map((gen, idx) => {
      const t = idx / Math.max(1, GENERATORS.length - 1);
      const rxRatio = 0.16 + t * 0.33;
      const ryRatio = rxRatio * (0.38 + 0.14 * Math.sin(idx * 1.7));
      const tiltAngle = ((idx * 37) % 180 - 90) * (Math.PI / 180) * 0.45;
      const baseSpeed = (0.75 / Math.pow(1 + idx * 0.35, 0.65)) * (idx % 2 === 0 ? 1 : -1);

      return {
        genId: gen.id,
        genIndex: gen.index,
        rxRatio,
        ryRatio,
        tiltAngle,
        baseSpeed,
        ownedCount: 0,
        bodies: [],
      };
    });
  }

  public syncWithState(generatorsState: Record<string, { owned: number }>): {
    newlySpawnedScreenCoords: Array<{ x: number; y: number; genIndex: number }>;
  } {
    const newlySpawnedScreenCoords: Array<{ x: number; y: number; genIndex: number }> = [];

    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      const owned = generatorsState[track.genId]?.owned ?? 0;
      track.ownedCount = owned;

      const targetVisible = Math.min(MAX_VISIBLE_PER_TYPE, owned);
      while (track.bodies.length < targetVisible) {
        const idx = track.bodies.length;
        const angle = (idx / MAX_VISIBLE_PER_TYPE) * Math.PI * 2 + i * 0.5;
        track.bodies.push({
          genIndex: track.genIndex,
          angle,
          speed: track.baseSpeed * (0.92 + (idx % 5) * 0.04),
          birthScale: 0.05,
          seed: idx * 17.3 + track.genIndex * 31.7,
        });
        newlySpawnedScreenCoords.push({ x: 0, y: 0, genIndex: track.genIndex });
      }
      if (track.bodies.length > targetVisible) {
        track.bodies.length = targetVisible;
      }
    }

    return { newlySpawnedScreenCoords };
  }

  private getBaseBodyPixelRadius(genIndex: number): number {
    switch (genIndex) {
      case 1:
        return 14;
      case 2:
        return 16;
      case 3:
        return 19;
      case 4:
        return 16;
      case 5:
        return 22;
      case 6:
        return 21;
      case 7:
        return 23;
      case 8:
        return 24;
      case 9:
        return 22;
      case 10:
        return 20;
      case 11:
        return 25;
      case 12:
        return 20;
      case 13:
        return 21;
      case 14:
        return 19;
      case 15:
        return 20;
      case 16:
      default:
        return 22;
    }
  }

  public update(
    dt: number,
    elapsedSeconds: number,
    centerX: number,
    centerY: number,
    minSceneSide: number,
    currentHue: number,
    implosionFactor: number,
    reduceMotion: boolean,
    qualityTier: ActiveQualityTier = 'high'
  ): void {
    const bg = this.backOrbitLines;
    const fg = this.frontOrbitLines;
    bg.clear();
    fg.clear();

    this.blackHoleScreenPos.active = false;
    this.galaxyCentersUniform.fill(0);
    this.clusterCentersUniform.fill(0);

    const accentColor = hslToHexNumber(currentHue, 90, 65);
    const [ar, ag, ab] = hslToRgbNormalized(currentHue, 95, 64);
    const implosionScale = 1.0 - implosionFactor * 0.92;

    const bodyUniforms = (this.bodiesShader.resources.bodyUniforms as any).uniforms;
    bodyUniforms.uTime = reduceMotion ? 0 : elapsedSeconds;
    bodyUniforms.uEraAccent = [ar, ag, ab];

    let backCount = 0;
    let frontCount = 0;

    for (let tIdx = 0; tIdx < this.tracks.length; tIdx++) {
      const track = this.tracks[tIdx];
      if (track.ownedCount <= 0) continue;

      const rx = minSceneSide * track.rxRatio * implosionScale;
      const ry = minSceneSide * track.ryRatio * implosionScale;
      const cosTilt = Math.cos(track.tiltAngle);
      const sinTilt = Math.sin(track.tiltAngle);

      const overflowCount = Math.max(0, track.ownedCount - MAX_VISIBLE_PER_TYPE);
      const haloAlpha = Math.min(0.36, 0.07 + Math.log10(1 + overflowCount) * 0.08);
      const haloWidth = 1.0 + Math.min(3.0, Math.log10(1 + overflowCount) * 1.1);

      this.drawOrbitArc(
        bg,
        centerX,
        centerY,
        rx,
        ry,
        cosTilt,
        sinTilt,
        Math.PI,
        Math.PI * 2,
        accentColor,
        haloAlpha * 0.55,
        haloWidth
      );
      this.drawOrbitArc(
        fg,
        centerX,
        centerY,
        rx,
        ry,
        cosTilt,
        sinTilt,
        0,
        Math.PI,
        accentColor,
        haloAlpha * 0.9,
        haloWidth
      );

      const baseR = this.getBaseBodyPixelRadius(track.genIndex);

      for (let bIdx = 0; bIdx < track.bodies.length; bIdx++) {
        const body = track.bodies[bIdx];
        if (!reduceMotion) {
          body.angle += body.speed * dt * (1 + implosionFactor * 5.0);
        }
        if (body.birthScale < 1.0) {
          body.birthScale = Math.min(1.0, body.birthScale + dt * 3.5);
        }

        const localX = Math.cos(body.angle) * rx;
        const localY = Math.sin(body.angle) * ry;
        const depthZ = Math.sin(body.angle); // -1 (far back) to +1 (near front)

        const wx = centerX + (localX * cosTilt - localY * sinTilt);
        const wy = centerY + (localX * sinTilt + localY * cosTilt);

        // 3D depth scale & brightness (larger & brighter in front, smaller & dimmer in back)
        const depthScale = (0.76 + 0.30 * depthZ) * body.birthScale * implosionScale;
        const depthAlpha = 0.62 + 0.38 * depthZ;
        const quadHalfSize = baseR * depthScale;

        if (track.genIndex === 7 && bIdx === 0) {
          this.blackHoleScreenPos.active = true;
          this.blackHoleScreenPos.x = wx;
          this.blackHoleScreenPos.y = wy;
        } else if (track.genIndex === 8 && bIdx < 14) {
          const gOff = bIdx * 4;
          this.galaxyCentersUniform[gOff + 0] = wx;
          this.galaxyCentersUniform[gOff + 1] = wy;
          this.galaxyCentersUniform[gOff + 2] = quadHalfSize * 0.95;
          this.galaxyCentersUniform[gOff + 3] = depthAlpha;
        } else if (track.genIndex === 9 && bIdx < 14) {
          const cOff = bIdx * 4;
          this.clusterCentersUniform[cOff + 0] = wx;
          this.clusterCentersUniform[cOff + 1] = wy;
          this.clusterCentersUniform[cOff + 2] = quadHalfSize * 0.95;
          this.clusterCentersUniform[cOff + 3] = depthAlpha;
        }

        if (depthZ < 0) {
          this.writeBodyQuad(
            this.backPositions,
            this.backBodyData,
            backCount,
            wx,
            wy,
            quadHalfSize,
            track.genIndex,
            depthAlpha,
            body.seed,
            depthScale
          );
          backCount++;
        } else {
          this.writeBodyQuad(
            this.frontPositions,
            this.frontBodyData,
            frontCount,
            wx,
            wy,
            quadHalfSize,
            track.genIndex,
            depthAlpha,
            body.seed,
            depthScale
          );
          frontCount++;
        }
      }
    }

    // Zero out unused quads in pre-allocated buffers (zero allocations)
    this.clearRemainingQuads(this.backPositions, backCount);
    this.clearRemainingQuads(this.frontPositions, frontCount);

    this.backBodiesMesh.geometry.getBuffer('aPosition').update();
    this.backBodiesMesh.geometry.getBuffer('aBodyData').update();
    this.frontBodiesMesh.geometry.getBuffer('aPosition').update();
    this.frontBodiesMesh.geometry.getBuffer('aBodyData').update();

    // Update GPU instanced galaxy/cluster star cloud uniforms
    this.subCloudMesh.visible = qualityTier !== 'low';
    if (this.subCloudMesh.visible) {
      const subUniforms = (this.subCloudShader.resources.subCloudUniforms as any).uniforms;
      subUniforms.uTime = reduceMotion ? 0 : elapsedSeconds;
      subUniforms.uEraAccent = [ar, ag, ab];
      subUniforms.uGalaxyCenters = this.galaxyCentersUniform;
      subUniforms.uClusterCenters = this.clusterCentersUniform;
    }
  }

  private writeBodyQuad(
    positions: Float32Array,
    bodyData: Float32Array,
    quadIdx: number,
    wx: number,
    wy: number,
    r: number,
    genIndex: number,
    depthAlpha: number,
    seed: number,
    depthScale: number
  ): void {
    const vBase = quadIdx * 4;
    const pIdx = vBase * 2;
    positions[pIdx + 0] = wx - r;
    positions[pIdx + 1] = wy - r;
    positions[pIdx + 2] = wx + r;
    positions[pIdx + 3] = wy - r;
    positions[pIdx + 4] = wx + r;
    positions[pIdx + 5] = wy + r;
    positions[pIdx + 6] = wx - r;
    positions[pIdx + 7] = wy + r;

    for (let v = 0; v < 4; v++) {
      const dIdx = (vBase + v) * 4;
      bodyData[dIdx + 0] = genIndex;
      bodyData[dIdx + 1] = depthAlpha;
      bodyData[dIdx + 2] = seed;
      bodyData[dIdx + 3] = depthScale;
    }
  }

  private clearRemainingQuads(positions: Float32Array, startQuadIdx: number): void {
    const startFloat = startQuadIdx * 8;
    positions.fill(0, startFloat);
  }

  private drawOrbitArc(
    g: Graphics,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    cosT: number,
    sinT: number,
    startA: number,
    endA: number,
    color: number,
    alpha: number,
    width: number
  ): void {
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const a = startA + (i / steps) * (endA - startA);
      const lx = Math.cos(a) * rx;
      const ly = Math.sin(a) * ry;
      const x = cx + (lx * cosT - ly * sinT);
      const y = cy + (lx * sinT + ly * cosT);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke({ width, color, alpha });
  }
}
