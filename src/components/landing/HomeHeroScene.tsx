import { useEffect, useRef } from "react";

const vertexShader = `
  uniform float uTime;
  uniform float uPhase;
  uniform float uAmplitude;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    vec3 transformed = position;
    float longWave = sin((position.x * 0.88) + (uTime * 0.38) + uPhase);
    float crossWave = cos((position.y * 2.0) - (uTime * 0.2) + (uPhase * 0.7));
    float wave = (longWave * 0.18) + (crossWave * 0.06);

    transformed.z += wave * uAmplitude;
    transformed.y += sin((position.x * 0.54) + (uTime * 0.16) + uPhase) * 0.08 * uAmplitude;
    vUv = uv;
    vWave = wave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    float edgeY = smoothstep(0.0, 0.18, vUv.y) * smoothstep(0.0, 0.18, 1.0 - vUv.y);
    float edgeX = smoothstep(0.0, 0.08, vUv.x) * smoothstep(0.0, 0.08, 1.0 - vUv.x);
    float depthShade = clamp(0.9 + (vWave * 0.9), 0.7, 1.08);
    float highlight = pow(0.5 + (0.5 * sin(((vUv.x + vUv.y) * 8.0) + (vWave * 13.0))), 8.0);
    vec3 color = mix(uColorA, uColorB, clamp(vUv.x + (vWave * 0.45), 0.0, 1.0));
    color = mix(color * depthShade, vec3(1.0), highlight * 0.18);

    gl_FragColor = vec4(color, edgeX * edgeY * (0.88 + highlight * 0.12) * uOpacity);
  }
`;

