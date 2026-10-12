/**
 * WebGL 바다 배경 — raw WebGL로 풀스크린 셰이더 렌더링
 * curtains.js 없이 순수 WebGL만 사용 (배경에는 DOM→텍스처 변환이 불필요하므로)
 */

import { fullscreenVert, oceanFrag } from './shaders.js';

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertSrc, fragSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

/**
 * 바다 배경 WebGL 캔버스를 생성하고 애니메이션을 시작한다.
 * @param {HTMLElement} container - 캔버스를 삽입할 부모 요소
 * @returns {function} cleanup — 호출하면 캔버스·WebGL·rAF를 모두 정리
 */
export function createOceanBackground(container) {
  const canvas = document.createElement('canvas');
  canvas.className = 'ocean-canvas';
  container.insertBefore(canvas, container.firstChild);

  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) {
    console.warn('WebGL not supported, skipping ocean background');
    canvas.remove();
    return () => {};
  }

  const program = createProgram(gl, fullscreenVert, oceanFrag);
  if (!program) {
    canvas.remove();
    return () => {};
  }

  // 풀스크린 쿼드 (삼각형 두 개)
  const posAttr = gl.getAttribLocation(program, 'aPosition');
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1,  -1, 1,
    -1,  1,  1, -1,   1, 1,
  ]), gl.STATIC_DRAW);

  // uniform 위치
  gl.useProgram(program);
  const uTime = gl.getUniformLocation(program, 'uTime');
  const uResolution = gl.getUniformLocation(program, 'uResolution');
  const uMouse = gl.getUniformLocation(program, 'uMouse');

  // 마우스/터치 추적
  let mouseX = 0.5, mouseY = 0.5;
  const onPointer = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    mouseX = (clientX - rect.left) / rect.width;
    mouseY = 1.0 - (clientY - rect.top) / rect.height; // WebGL은 Y 반전
  };
  canvas.addEventListener('pointermove', onPointer);

  // 리사이즈
  let width = 0, height = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // 성능을 위해 2배까지만
    const rect = canvas.getBoundingClientRect();
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);
    if (w !== width || h !== height) {
      width = w; height = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };

  // 렌더 루프
  let rafId = null;
  let startTime = performance.now();
  let disposed = false;

  const render = () => {
    if (disposed) return;
    resize();

    const elapsed = (performance.now() - startTime) / 1000;
    gl.useProgram(program);
    gl.enableVertexAttribArray(posAttr);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(uTime, elapsed);
    gl.uniform2f(uResolution, width, height);
    gl.uniform2f(uMouse, mouseX, mouseY);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    rafId = requestAnimationFrame(render);
  };

  rafId = requestAnimationFrame(render);

  // cleanup
  return () => {
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    canvas.removeEventListener('pointermove', onPointer);
    gl.deleteProgram(program);
    gl.deleteBuffer(buf);
    canvas.remove();
  };
}
