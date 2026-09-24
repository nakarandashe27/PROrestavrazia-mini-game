// WebGL2-рендер смальты (из промо-ролика): инстансы-четырёхугольники, фаска и блик в шейдере,
// мягкая тень на шов, фактурный раствор. Один draw call на проход.
const STRIDE = 22;

const VS = `#version 300 es
layout(location=0) in float a_corner;
layout(location=1) in vec2 a_center;
layout(location=2) in vec4 a_p01;
layout(location=3) in vec4 a_p23;
layout(location=4) in vec4 a_color;
layout(location=5) in vec4 a_xf;
layout(location=6) in vec4 a_mat;
uniform vec2 u_res;
uniform vec3 u_cam;
uniform vec2 u_shadowOff;
uniform float u_expand;
out vec2 v_uv; out vec4 v_color; out vec4 v_mat; out float v_ang; out float v_lift;
void main() {
  int ci = int(a_corner + 0.5);
  vec2 p = ci == 0 ? a_p01.xy : ci == 1 ? a_p01.zw : ci == 2 ? a_p23.xy : a_p23.zw;
  vec2 uv = ci == 0 ? vec2(-1., -1.) : ci == 1 ? vec2(1., -1.) : ci == 2 ? vec2(1., 1.) : vec2(-1., 1.);
  float s = a_xf.x, r = a_xf.y;
  p *= s;
  p += normalize(p + 1e-4) * (u_expand + s);
  float c = cos(r), sn = sin(r);
  p = vec2(p.x * c - p.y * sn, p.x * sn + p.y * c);
  vec2 world = a_center + p + u_shadowOff * (1. + a_xf.w * 7.);
  vec2 scr = (world - u_cam.yz) * u_cam.x + u_res * 0.5;
  gl_Position = vec4(scr.x / u_res.x * 2. - 1., 1. - scr.y / u_res.y * 2., 0., 1.);
  v_uv = uv; v_color = a_color; v_mat = a_mat; v_ang = a_xf.z + r; v_lift = a_xf.w;
}`;

const FS = `#version 300 es
precision highp float;
in vec2 v_uv; in vec4 v_color; in vec4 v_mat; in float v_ang; in float v_lift;
uniform float u_shadowPass;
uniform float u_shadowAlpha;
uniform vec3 u_light;
out vec4 o;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
void main() {
  vec2 uv = v_uv;
  vec2 q = abs(uv);
  const float R = 0.16;
  vec2 w = max(q - (1. - R), 0.);
  float sdf = length(w) + min(max(q.x - (1. - R), q.y - (1. - R)), 0.) - R;
  float e = -sdf;
  float aa = max(fwidth(e) * 1.1, 1e-4);
  if (u_shadowPass > 0.5) {
    float a = smoothstep(-0.05, 0.55, e) * v_color.a * u_shadowAlpha * (1. + v_lift * 0.6);
    o = vec4(0., 0., 0., min(a, 0.9));
    return;
  }
  vec2 outDir = (w.x > 0. && w.y > 0.) ? normalize(w) * sign(uv) : (q.x > q.y ? vec2(sign(uv.x), 0.) : vec2(0., sign(uv.y)));
  float bev = 1. - smoothstep(0.0, 0.2, e);
  vec2 slope = outDir * bev * 0.95;
  float sd = v_mat.y * 97.;
  vec2 wav = vec2(vnoise(uv * 1.4 + sd), vnoise(uv * 1.4 + sd + 13.1)) - 0.5;
  slope += wav * 0.3;
  vec3 N = normalize(vec3(slope, 1.));
  float c = cos(v_ang), s = sin(v_ang);
  vec3 L = normalize(u_light);
  L.xy = vec2(L.x * c + L.y * s, -L.x * s + L.y * c);
  float dif = clamp(dot(N, L), 0., 1.);
  vec3 Hh = normalize(L + vec3(0., 0., 1.));
  float gloss = v_mat.x;
  float spec = pow(clamp(dot(N, Hh), 0., 1.), mix(14., 70., gloss)) * mix(0.07, 0.5, gloss);
  vec3 base = v_color.rgb;
  float sp = vnoise(uv * 5. + sd * 1.7);
  base *= 0.93 + 0.12 * sp;
  vec3 col = base * (0.64 + 0.5 * dif);
  col += vec3(1., 0.97, 0.9) * spec;
  float g = v_mat.z;
  if (g > 0.) {
    float spark = pow(clamp(dot(N, normalize(vec3(-0.2, -0.3, 1.))), 0., 1.), 40.);
    col += vec3(1., 0.95, 0.8) * g * (0.35 + 1.4 * spark);
  }
  col = mix(col, base * (0.85 + 0.3 * dif) + spec, v_mat.w);
  float alpha = smoothstep(0., aa, e) * v_color.a;
  o = vec4(col * alpha, alpha);
}`;

