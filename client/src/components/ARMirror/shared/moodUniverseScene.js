import * as THREE from 'three';

const KALEIDOSCOPE_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const KALEIDOSCOPE_FRAG = `
  uniform float uTime;
  uniform float uSmile;
  uniform float uFrown;
  uniform float uSurprise;
  uniform vec2 uResolution;
  varying vec2 vUv;

  vec3 palette(float t) {
    vec3 warm = vec3(1.0, 0.75, 0.2);
    vec3 cool = vec3(0.2, 0.4, 0.9);
    vec3 storm = vec3(0.15, 0.05, 0.2);
    vec3 galaxy = vec3(0.6, 0.2, 1.0);
    vec3 c = mix(storm, cool, uFrown * 0.5);
    c = mix(c, warm, uSmile);
    c = mix(c, galaxy, uSurprise * 0.8);
    return c * (0.5 + 0.5 * sin(t * vec3(1.0, 1.3, 1.7)));
  }

  void main() {
    vec2 uv = vUv - 0.5;
    uv.x *= uResolution.x / uResolution.y;
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);

    float segments = 6.0 + uSmile * 4.0 + uSurprise * 6.0;
    angle = mod(angle, 6.28318 / segments);
    angle = abs(angle - 3.14159 / segments);

    vec2 kuv = vec2(cos(angle), sin(angle)) * radius;
    kuv += uTime * 0.03 * (1.0 + uSmile);

    float pattern = sin(kuv.x * 20.0 + uTime * 0.5) * sin(kuv.y * 20.0 - uTime * 0.3);
    pattern += sin(radius * 30.0 - uTime * 0.8 + uSurprise * 5.0) * 0.5;
    pattern = smoothstep(-0.2, 0.8, pattern);

    float turbulence = sin(radius * 15.0 + uTime + uFrown * 8.0) * uFrown * 0.4;
    radius += turbulence;

    vec3 col = palette(radius * 3.0 + uTime * 0.2 + pattern);
    col *= pattern * (1.0 - radius * 0.8);
    col += uSmile * 0.3 * vec3(1.0, 0.85, 0.3) * smoothstep(0.3, 0.0, radius);
    col += uSurprise * 0.5 * vec3(0.8, 0.5, 1.0) * smoothstep(0.5, 0.0, abs(sin(uTime * 3.0)));

    float vignette = smoothstep(1.2, 0.2, radius * 2.0);
    gl_FragColor = vec4(col * vignette, 1.0);
  }
`;

export function createMoodUniverseScene(width, height) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime: { value: 0 },
    uSmile: { value: 0 },
    uFrown: { value: 0 },
    uSurprise: { value: 0 },
    uResolution: { value: new THREE.Vector2(width, height) },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: KALEIDOSCOPE_VERT,
    fragmentShader: KALEIDOSCOPE_FRAG,
    uniforms,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(quad);

  const particleCount = 800;
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * width;
    positions[i * 3 + 1] = (Math.random() - 0.5) * height;
    positions[i * 3 + 2] = 0;
    velocities.push({
      x: (Math.random() - 0.5) * 0.5,
      y: (Math.random() - 0.5) * 0.5,
    });
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: 0xffd54f,
    size: 3,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);

  return {
    renderer,
    scene,
    camera,
    uniforms,
    particles,
    velocities,
    particleMat,
    update(emotion, time) {
      uniforms.uTime.value = time * 0.001;
      uniforms.uSmile.value += (emotion.smile - uniforms.uSmile.value) * 0.08;
      uniforms.uFrown.value += (emotion.frown - uniforms.uFrown.value) * 0.08;
      uniforms.uSurprise.value += (emotion.surprise - uniforms.uSurprise.value) * 0.12;

      const pos = particleGeo.attributes.position.array;
      const burst = emotion.surprise > 0.6 ? 3 + emotion.surprise * 8 : 1;
      const expand = 1 + emotion.smile * 0.5;

      for (let i = 0; i < particleCount; i++) {
        const cx = width / 2;
        const cy = height / 2;
        const dx = pos[i * 3] - (Math.random() - 0.5) * width * 0.1;
        const dy = pos[i * 3 + 1] - (Math.random() - 0.5) * height * 0.1;

        velocities[i].x += (Math.random() - 0.5) * 0.02 * burst;
        velocities[i].y += (Math.random() - 0.5) * 0.02 * burst;

        pos[i * 3] += velocities[i].x * expand;
        pos[i * 3 + 1] += velocities[i].y * expand;

        if (Math.abs(pos[i * 3]) > width * 0.6) velocities[i].x *= -0.8;
        if (Math.abs(pos[i * 3 + 1]) > height * 0.6) velocities[i].y *= -0.8;
      }
      particleGeo.attributes.position.needsUpdate = true;

      const smileColor = new THREE.Color(0xffd54f);
      const frownColor = new THREE.Color(0x4a148c);
      const surpriseColor = new THREE.Color(0xe040fb);
      particleMat.color.lerpColors(frownColor, smileColor, emotion.smile);
      particleMat.color.lerp(surpriseColor, emotion.surprise * 0.6);
      particleMat.size = 2 + emotion.smile * 4 + emotion.surprise * 6;

      renderer.render(scene, camera);
    },
    dispose() {
      renderer.dispose();
      material.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    },
  };
}

export function drawMoodLabel(ctx, emotion, width) {
  let mood = 'NEUTRAL';
  let color = '#aaa';
  if (emotion.smile > 0.45 && emotion.smile >= emotion.frown) {
    mood = 'SUNBURST';
    color = '#ffd54f';
  } else if (emotion.frown > 0.35) {
    mood = 'STORM';
    color = '#ef5350';
  } else if (emotion.surprise > 0.4) {
    mood = 'GALAXY BURST';
    color = '#e040fb';
  }

  ctx.save();
  ctx.font = '600 13px Montserrat, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillText(mood, width / 2, 28);
  ctx.restore();
}