export function HomeHeroScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let active = true;
    let cleanupScene = () => undefined;
    mount.dataset.sceneState = "loading";

    const initializeScene = async () => {
      const THREE = await import("three");
      if (!active) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const isCompact = window.matchMedia("(max-width: 640px)").matches;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
      const root = new THREE.Group();
      const ribbonGroup = new THREE.Group();
      const roseGroup = new THREE.Group();
      const heartGroup = new THREE.Group();
      const lineGroup = new THREE.Group();
      const disposableGeometries: Array<InstanceType<typeof THREE.BufferGeometry>> = [];
      const disposableMaterials: Array<InstanceType<typeof THREE.Material>> = [];

      camera.position.set(0, 0, isCompact ? 9.2 : 8);
      scene.add(root);
      root.add(ribbonGroup, roseGroup, heartGroup, lineGroup);
      scene.add(new THREE.AmbientLight(0xfff4fa, 1.35));

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
      keyLight.position.set(-4.4, 5.4, 7);
      scene.add(keyLight);

      const roseLight = new THREE.DirectionalLight(0xff8ab6, 1.05);
      roseLight.position.set(4.6, -2.4, 5.8);
      scene.add(roseLight);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !isCompact,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0xffffff, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.25 : 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.className = "home-hero-canvas";
      renderer.domElement.setAttribute("aria-hidden", "true");
      mount.appendChild(renderer.domElement);

      const ribbonConfigs = [
        {
          colors: [0xff7aa8, 0xffd7e8],
          opacity: 0.38,
          position: [isCompact ? -1.9 : -3.5, isCompact ? 2.18 : 1.85, -0.58],
          rotation: [-0.36, 0.34, -0.42],
          scale: isCompact ? 0.84 : 1.18,
          phase: 0.4,
          amplitude: 0.95,
        },
        {
          colors: [0xfda4af, 0xc4b5fd],
          opacity: 0.34,
          position: [isCompact ? 1.75 : 3.15, isCompact ? -2.18 : -1.72, -0.42],
          rotation: [0.24, -0.28, 2.68],
          scale: isCompact ? 0.9 : 1.18,
          phase: 2.3,
          amplitude: 0.88,
        },
        {
          colors: [0xffffff, 0xffe4ef],
          opacity: 0.36,
          position: [0, isCompact ? 0.08 : 0, -1.9],
          rotation: [0.16, -0.04, -0.07],
          scale: isCompact ? 1.08 : 1.76,
          phase: 4.5,
          amplitude: 0.55,
        },
      ] as const;

      const ribbonMaterials: Array<InstanceType<typeof THREE.ShaderMaterial>> = [];

      ribbonConfigs.forEach((config) => {
        const geometry = new THREE.PlaneGeometry(7.4, 1.7, isCompact ? 50 : 86, 22);
        const material = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: reducedMotion ? 1.4 : 0 },
            uPhase: { value: config.phase },
            uAmplitude: { value: config.amplitude },
            uColorA: { value: new THREE.Color(config.colors[0]) },
            uColorB: { value: new THREE.Color(config.colors[1]) },
            uOpacity: { value: config.opacity },
          },
          vertexShader,
          fragmentShader,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const ribbon = new THREE.Mesh(geometry, material);

        ribbon.position.set(config.position[0], config.position[1], config.position[2]);
        ribbon.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);
        ribbon.scale.setScalar(config.scale);
        ribbonGroup.add(ribbon);
        ribbonMaterials.push(material);
        disposableGeometries.push(geometry);
        disposableMaterials.push(material);
      });

      const petalShape = new THREE.Shape();
      petalShape.moveTo(0, 0.72);
      petalShape.bezierCurveTo(0.48, 0.4, 0.5, -0.22, 0, -0.78);
      petalShape.bezierCurveTo(-0.5, -0.22, -0.48, 0.4, 0, 0.72);

      const petalGeometry = new THREE.ShapeGeometry(petalShape, isCompact ? 18 : 28);
      const petalMaterials = [0xfb7185, 0xec4899, 0xfbcfe8, 0xc084fc].map(
        (color, index) =>
          new THREE.MeshStandardMaterial({
            color,
            roughness: 0.54,
            metalness: 0.02,
            transparent: true,
            opacity: index === 2 ? 0.5 : 0.66,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
      );
      disposableGeometries.push(petalGeometry);
      petalMaterials.forEach((material) => disposableMaterials.push(material));

      const petalCount = isCompact ? 22 : 42;
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      for (let index = 0; index < petalCount; index += 1) {
        const angle = index * goldenAngle;
        const radius = 0.12 + Math.sqrt(index) * (isCompact ? 0.095 : 0.105);
        const mesh = new THREE.Mesh(petalGeometry, petalMaterials[index % petalMaterials.length]);
        const baseX = Math.cos(angle) * radius;
        const baseY = Math.sin(angle) * radius * 0.72;
        const baseZ = Math.sin(index * 0.9) * 0.12;

        mesh.position.set(baseX, baseY, baseZ);
        mesh.rotation.set(
          0.46 + Math.sin(angle) * 0.34,
          Math.cos(angle) * 0.34,
          angle + Math.PI / 2,
        );
        mesh.scale.set(0.22 + index * 0.006, 0.34 + index * 0.008, 1);
        mesh.userData = { baseX, baseY, baseZ, phase: index * 0.38 };
        roseGroup.add(mesh);
      }

      roseGroup.position.set(isCompact ? 1.35 : -3.25, isCompact ? 2.18 : 1.78, -0.18);
      roseGroup.rotation.set(-0.18, 0.22, 0.16);
      roseGroup.scale.setScalar(isCompact ? 0.76 : 1.08);

      const createHeartPoints = (scale: number) => {
        const points: InstanceType<typeof THREE.Vector3>[] = [];
        for (let step = 0; step < 132; step += 1) {
          const t = (step / 132) * Math.PI * 2;
          const sin = Math.sin(t);
          const x = Math.pow(sin, 3);
          const y =
            (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 -
            0.18;
          points.push(new THREE.Vector3(x * scale, y * scale, 0));
        }
        return points;
      };

      const heartScale = isCompact ? 1.18 : 1.58;
      const heartPoints = createHeartPoints(heartScale);
      const heartCurve = new THREE.CatmullRomCurve3(heartPoints, true, "centripetal", 0.5);
      const heartGeometry = new THREE.TubeGeometry(
        heartCurve,
        isCompact ? 120 : 180,
        isCompact ? 0.016 : 0.022,
        10,
        true,
      );
      const heartMaterial = new THREE.MeshBasicMaterial({
        color: 0xe11d74,
        transparent: true,
        opacity: isCompact ? 0.22 : 0.26,
        depthWrite: false,
      });
      const heartMesh = new THREE.Mesh(heartGeometry, heartMaterial);
      heartMesh.position.set(isCompact ? -0.05 : 2.65, isCompact ? -1.58 : -1.32, -0.05);
      heartMesh.rotation.set(0.2, isCompact ? -0.02 : -0.18, isCompact ? 0.08 : -0.1);
      heartGroup.add(heartMesh);
      disposableGeometries.push(heartGeometry);
      disposableMaterials.push(heartMaterial);

      let seed = 7283;
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };

      const heartParticleCount = isCompact ? 42 : 84;
      const heartParticlePositions = new Float32Array(heartParticleCount * 3);
      for (let index = 0; index < heartParticleCount; index += 1) {
        const point = heartPoints[index % heartPoints.length];
        heartParticlePositions[index * 3] = point.x + (random() - 0.5) * 0.22;
        heartParticlePositions[index * 3 + 1] = point.y + (random() - 0.5) * 0.22;
        heartParticlePositions[index * 3 + 2] = (random() - 0.5) * 0.36;
      }

      const heartParticleGeometry = new THREE.BufferGeometry();
      heartParticleGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(heartParticlePositions, 3),
      );
      const heartParticleMaterial = new THREE.PointsMaterial({
        color: 0xf472b6,
        size: isCompact ? 0.036 : 0.032,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      });
      const heartParticles = new THREE.Points(heartParticleGeometry, heartParticleMaterial);
      heartParticles.position.copy(heartMesh.position);
      heartParticles.rotation.copy(heartMesh.rotation);
      heartGroup.add(heartParticles);
      disposableGeometries.push(heartParticleGeometry);
      disposableMaterials.push(heartParticleMaterial);

      const lineConfigs = [
        {
          color: 0xf472b6,
          opacity: 0.2,
          points: [
            [-7.2, 2.44, -0.2],
            [-4.6, 2.82, 0.1],
            [-1.2, 2.04, -0.42],
            [2.4, 2.76, -0.16],
            [7.2, 1.86, 0.08],
          ],
        },
        {
          color: 0x8b5cf6,
          opacity: 0.16,
          points: [
            [-7.2, -1.92, -0.42],
            [-3.9, -2.7, 0.08],
            [-0.3, -1.62, -0.34],
            [3.4, -2.64, 0.18],
            [7.2, -1.82, -0.25],
          ],
        },
      ] as const;

      lineConfigs.forEach((config) => {
        const curve = new THREE.CatmullRomCurve3(
          config.points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        );
        const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(180));
        const material = new THREE.LineBasicMaterial({
          color: config.color,
          transparent: true,
          opacity: config.opacity,
          depthWrite: false,
        });
        lineGroup.add(new THREE.Line(geometry, material));
        disposableGeometries.push(geometry);
        disposableMaterials.push(material);
      });

      const particleCount = isCompact ? 58 : 128;
      const particlePositions = new Float32Array(particleCount * 3);

      for (let index = 0; index < particleCount; index += 1) {
        particlePositions[index * 3] = (random() - 0.5) * 14;
        particlePositions[index * 3 + 1] = (random() - 0.5) * 7.4;
        particlePositions[index * 3 + 2] = (random() - 0.5) * 4 - 1;
      }

      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
      const particleMaterial = new THREE.PointsMaterial({
        color: 0xbe185d,
        size: isCompact ? 0.032 : 0.026,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      root.add(particles);
      disposableGeometries.push(particleGeometry);
      disposableMaterials.push(particleMaterial);

      let frameId = 0;
      let isVisible = true;
      let targetX = 0;
      let targetY = 0;
      const startedAt = performance.now();

      const resize = () => {
        const bounds = mount.getBoundingClientRect();
        if (bounds.width === 0 || bounds.height === 0) return;
        camera.aspect = bounds.width / bounds.height;
        camera.updateProjectionMatrix();
        renderer.setSize(bounds.width, bounds.height, false);
      };

      const render = (timestamp: number) => {
        if (!active) return;
        const elapsed = reducedMotion ? 1.4 : (timestamp - startedAt) / 1000;

        ribbonMaterials.forEach((material, index) => {
          material.uniforms.uTime.value = elapsed * (1 - index * 0.12);
        });

        root.rotation.x += (targetY * 0.04 - root.rotation.x) * 0.035;
        root.rotation.y += (targetX * 0.065 - root.rotation.y) * 0.035;
        ribbonGroup.rotation.z = Math.sin(elapsed * 0.1) * 0.016;
        roseGroup.rotation.z = 0.16 + Math.sin(elapsed * 0.18) * 0.08;
        roseGroup.position.y +=
          (Math.sin(elapsed * 0.34) * 0.055 + (isCompact ? 2.18 : 1.78) - roseGroup.position.y) *
          0.04;
        heartGroup.rotation.z = Math.sin(elapsed * 0.14) * 0.025;
        heartGroup.position.y = Math.sin(elapsed * 0.2) * 0.04;
        lineGroup.position.x = Math.sin(elapsed * 0.14) * 0.06;
        particles.rotation.z = elapsed * 0.004;
        heartParticles.rotation.z = heartMesh.rotation.z + Math.sin(elapsed * 0.22) * 0.035;

        roseGroup.children.forEach((child) => {
          const { baseX, baseY, baseZ, phase } = child.userData as {
            baseX?: number;
            baseY?: number;
            baseZ?: number;
            phase?: number;
          };
          child.position.x = (baseX ?? 0) + Math.sin(elapsed * 0.32 + (phase ?? 0)) * 0.018;
          child.position.y = (baseY ?? 0) + Math.cos(elapsed * 0.24 + (phase ?? 0)) * 0.018;
          child.position.z = (baseZ ?? 0) + Math.sin(elapsed * 0.26 + (phase ?? 0)) * 0.05;
        });

        renderer.render(scene, camera);
        mount.dataset.sceneState = "ready";

        if (!reducedMotion && isVisible) {
          frameId = window.requestAnimationFrame(render);
        }
      };

      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        const bounds = mount.getBoundingClientRect();
        const isInside =
          event.clientX >= bounds.left &&
          event.clientX <= bounds.right &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom;

        targetX = isInside ? ((event.clientX - bounds.left) / bounds.width - 0.5) * 2 : 0;
        targetY = isInside ? ((event.clientY - bounds.top) / bounds.height - 0.5) * 2 : 0;
      };

      const resizeObserver = new ResizeObserver(resize);
      const intersectionObserver = new IntersectionObserver(([entry]) => {
        const nextVisible = entry.isIntersecting;
        if (nextVisible && !isVisible && !reducedMotion) {
          isVisible = true;
          frameId = window.requestAnimationFrame(render);
        } else {
          isVisible = nextVisible;
          if (!nextVisible) window.cancelAnimationFrame(frameId);
        }
      });

      resizeObserver.observe(mount);
      intersectionObserver.observe(mount);
      if (!reducedMotion) window.addEventListener("pointermove", onPointerMove, { passive: true });
      resize();
      frameId = window.requestAnimationFrame(render);

      cleanupScene = () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("pointermove", onPointerMove);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        disposableGeometries.forEach((geometry) => geometry.dispose());
        disposableMaterials.forEach((material) => material.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
    };

    initializeScene().catch(() => {
      if (active) mount.dataset.sceneState = "fallback";
    });

    return () => {
      active = false;
      cleanupScene();
    };
  }, []);

  return <div ref={mountRef} className="home-hero-3d" aria-hidden="true" />;
}
