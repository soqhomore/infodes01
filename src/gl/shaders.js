/**
 * GLSL 셰이더 소스 — 바다 배경 + 코스틱 빛 무늬
 * Vite는 JS 문자열로 번들링하므로 .glsl 파일 대신 여기에 둔다.
 */

/** 풀스크린 쿼드 버텍스 셰이더 (배경용) */
export const fullscreenVert = /* glsl */ `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * 바다 배경 프래그먼트 셰이더
 * - 깊은 바다 색 그라데이션
 * - 코스틱(빛 무늬) 패턴
 * - 느린 물결
 */
export const oceanFrag = /* glsl */ `
precision mediump float;

uniform float uTime;
uniform vec2  uResolution;
uniform vec2  uMouse;   // 0~1 범위, 포인터 위치

varying vec2 vUv;

// --- 유틸리티 ---
#define TAU 6.2831853

// 간단한 해시 (의사 난수)
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 부드러운 노이즈
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// --- 코스틱 패턴 ---
// Voronoi 기반 빛 무늬 (물 표면을 통과한 빛이 바닥에 만드는 패턴)
float caustic(vec2 uv, float time) {
  vec2 p = uv * 6.0;
  float t = time * 0.4;

  // 두 레이어의 보로노이를 겹쳐 코스틱 느낌
  float v1 = 0.0;
  float v2 = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 offset = vec2(
      sin(t + fi * 1.3) * 0.4,
      cos(t + fi * 1.7) * 0.3
    );
    v1 += sin(p.x * (1.0 + fi * 0.3) + offset.x) *
          cos(p.y * (1.2 + fi * 0.2) + offset.y);
    v2 += cos(p.x * (0.9 + fi * 0.4) + offset.y + 1.0) *
          sin(p.y * (1.1 + fi * 0.3) + offset.x + 2.0);
  }
  float c = (v1 + v2) * 0.16 + 0.5;
  return clamp(c, 0.0, 1.0);
}

// --- 물결 왜곡 ---
vec2 waveDistort(vec2 uv, float time) {
  float wave1 = sin(uv.y * 8.0 + time * 0.6) * 0.003;
  float wave2 = sin(uv.x * 6.0 + time * 0.4) * 0.002;
  float wave3 = cos(uv.y * 12.0 + uv.x * 4.0 + time * 0.8) * 0.001;
  return uv + vec2(wave1 + wave3, wave2);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 uvAspect = vec2(uv.x * aspect, uv.y);

  // 느린 물결로 UV 왜곡
  vec2 distorted = waveDistort(uvAspect, uTime);

  // 깊은 바다 그라데이션 (위: 밝은 청록, 아래: 깊은 남색)
  vec3 deepColor  = vec3(0.04, 0.08, 0.18);  // 깊은 바다
  vec3 shallowColor = vec3(0.08, 0.22, 0.35); // 중간
  vec3 surfaceColor = vec3(0.14, 0.38, 0.52); // 수면 가까이

  float depth = uv.y; // 0(아래) ~ 1(위)
  vec3 baseColor = mix(deepColor, shallowColor, smoothstep(0.0, 0.5, depth));
  baseColor = mix(baseColor, surfaceColor, smoothstep(0.5, 1.0, depth));

  // 코스틱 빛 무늬 (위쪽이 더 밝음)
  float c = caustic(distorted, uTime);
  float causticStrength = smoothstep(0.0, 0.8, depth) * 0.35;
  vec3 causticColor = vec3(0.3, 0.6, 0.75);
  baseColor += causticColor * c * causticStrength;

  // 부드러운 노이즈로 미세한 질감
  float n = noise(uvAspect * 3.0 + uTime * 0.1) * 0.04;
  baseColor += n;

  // 포인터 주변에 약간의 빛 강조
  float mouseDist = distance(uv, uMouse);
  float glow = exp(-mouseDist * mouseDist * 12.0) * 0.08;
  baseColor += vec3(0.2, 0.4, 0.5) * glow;

  // 가장자리 비네트
  float vignette = 1.0 - smoothstep(0.4, 1.0, distance(uv, vec2(0.5)));
  baseColor *= 0.85 + vignette * 0.15;

  gl_FragColor = vec4(baseColor, 1.0);
}
`;
