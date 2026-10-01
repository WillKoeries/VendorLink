/**
 * About page
 * - 3D "vendor network" in the hero (Three.js), which you can drag to rotate
 * - Tilt effect on the story photo (only on devices with a mouse)
 * If Three.js can't load, the hero simply shows its gradient background.
 */

document.addEventListener('DOMContentLoaded', () => {
  startNetworkAnimation();
  setupTiltCard();
});

function startNetworkAnimation() {
  const container = document.getElementById('threeCanvasContainer');
  if (!container || !window.THREE) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.z = 180;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Wireframe globe
  const globe = new THREE.Mesh(
    new THREE.IcosahedronGeometry(75, 2),
    new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.28 })
  );
  scene.add(globe);

  // Floating points around it
  const count = 180;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < positions.length; i++) positions[i] = (Math.random() - 0.5) * 260;
  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(pointsGeometry,
    new THREE.PointsMaterial({ color: 0x60a5fa, size: 2.8, transparent: true, opacity: 0.8 }));
  scene.add(points);

  // Drag to rotate (mouse and touch)
  let dragging = false;
  let last = { x: 0, y: 0 };
  container.addEventListener('pointerdown', (e) => {
    dragging = true;
    last = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    globe.rotation.y += (e.clientX - last.x) * 0.006;
    globe.rotation.x += (e.clientY - last.y) * 0.006;
    points.rotation.y += (e.clientX - last.x) * 0.004;
    last = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  function animate() {
    requestAnimationFrame(animate);
    if (!reduceMotion) {
      globe.rotation.y += 0.0025;
      globe.rotation.x += 0.001;
      points.rotation.y -= 0.0015;
    }
    renderer.render(scene, camera);
  }
  animate();

  document.getElementById('canvasHint').hidden = false;
}

function setupTiltCard() {
  const card = document.getElementById('storyTiltCard');
  if (!card || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = -(y / (rect.height / 2)) * 10;
    const rotateY = (x / (rect.width / 2)) * 10;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
}