const VS_BG = `#version 300 es
layout(location=0) in vec2 a_pos;
out vec2 v_p;
void main() { v_p = a_pos; gl_Position = vec4(a_pos, 0., 1.); }`;
const FS_BG = `#version 300 es
precision highp float;
in vec2 v_p;
uniform vec2 u_res; uniform vec3 u_cam; uniform vec3 u_grout;
out vec4 o;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
void main() {
  vec2 scr = vec2((v_p.x * 0.5 + 0.5) * u_res.x, (0.5 - v_p.y * 0.5) * u_res.y);
  vec2 world = (scr - u_res * 0.5) / u_cam.x + u_cam.yz;
  float n = vnoise(world * 0.9) * 0.6 + vnoise(world * 3.1) * 0.4;
  o = vec4(u_grout * (0.82 + 0.3 * n), 1.);
}`;

type Program = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
function compile(gl: WebGL2RenderingContext, type: number, src: string) {
 const s = gl.createShader(type)!;
 gl.shaderSource(s, src); gl.compileShader(s);
 if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
 return s;
}
function program(gl: WebGL2RenderingContext, vs: string, fs: string): Program {
 const p = gl.createProgram()!;
 gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
 gl.linkProgram(p);
 if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
 const u: Program['u'] = {};
 const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
 for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i)!; u[info.name] = gl.getUniformLocation(p, info.name); }
 return { p, u };
}

export type Cam = { zoom: number; x: number; y: number };

export class TileRenderer {
 gl: WebGL2RenderingContext;
 private tile: Program; private bg: Program;
 private vao: WebGLVertexArrayObject; private bgVao: WebGLVertexArrayObject; private ib: WebGLBuffer;
 data = new Float32Array(STRIDE * 8192);
 count = 0;
 constructor(public canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 недоступен');
  this.gl = gl;
  this.tile = program(gl, VS, FS);
  this.bg = program(gl, VS_BG, FS_BG);
  this.vao = gl.createVertexArray()!;
  gl.bindVertexArray(this.vao);
  const cb = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, cb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
  this.ib = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, this.ib);
  const B = STRIDE * 4;
  const attr = (loc: number, size: number, off: number) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, B, off * 4); gl.vertexAttribDivisor(loc, 1); };
  attr(1, 2, 0); attr(2, 4, 2); attr(3, 4, 6); attr(4, 4, 10); attr(5, 4, 14); attr(6, 4, 18);
  gl.bindVertexArray(null);
  this.bgVao = gl.createVertexArray()!;
  gl.bindVertexArray(this.bgVao);
  const bb = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, bb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
 }
 begin() { this.count = 0; }
 /** pts — смещения углов; c — [r,g,b] 0..255. */
 push(x: number, y: number, pts: Float32Array, c: ArrayLike<number>, a: number, scale: number, rot: number, ang: number, lift: number, gloss: number, seed: number, glint: number, emissive: number) {
  if ((this.count + 1) * STRIDE > this.data.length) { const d = new Float32Array(this.data.length * 2); d.set(this.data); this.data = d; }
  const d = this.data;
  let o = this.count * STRIDE;
  d[o++] = x; d[o++] = y;
  for (let k = 0; k < 8; k++) d[o++] = pts[k];
  d[o++] = c[0] / 255; d[o++] = c[1] / 255; d[o++] = c[2] / 255; d[o++] = a;
  d[o++] = scale; d[o++] = rot; d[o++] = ang; d[o++] = lift;
  d[o++] = gloss; d[o++] = seed; d[o++] = glint; d[o++] = emissive;
  this.count++;
 }
 render(cam: Cam, grout: ArrayLike<number>) {
  const gl = this.gl, W = this.canvas.width, H = this.canvas.height, n = this.count;
  gl.viewport(0, 0, W, H);
  gl.disable(gl.DEPTH_TEST);
  gl.useProgram(this.bg.p);
  gl.uniform2f(this.bg.u.u_res, W, H);
  gl.uniform3f(this.bg.u.u_cam, cam.zoom, cam.x, cam.y);
  gl.uniform3f(this.bg.u.u_grout, grout[0] / 255, grout[1] / 255, grout[2] / 255);
  gl.disable(gl.BLEND);
  gl.bindVertexArray(this.bgVao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  if (!n) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, this.ib);
  gl.bufferData(gl.ARRAY_BUFFER, this.data.subarray(0, n * STRIDE), gl.DYNAMIC_DRAW);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(this.tile.p);
  const u = this.tile.u;
  gl.uniform2f(u.u_res, W, H);
  gl.uniform3f(u.u_cam, cam.zoom, cam.x, cam.y);
  gl.uniform3f(u.u_light, -0.5, -0.72, 0.75);
  gl.bindVertexArray(this.vao);
  gl.uniform1f(u.u_shadowPass, 1);
  gl.uniform1f(u.u_shadowAlpha, 0.55);
  gl.uniform2f(u.u_shadowOff, 1.1, 1.7);
  gl.uniform1f(u.u_expand, 1.2);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
  gl.uniform1f(u.u_shadowPass, 0);
  gl.uniform2f(u.u_shadowOff, 0, 0);
  gl.uniform1f(u.u_expand, 0);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
  gl.bindVertexArray(null);
 }
}
