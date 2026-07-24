gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Renderer / scene / camera

const canvas = document.getElementById("scene-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.2, 7);

const ambient = new THREE.AmbientLight(0x554433, 0.6);
scene.add(ambient);

const keyLight = new THREE.PointLight(0xffb37a, 1.2, 30);
keyLight.position.set(2, 3, 5);
scene.add(keyLight);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


// Soft radial-glow sprite texture

function makeGlowTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
const glowTex = makeGlowTexture();

function glowSprite(color, size, opacity) {
  const mat = new THREE.SpriteMaterial({
    map: glowTex,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}

// Smoke - light particle system 

const PARTICLE_COUNT = 260;
const particleGeo = new THREE.BufferGeometry();
const basePositions = new Float32Array(PARTICLE_COUNT * 3);
const phases = new Float32Array(PARTICLE_COUNT);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * 2.4;
  basePositions[i * 3] = Math.cos(angle) * radius * 0.6;
  basePositions[i * 3 + 1] = Math.random() * 2.5 - 1.2;
  basePositions[i * 3 + 2] = Math.sin(angle) * radius * 0.6 - 1;
  phases[i] = Math.random() * Math.PI * 2;
}
particleGeo.setAttribute("position", new THREE.BufferAttribute(basePositions.slice(), 3));

const particleMat = new THREE.PointsMaterial({
  size: 0.045,
  color: 0x8a8a8a,
  transparent: true,
  opacity: 0.55,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

// the single glowing "thread" point
const threadCore = glowSprite(0xff6b3d, 0.6, 1);
threadCore.position.set(0, -0.6, 0.5);
scene.add(threadCore);

const threadHalo = glowSprite(0xff6b3d, 1.6, 0.5);
threadHalo.position.copy(threadCore.position);
scene.add(threadHalo);


// Family light-forms

function buildFigure(height, glowColor, glowSize) {
  const group = new THREE.Group();

  const bodyGeo = new THREE.CylinderGeometry(height * 0.09, height * 0.14, height * 0.72, 16, 1, true);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2a241d,
    emissive: new THREE.Color(glowColor),
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0,
    roughness: 0.6,
  });