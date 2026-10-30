// The floor: one full-screen WebGL2 shader. A dark stone plane lit by the
// lantern (the pointer), with soft shadows cast by everything that floats
// above it, raked rings around the discs, warm light from the discs that are
// playing, and ripples of light from every note.
//
// Positions arrive in CSS pixels with a top-left origin, heights in the same
// units above the floor.

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

const FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uTime;
uniform vec3 uLight;
uniform float uLightPower;
uniform float uLightSize;
uniform vec4 uDiscs[4];
uniform float uGlow[4];
uniform vec4 uSeeds[8];
uniform vec4 uRipples[32];
uniform vec3 uRippleColors[32];
uniform int uRippleCount;

out vec4 fragColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + 17.1;
    amplitude *= 0.5;
  }
  return value;
}

// 1 where the lantern reaches the floor, 0 in the umbra of a floating disc.
float shadowOf(vec2 p, vec4 o) {
  float k = uLight.z / max(uLight.z - o.w, 1.0);
  vec2 center = uLight.xy + (o.xy - uLight.xy) * k;
  float penumbra = 1.5 + uLightSize * (k - 1.0);
  return smoothstep(-penumbra, penumbra, length(p - center) - o.z * k);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uPixelRatio;
  vec2 size = uResolution / uPixelRatio;

  // Dark warm stone: slow mottling and a fine static grain.
  float mottle = fbm(p * 0.004 + 3.7);
  float grain = hash(floor(gl_FragCoord.xy));
  vec3 albedo = vec3(0.09, 0.08, 0.074) * (0.74 + 0.42 * mottle) * (0.92 + 0.16 * grain);

  // Raked rings around each disc, like sand around stones.
  float rake = 0.0;
  for (int i = 0; i < 4; i++) {
    float r = uDiscs[i].z;
    float d = length(p - uDiscs[i].xy) - r;
    float reach = smoothstep(r * 1.5, r * 0.08, d) * smoothstep(0.0, r * 0.06, d);
    rake = max(rake, reach * smoothstep(0.35, 1.0, 0.5 + 0.5 * cos(d * 0.55)));
  }
  albedo *= 1.0 - 0.17 * rake;

  // The lantern.
  vec3 toLight = vec3(uLight.xy - p, uLight.z);
  float dist = length(toLight);
  float lambert = uLight.z / dist;
  float falloff = 1.0 / (1.0 + pow(dist / (uLight.z * 1.3), 2.6));
  float visible = 1.0;
  for (int i = 0; i < 4; i++) visible *= mix(0.08, 1.0, shadowOf(p, uDiscs[i]));
  for (int i = 0; i < 8; i++) {
    if (uSeeds[i].z > 0.0) visible *= mix(0.3, 1.0, shadowOf(p, uSeeds[i]));
  }
  vec3 color = albedo * vec3(1.0, 0.83, 0.62) * uLightPower * lambert * falloff * visible;

  // Discs that are playing glow, and their glow lights the floor around them.
  float occlusion = 1.0;
  for (int i = 0; i < 4; i++) {
    float r = uDiscs[i].z;
    float d = max(length(p - uDiscs[i].xy) - r, 0.0);
    color += albedo * vec3(1.0, 0.86, 0.7) * uGlow[i] * 1.35 / (1.0 + pow(d / (r * 0.55), 2.0));
    occlusion *= 1.0 - 0.5 * exp(-pow(d / (r * 0.22), 2.0));
  }
  color *= occlusion;

  // Ripples of light, one per note.
  for (int i = 0; i < 32; i++) {
    if (i >= uRippleCount) break;
    vec4 ripple = uRipples[i];
    float width = 1.2 + ripple.z * 0.02;
    float ring = exp(-pow((length(p - ripple.xy) - ripple.z) / width, 2.0));
    color += uRippleColors[i] * ring * ripple.w;
  }

  // A trace of ambient light, and a vignette into the void.
  color += albedo * 0.025;
  vec2 q = (p - size * 0.5) / size.y;
  color *= 1.0 - 0.7 * smoothstep(0.25, 1.0, length(q));

  color = 1.0 - exp(-color * 1.5);
  color = pow(color, vec3(1.0 / 2.2));
  color += (hash(gl_FragCoord.xy + fract(uTime * 7.13) * 397.0) - 0.5) * (2.5 / 255.0);
  fragColor = vec4(color, 1.0);
}
`;

const MAX_RIPPLES = 32;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

export class Floor {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    this.canvas = canvas;

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    this.program = program;

    // One triangle that covers the screen.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);

    this.uniforms = {};
    for (const name of ['uResolution', 'uPixelRatio', 'uTime', 'uLight', 'uLightPower', 'uLightSize',
      'uDiscs', 'uGlow', 'uSeeds', 'uRipples', 'uRippleColors', 'uRippleCount']) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }

    this.discs = new Float32Array(16);
    this.glow = new Float32Array(4);
    this.seeds = new Float32Array(32);
    this.ripples = new Float32Array(MAX_RIPPLES * 4);
    this.rippleColors = new Float32Array(MAX_RIPPLES * 3);
  }

  resize(width, height, pixelRatio) {
    this.pixelRatio = pixelRatio;
    this.canvas.width = Math.round(width * pixelRatio);
    this.canvas.height = Math.round(height * pixelRatio);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render({ time, light, lightPower, lightSize, discs, seeds, ripples }) {
    const { gl, uniforms: u } = this;

    discs.forEach((disc, i) => {
      this.discs.set([disc.x, disc.y, disc.r, disc.height], i * 4);
      this.glow[i] = disc.glow;
    });
    this.seeds.fill(0);
    seeds.forEach((seed, i) => this.seeds.set([seed.x, seed.y, seed.r, seed.height], i * 4));
    const count = Math.min(ripples.length, MAX_RIPPLES);
    for (let i = 0; i < count; i++) {
      const ripple = ripples[ripples.length - count + i];
      this.ripples.set([ripple.x, ripple.y, ripple.radius, ripple.intensity], i * 4);
      this.rippleColors.set(ripple.color, i * 3);
    }

    gl.useProgram(this.program);
    gl.uniform2f(u.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uPixelRatio, this.pixelRatio);
    gl.uniform1f(u.uTime, time);
    gl.uniform3f(u.uLight, light.x, light.y, light.z);
    gl.uniform1f(u.uLightPower, lightPower);
    gl.uniform1f(u.uLightSize, lightSize);
    gl.uniform4fv(u.uDiscs, this.discs);
    gl.uniform1fv(u.uGlow, this.glow);
    gl.uniform4fv(u.uSeeds, this.seeds);
    gl.uniform4fv(u.uRipples, this.ripples);
    gl.uniform3fv(u.uRippleColors, this.rippleColors);
    gl.uniform1i(u.uRippleCount, count);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
