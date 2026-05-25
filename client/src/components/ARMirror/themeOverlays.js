import * as THREE from 'three';

function hex(color) {
  return new THREE.Color(color);
}

export function createThemeOverlay(theme) {
  const group = new THREE.Group();
  const overlay = theme.overlay;

  switch (overlay.type) {
    case 'power-rangers':
      buildPowerRangersOverlay(group, overlay);
      break;
    case 'animal-party':
      buildAnimalPartyOverlay(group, overlay);
      break;
    case 'galactic-squad':
      buildGalacticOverlay(group, overlay);
      break;
    default:
      break;
  }

  return group;
}

function buildPowerRangersOverlay(group, overlay) {
  const helmetMat = new THREE.MeshStandardMaterial({
    color: hex(overlay.helmetColor),
    metalness: 0.6,
    roughness: 0.3,
    emissive: hex(overlay.helmetColor),
    emissiveIntensity: 0.15,
  });

  const visorMat = new THREE.MeshStandardMaterial({
    color: hex(overlay.visorColor),
    metalness: 0.9,
    roughness: 0.1,
    emissive: hex(overlay.visorColor),
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.85,
  });

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), helmetMat);
  helmet.scale.set(1.1, 1.05, 0.85);
  helmet.name = 'helmet';

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.3), visorMat);
  visor.position.set(0, -0.05, 0.55);
  visor.name = 'visor';

  const crest = new THREE.Mesh(
    new THREE.ConeGeometry(0.15, 0.5, 4),
    helmetMat.clone()
  );
  crest.position.set(0, 0.85, 0);
  crest.rotation.z = Math.PI / 4;
  crest.name = 'crest';

  group.add(helmet, visor, crest);

  overlay.suitColors.forEach((color, i) => {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.6, 0.02),
      new THREE.MeshStandardMaterial({
        color: hex(color),
        emissive: hex(color),
        emissiveIntensity: 0.3,
      })
    );
    stripe.position.set(-0.4 + i * 0.2, -1.2, 0);
    stripe.name = `stripe-${i}`;
    group.add(stripe);
  });
}

function buildAnimalPartyOverlay(group, overlay) {
  const earMat = new THREE.MeshStandardMaterial({
    color: hex(overlay.earColor),
    roughness: 0.7,
  });

  const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 16), earMat);
  leftEar.position.set(-0.55, 0.7, 0);
  leftEar.rotation.z = 0.3;
  leftEar.name = 'leftEar';

  const rightEar = leftEar.clone();
  rightEar.position.set(0.55, 0.7, 0);
  rightEar.rotation.z = -0.3;
  rightEar.name = 'rightEar';

  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 16),
    new THREE.MeshStandardMaterial({ color: hex(overlay.noseColor) })
  );
  nose.position.set(0, -0.15, 0.7);
  nose.name = 'nose';

  const whiskerMat = new THREE.LineBasicMaterial({ color: hex(overlay.whiskerColor) });
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const points = [
        new THREE.Vector3(side * 0.15, -0.1 + i * 0.08, 0.65),
        new THREE.Vector3(side * 0.55, -0.05 + i * 0.1, 0.6),
      ];
      const whisker = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        whiskerMat
      );
      group.add(whisker);
    }
  }

  group.add(leftEar, rightEar, nose);
}

function buildGalacticOverlay(group, overlay) {
  const helmetMat = new THREE.MeshStandardMaterial({
    color: hex(overlay.helmetColor),
    metalness: 0.95,
    roughness: 0.05,
    emissive: hex(overlay.glowColor),
    emissiveIntensity: 0.2,
  });

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.65),
    helmetMat
  );
  helmet.name = 'helmet';

  const visor = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.08, 8, 32),
    new THREE.MeshStandardMaterial({
      color: hex(overlay.visorColor),
      emissive: hex(overlay.glowColor),
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.7,
    })
  );
  visor.position.set(0, 0, 0.5);
  visor.name = 'visor';

  const antennaMat = new THREE.MeshStandardMaterial({
    color: hex(overlay.glowColor),
    emissive: hex(overlay.glowColor),
    emissiveIntensity: 1,
  });

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), antennaMat);
  antenna.position.set(0, 1.1, 0);
  antenna.name = 'antenna';

  const antennaBall = new THREE.Mesh(new THREE.SphereGeometry(0.08), antennaMat);
  antennaBall.position.set(0, 1.45, 0);

  group.add(helmet, visor, antenna, antennaBall);
}

export function updateOverlayTransform(group, face, videoWidth, videoHeight) {
  if (!face || !group) return;

  const { cx, cy, faceWidth, faceHeight, roll } = face;

  const x = (cx - 0.5) * videoWidth;
  const y = -(cy - 0.5) * videoHeight;
  const scale = faceWidth * videoWidth * 1.8;

  group.position.set(x, y, 0);
  group.rotation.z = roll;
  group.scale.setScalar(scale);
}

export function createThemedBackground(theme, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);

  switch (theme.overlay.type) {
    case 'power-rangers':
      gradient.addColorStop(0, '#1a0505');
      gradient.addColorStop(0.5, '#ff4500');
      gradient.addColorStop(1, '#ffd700');
      break;
    case 'animal-party':
      gradient.addColorStop(0, '#1b4332');
      gradient.addColorStop(0.5, '#4caf50');
      gradient.addColorStop(1, '#ffd54f');
      break;
    case 'galactic-squad':
      gradient.addColorStop(0, '#0a0014');
      gradient.addColorStop(0.5, '#7c4dff');
      gradient.addColorStop(1, '#00e5ff');
      break;
    default:
      gradient.addColorStop(0, '#0d0221');
      gradient.addColorStop(1, '#2d1b69');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas;
}

export function applySegmentationMask(
  ctx,
  video,
  mask,
  backgroundCanvas,
  width,
  height
) {
  if (!mask) {
    ctx.drawImage(video, 0, 0, width, height);
    return;
  }

  const maskData = mask.getAsUint8Array();
  const maskWidth = mask.width;
  const maskHeight = mask.height;

  ctx.drawImage(backgroundCanvas, 0, 0, width, height);

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const offCtx = offscreen.getContext('2d');
  offCtx.drawImage(video, 0, 0, width, height);
  const imageData = offCtx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const mx = Math.floor((x / width) * maskWidth);
      const my = Math.floor((y / height) * maskHeight);
      const maskIndex = my * maskWidth + mx;
      if (maskData[maskIndex] === 0) {
        const i = (y * width + x) * 4;
        pixels[i + 3] = 0;
      }
    }
  }

  offCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(offscreen, 0, 0);
}
