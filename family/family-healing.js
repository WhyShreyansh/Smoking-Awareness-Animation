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
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = height * 0.36;
  group.add(body);

  const headGeo = new THREE.SphereGeometry(height * 0.13, 20, 20);
  const head = new THREE.Mesh(headGeo, bodyMat.clone());
  head.position.y = height * 0.78;
  group.add(head);

  const halo = glowSprite(glowColor, glowSize, 0);
  halo.position.y = height * 0.45;
  group.add(halo);

  group.userData = { body, head, halo, baseHeight: height };
  return group;
}

const family = [
  buildFigure(2.0, 0xffb37a, 2.4),  // parent (the smoker)
  buildFigure(1.85, 0xffcf9e, 2.2), // parent
  buildFigure(1.05, 0xfff0d9, 1.6), // child
  buildFigure(1.7, 0xe9c9a3, 2.0),  // elder
];

const familyStartX = [-1.9, -0.6, 2.0, 3.1];
const familyGatherX = [-0.75, -0.25, 0.35, 0.9];

family.forEach((fig, i) => {
  fig.position.set(familyStartX[i], -1.4, -1.5);
  scene.add(fig);
});

// Park elements

const parkGroup = new THREE.Group();
parkGroup.visible = true;
scene.add(parkGroup);

function buildTree(x, z, scale) {
  const t = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, transparent: true, opacity: 0 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x4b5a3a, transparent: true, opacity: 0 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.6, 8), trunkMat);
  trunk.position.y = 0.3;
  const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 10), foliageMat);
  foliage.position.y = 1.15;

  t.add(trunk, foliage);
  t.position.set(x, -1.6, z);
  t.scale.setScalar(scale);
  t.userData = { trunkMat, foliageMat };
  return t;
}
const trees = [
  buildTree(-4.2, -3, 1.3),
  buildTree(-3.1, -4.5, 0.9),
  buildTree(4.0, -3.4, 1.4),
  buildTree(3.0, -5, 1.0),
  buildTree(-5.4, -5.5, 1.1),
];
trees.forEach((t) => parkGroup.add(t));

function buildWing(color) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.18, 0.16, 0, 0.3);
  shape.quadraticCurveTo(-0.18, 0.16, 0, 0);
  const geo = new THREE.ShapeGeometry(shape);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geo, mat);
}
function buildBird() {
  const bird = new THREE.Group();
  const left = buildWing(0x2a2a2a);
  const right = buildWing(0x2a2a2a);
  right.rotation.y = Math.PI;
  bird.add(left, right);
  bird.userData = { left, right, mats: [left.material, right.material] };
  return bird;
}

const birds = [];
for (let i = 0; i < 5; i++) {
  const b = buildBird();
  b.position.set(-6 + Math.random() * 12, 2 + Math.random() * 1.5, -4 - Math.random() * 3);
  b.userData.phase = Math.random() * Math.PI * 2;
  b.userData.speed = 0.25 + Math.random() * 0.15;
  parkGroup.add(b);
  birds.push(b);
}