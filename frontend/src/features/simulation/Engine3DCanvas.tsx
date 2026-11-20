import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Eye, Layers, RotateCcw } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const Engine3DCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    currentFrame,
    controls,
    isPlaying,
    playbackRate,
    faultInjection,
  } = useSimulation();

  // Telemetry references for the animation loop
  const raw = currentFrame?.raw_measurements;
  const targetRpmRef = useRef<number>(raw?.rpm || 2400);
  const targetThrRef = useRef<number>((controls?.throttle_pct || 70) / 100);
  const targetChtRef = useRef<number>(raw?.cht || 140);
  const targetEgtRef = useRef<number>(raw?.egt || 750);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const playbackRateRef = useRef<number>(playbackRate);
  const faultRef = useRef<{ type: string; cyl: number }>({ type: 'normal', cyl: 2 });

  // Update refs when telemetry changes
  useEffect(() => {
    targetRpmRef.current = raw?.rpm || 2400;
    targetThrRef.current = (controls?.throttle_pct || 70) / 100;
    targetChtRef.current = raw?.cht || 140;
    targetEgtRef.current = raw?.egt || 750;
    isPlayingRef.current = isPlaying;
    playbackRateRef.current = playbackRate;

    if (faultInjection.is_active) {
      const ft = faultInjection.fault_type;
      let mapped = 'normal';
      if (ft === 'combustion_irregularity') mapped = 'misfire';
      else if (ft === 'thermal_abnormality') mapped = 'overheat';
      else if (ft === 'efficiency_degradation') mapped = 'knock';
      else if (ft === 'sensor_bias' || ft === 'sensor_drift') mapped = 'lowOil';
      else mapped = 'misfire';
      faultRef.current = { type: mapped, cyl: 2 };
    } else {
      faultRef.current = { type: 'normal', cyl: 2 };
    }
  }, [raw, controls, isPlaying, playbackRate, faultInjection]);

  // View Presets state
  const [activePreset, setActivePreset] = useState<'3/4' | 'prop' | 'top' | 'turbo'>('3/4');
  const [isXRay, setIsXRay] = useState<boolean>(false);
  const [isExploded, setIsExploded] = useState<boolean>(false);

  // Callbacks passed to Three.js controls
  const setPresetRef = useRef<(preset: '3/4' | 'prop' | 'top' | 'turbo') => void>(() => {});
  const toggleXRayRef = useRef<() => void>(() => {});
  const toggleExplodeRef = useRef<() => void>(() => {});
  const resetCameraRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. SCENE & RENDERER SETUP
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 380;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070c18);

    // Camera setup - Centered focal distance
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    let camDist = 12.0;

    // Center focal point on engine geometric center
    const ENGINE_CENTER = new THREE.Vector3(0.3, 0.0, 0.0);
    camera.position.set(camDist * 0.38, 2.5, camDist * 0.92);
    camera.lookAt(ENGINE_CENTER);

    // 2. STUDIO 3-POINT LIGHTING
    const hemiLight = new THREE.HemisphereLight(0xd0e4ff, 0x182030, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(6, 10, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.camera.left = -8; keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;  keyLight.shadow.camera.bottom = -8;
    scene.add(keyLight);

    const cyanFill = new THREE.DirectionalLight(0x00d2ff, 0.65);
    cyanFill.position.set(-8, 3, -4);
    scene.add(cyanFill);

    const rimLight = new THREE.DirectionalLight(0xffaa55, 0.9);
    rimLight.position.set(1, 5, -10);
    scene.add(rimLight);

    // 3. ROOT ENGINE GROUP (Centered at (0, 0, 0))
    const root = new THREE.Group();
    root.position.set(0, 0, 0);
    root.rotation.set(0.42, -0.28, 0);
    scene.add(root);

    // Reusable PBR Materials
    const M = (color: number, metalness = 0.75, roughness = 0.3) =>
      new THREE.MeshStandardMaterial({ color, metalness, roughness });

    const aluminumM = M(0xc8d5e5, 0.85, 0.22);
    const darkAlloyM = M(0x384456, 0.7, 0.35);
    const steelM = M(0xdfe7f2, 0.9, 0.18);
    const chromeM = M(0xf0f5ff, 0.95, 0.1);
    const titaniumM = M(0x8e9bb0, 0.8, 0.25);
    const carbonBladeM = M(0x1a212b, 0.4, 0.38);
    const goldBoltM = M(0xd8a84e, 0.85, 0.25);

    // 4. AERODYNAMIC AIRFOIL PROPELLER & SPINNER
    const propAssembly = new THREE.Group();
    propAssembly.position.x = 4.0;
    root.add(propAssembly);

    // Parabolic Ogive Spinner Cone
    const spinnerPoints: THREE.Vector2[] = [];
    const spinnerSegments = 32;
    const spinnerLength = 1.35;
    const spinnerRadius = 0.68;
    for (let i = 0; i <= spinnerSegments; i++) {
      const t = i / spinnerSegments;
      const x = (1 - t) * spinnerLength;
      const r = spinnerRadius * Math.pow(t, 0.65);
      spinnerPoints.push(new THREE.Vector2(r, x));
    }
    const spinnerGeo = new THREE.LatheGeometry(spinnerPoints, 48);
    const spinner = new THREE.Mesh(spinnerGeo, chromeM);
    spinner.rotation.z = -Math.PI / 2;
    spinner.position.x = 0.35;
    spinner.castShadow = true;
    propAssembly.add(spinner);

    // Spinner Backplate
    const backplate = new THREE.Mesh(new THREE.CylinderGeometry(0.69, 0.69, 0.12, 48), darkAlloyM);
    backplate.rotation.z = Math.PI / 2;
    backplate.position.x = 0.3;
    propAssembly.add(backplate);

    // Hub Body
    const hubBody = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.45, 36), aluminumM);
    hubBody.rotation.z = Math.PI / 2;
    hubBody.position.x = 0.1;
    propAssembly.add(hubBody);

    // Hub Retaining Bolts
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 12), goldBoltM);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(0.35, Math.cos(angle) * 0.38, Math.sin(angle) * 0.38);
      propAssembly.add(bolt);
    }

    // 3-Blade Aerodynamic Airfoil Blades
    function createAirfoilBlade() {
      const bladeGroup = new THREE.Group();
      const airfoil = new THREE.Shape();
      airfoil.moveTo(0, 0);
      airfoil.bezierCurveTo(0.04, 0.08, 0.25, 0.12, 0.60, 0.06);
      airfoil.bezierCurveTo(0.80, 0.03, 0.95, 0.01, 1.00, 0.00);
      airfoil.bezierCurveTo(0.85, -0.015, 0.40, -0.035, 0.15, -0.03);
      airfoil.bezierCurveTo(0.05, -0.025, 0.00, -0.01, 0, 0);

      const span = 2.45;
      const stations = 18;
      const geom = new THREE.BufferGeometry();
      const vertices: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      const shapePoints = airfoil.getPoints(24);
      const numPts = shapePoints.length;

      for (let s = 0; s <= stations; s++) {
        const t = s / stations;
        const y = 0.38 + t * span;
        let chordScale = 0.15;
        if (t < 0.2) chordScale = THREE.MathUtils.lerp(0.18, 0.38, t / 0.2);
        else chordScale = THREE.MathUtils.lerp(0.38, 0.12, (t - 0.2) / 0.8);

        const thickScale = THREE.MathUtils.lerp(0.8, 0.25, t);
        const twistRad = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(34, 13, t));
        const cosTw = Math.cos(twistRad);
        const sinTw = Math.sin(twistRad);
        const sweepZ = Math.pow(t, 2.2) * -0.15;

        for (let p = 0; p < numPts; p++) {
          const pt = shapePoints[p];
          const lx = (pt.x - 0.25) * chordScale;
          const lz = pt.y * chordScale * thickScale;
          const rx = lx * cosTw - lz * sinTw;
          const rz = lx * sinTw + lz * cosTw + sweepZ;
          vertices.push(rx, y, rz);
          uvs.push(p / numPts, t);
        }
      }

      for (let s = 0; s < stations; s++) {
        for (let p = 0; p < numPts - 1; p++) {
          const a = s * numPts + p;
          const b = (s + 1) * numPts + p;
          const c = (s + 1) * numPts + (p + 1);
          const d = s * numPts + (p + 1);
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      geom.setIndex(indices);
      geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geom.computeVertexNormals();

      const bladeMesh = new THREE.Mesh(geom, carbonBladeM);
      bladeMesh.castShadow = true;
      bladeMesh.receiveShadow = true;
      bladeGroup.add(bladeMesh);

      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.25, 24), aluminumM);
      cuff.position.y = 0.32;
      bladeGroup.add(cuff);

      const tip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.08, 0.25, 16),
        new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.4 })
      );
      tip.position.set(-0.02, 0.38 + span - 0.12, -0.12);
      bladeGroup.add(tip);

      return bladeGroup;
    }

    for (let i = 0; i < 3; i++) {
      const bladeHolder = new THREE.Group();
      bladeHolder.rotation.x = (i * Math.PI * 2) / 3;
      bladeHolder.add(createAirfoilBlade());
      propAssembly.add(bladeHolder);
    }

    // Reduction Gearbox Housing
    const gbox = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.74, 0.78, 48), darkAlloyM);
    gbox.rotation.z = Math.PI / 2;
    gbox.position.x = 2.75;
    root.add(gbox);

    const gboxNose = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.62, 0.55, 40), darkAlloyM);
    gboxNose.rotation.z = Math.PI / 2;
    gboxNose.position.x = 3.35;
    root.add(gboxNose);

    // 5. SCULPTED ROUNDED BOXER CRANKCASE
    const crankcaseGroup = new THREE.Group();
    root.add(crankcaseGroup);

    const caseLength = 4.2;
    const caseRadius = 0.85;
    const caseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x485872,
      metalness: 0.6,
      roughness: 0.35,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const caseBody = new THREE.Mesh(
      new THREE.CylinderGeometry(caseRadius, caseRadius, caseLength, 64, 1, true),
      caseMaterial
    );
    caseBody.rotation.z = Math.PI / 2;
    crankcaseGroup.add(caseBody);

    // Longitudinal Split-Flanges
    for (const sign of [-1, 1]) {
      const flangeBar = new THREE.Mesh(new THREE.BoxGeometry(caseLength, 0.08, 0.16), aluminumM);
      flangeBar.position.set(0, sign * caseRadius, 0);
      crankcaseGroup.add(flangeBar);

      for (let bx = -1.8; bx <= 1.8; bx += 0.45) {
        const fbolt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 12), goldBoltM);
        fbolt.position.set(bx, sign * (caseRadius + 0.02), 0);
        crankcaseGroup.add(fbolt);
      }
    }

    // Circumferential Strengthening Ribs
    for (let rx = -1.8; rx <= 1.8; rx += 0.9) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(caseRadius + 0.015, 0.035, 16, 48), darkAlloyM);
      rib.rotation.y = Math.PI / 2;
      rib.position.x = rx;
      crankcaseGroup.add(rib);
    }

    // Sculpted Oil Sump & Spin-On Filter
    const sumpGroup = new THREE.Group();
    sumpGroup.position.set(0, -0.92, 0);
    const sumpBase = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.35, 1.3), darkAlloyM);
    sumpGroup.add(sumpBase);

    const sumpPan = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.48, 2.4, 32), aluminumM);
    sumpPan.rotation.z = Math.PI / 2;
    sumpPan.position.y = -0.25;
    sumpGroup.add(sumpPan);

    const filterGroup = new THREE.Group();
    filterGroup.position.set(1.5, -0.75, 0.85);
    const filterCan = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.65, 32),
      new THREE.MeshStandardMaterial({ color: 0x113366, metalness: 0.65, roughness: 0.25 })
    );
    filterCan.rotation.x = Math.PI / 4;
    filterGroup.add(filterCan);

    const filterDome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), aluminumM);
    filterDome.rotation.x = -Math.PI / 4;
    filterDome.position.set(0, 0.24, 0.24);
    filterGroup.add(filterDome);
    crankcaseGroup.add(filterGroup);
    crankcaseGroup.add(sumpGroup);

    // 6. INTERNAL CRANKSHAFT
    const crankGroup = new THREE.Group();
    root.add(crankGroup);

    const mainShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 32), chromeM);
    mainShaft.rotation.z = Math.PI / 2;
    crankGroup.add(mainShaft);

    const X = [-1.65, -0.55, 0.55, 1.65];
    const N = [1, -1, 1, -1];
    const FIRE = [0, 360, 540, 180];
    const cr = 0.32;
    const L = 1.25;
    const HEAD_Z = 1.95;
    const R = 0.46;

    for (let i = 0; i < 4; i++) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.34, 20), steelM);
      pin.rotation.z = Math.PI / 2;
      pin.position.set(X[i], 0, N[i] * cr);
      crankGroup.add(pin);

      const counterweight = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.12, 28, 1, false, 0, Math.PI),
        darkAlloyM
      );
      counterweight.rotation.z = Math.PI / 2;
      counterweight.position.set(X[i] - 0.2, 0, -N[i] * 0.14);
      crankGroup.add(counterweight);
    }

    // 7. CYLINDERS, PISTONS, & ROUNDED ROCKER HEAD COVERS
    interface CylinderObj {
      n: number;
      pistonGroup: THREE.Group;
      rod: THREE.Mesh;
      gas: THREE.Mesh;
      gasMat: THREE.MeshBasicMaterial;
      valves: THREE.Mesh[];
      sparkPlugMat: THREE.MeshBasicMaterial;
      barrelMat: THREE.MeshPhysicalMaterial;
      finMat: THREE.MeshStandardMaterial;
      headMat: THREE.MeshStandardMaterial;
      cht: number;
      stroke: string;
    }
    const cylinderObjs: CylinderObj[] = [];

    for (let i = 0; i < 4; i++) {
      const n = N[i];
      const cylGroup = new THREE.Group();
      cylGroup.position.x = X[i];
      root.add(cylGroup);

      const barrelMat = new THREE.MeshPhysicalMaterial({
        color: 0x6e829d,
        metalness: 0.4,
        roughness: 0.3,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.04, R + 0.04, 1.25, 36, 1, true), barrelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = n * 1.35;
      cylGroup.add(barrel);

      const finMat = M(0x506075, 0.8, 0.25);
      for (let k = 0; k < 12; k++) {
        const finZ = n * (0.92 + k * 0.098);
        const finR = R + 0.18 + (k / 12) * 0.12;
        const fin = new THREE.Mesh(new THREE.CylinderGeometry(finR, finR, 0.025, 40), finMat);
        fin.rotation.x = Math.PI / 2;
        fin.position.z = finZ;
        cylGroup.add(fin);
      }

      // Sculpted Rounded Head
      const headMat = M(0xa8b8cc, 0.85, 0.2);
      const headBase = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.16, R + 0.16, 0.38, 48), headMat);
      headBase.rotation.x = Math.PI / 2;
      headBase.position.z = n * (HEAD_Z + 0.14);
      cylGroup.add(headBase);

      // Rounded Boxer Rocker Cap
      const rockerCover = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, 0.35, 32), aluminumM);
      rockerCover.rotation.x = Math.PI / 2;
      rockerCover.position.set(0, 0.45, n * (HEAD_Z + 0.1));
      rockerCover.scale.set(1.15, 1, 0.7);
      cylGroup.add(rockerCover);

      const coverDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        aluminumM
      );
      coverDome.rotation.x = n > 0 ? 0 : Math.PI;
      coverDome.position.set(0, 0.45, n * (HEAD_Z + 0.28));
      cylGroup.add(coverDome);

      const sparkPlugMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
      const sparkPlug = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), sparkPlugMat);
      sparkPlug.position.set(0, 0.18, n * (HEAD_Z - 0.02));
      cylGroup.add(sparkPlug);

      const valves = [-0.18, 0.18].map((y) => {
        const v = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.035, 20), steelM);
        v.rotation.x = Math.PI / 2;
        v.position.set(0, y, n * HEAD_Z);
        cylGroup.add(v);
        return v;
      });

      const pistonGroup = new THREE.Group();
      cylGroup.add(pistonGroup);

      const pistonCrown = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.02, R - 0.02, 0.52, 36), aluminumM);
      pistonCrown.rotation.x = Math.PI / 2;
      pistonGroup.add(pistonCrown);

      for (let ring = 0; ring < 3; ring++) {
        const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(R - 0.015, 0.012, 8, 36), darkAlloyM);
        ringMesh.position.z = (ring - 1) * 0.12;
        pistonGroup.add(ringMesh);
      }

      const gudgeonPin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.88, 16), chromeM);
      gudgeonPin.rotation.z = Math.PI / 2;
      pistonGroup.add(gudgeonPin);

      const rod = new THREE.Mesh(new THREE.BoxGeometry(0.15, L, 0.1), steelM);
      cylGroup.add(rod);

      const gasMat = new THREE.MeshBasicMaterial({
        color: 0x00d2ff,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      });
      const gas = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.025, R - 0.025, 1, 32), gasMat);
      gas.rotation.x = Math.PI / 2;
      cylGroup.add(gas);

      cylinderObjs.push({
        n,
        pistonGroup,
        rod,
        gas,
        gasMat,
        valves,
        sparkPlugMat,
        barrelMat,
        finMat,
        headMat,
        cht: 140,
        stroke: 'INT',
      });
    }

    // 8. LOGARITHMIC SPIRAL TURBOCHARGER VOLUTE
    const turboGroup = new THREE.Group();
    turboGroup.position.set(-3.1, -0.5, 0);
    root.add(turboGroup);

    const spiralSteps = 36;
    const spiralPts: THREE.Vector3[] = [];
    for (let s = 0; s <= spiralSteps; s++) {
      const t = s / spiralSteps;
      const theta = t * Math.PI * 1.95;
      const r = THREE.MathUtils.lerp(0.35, 0.70, t);
      spiralPts.push(new THREE.Vector3(Math.cos(theta) * r, Math.sin(theta) * r, 0));
    }
    const spiralCurve = new THREE.CatmullRomCurve3(spiralPts);
    const volute = new THREE.Mesh(new THREE.TubeGeometry(spiralCurve, 64, 0.16, 16, false), titaniumM);
    turboGroup.add(volute);

    const bellmouthPts: THREE.Vector2[] = [];
    for (let b = 0; b <= 16; b++) {
      const bt = b / 16;
      bellmouthPts.push(new THREE.Vector2(0.28 + Math.pow(bt, 2.5) * 0.22, bt * 0.55));
    }
    const bellmouth = new THREE.Mesh(new THREE.LatheGeometry(bellmouthPts, 32), aluminumM);
    bellmouth.position.z = 0.25;
    turboGroup.add(bellmouth);

    const compressorWheel = new THREE.Group();
    turboGroup.add(compressorWheel);
    const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.12, 0.3, 24), goldBoltM);
    wheelHub.rotation.x = Math.PI / 2;
    compressorWheel.add(wheelHub);

    for (let v = 0; v < 12; v++) {
      const vaneAngle = (v * Math.PI * 2) / 12;
      const vane = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.06), goldBoltM);
      vane.position.set(Math.cos(vaneAngle) * 0.14, Math.sin(vaneAngle) * 0.14, 0.08);
      vane.rotation.z = vaneAngle + 0.45;
      compressorWheel.add(vane);
    }

    // Induction and Exhaust Runners
    function addTube(points: number[][], radius: number, mat: THREE.Material) {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
      const geo = new THREE.TubeGeometry(curve, Math.max(24, points.length * 8), radius, 16, false);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      root.add(mesh);
      return mesh;
    }

    for (const side of [-1, 1]) {
      addTube([[-2.8, 0.95, side * 0.75], [-1.2, 1.05, side * 0.85], [1.2, 1.05, side * 0.85], [2.3, 0.95, side * 0.75]], 0.09, aluminumM);
      for (let i = 0; i < 4; i++) {
        if (N[i] === side) {
          addTube([[X[i], 0.38, side * 2.15], [X[i], 0.65, side * 1.8], [X[i] + 0.08, 0.88, side * 1.3], [X[i], 1.02, side * 0.85]], 0.07, aluminumM);
        }
      }
    }

    const exhaustMat = M(0x526070, 0.85, 0.28);
    exhaustMat.emissive = new THREE.Color(0x0a0400);

    for (const side of [-1, 1]) {
      addTube([[-2.5, -0.68, side * 2.45], [-1.2, -0.82, side * 2.5], [1.2, -0.82, side * 2.5], [2.45, -0.68, side * 2.45]], 0.09, exhaustMat);
      for (let i = 0; i < 4; i++) {
        if (N[i] === side) {
          addTube([[X[i], -0.22, side * 2.05], [X[i], -0.55, side * 2.3], [X[i] - 0.15, -0.74, side * 2.45], [X[i] - 0.32, -0.78, side * 2.5]], 0.065, exhaustMat);
        }
      }
      addTube([[-2.5, -0.68, side * 2.45], [-2.75, -0.78, side * 1.75], [-2.95, -0.65, side * 0.85], [-3.05, -0.48, side * 0.35]], 0.08, exhaustMat);
    }

    // Floor Grid & Shadow
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: 0x070c18 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.5;
    scene.add(floor);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.45 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.495;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    const gridHelper = new THREE.GridHelper(50, 50, 0x1b2d48, 0x0c1626);
    gridHelper.position.y = -2.49;
    scene.add(gridHelper);

    // 9. ANIMATION LOOP & CONTROLS
    const colIntake = new THREE.Color(0x00d2ff);
    const colCompress = new THREE.Color(0xf5d76e);
    const colFlame = new THREE.Color(0xff8800);
    const colCombust = new THREE.Color(0xd23c10);
    const colExhaust = new THREE.Color(0x7a8698);
    const colKnock = new THREE.Color(0xff1133);
    const workingColor = new THREE.Color();

    let crankAngle = 0;
    let turboRpm = 0;
    let lastTime = performance.now();
    let currentRpm = 2400;
    let currentThr = 0.7;
    let animId: number;

    const REDUCTION_RATIO = 2.43;

    let explodeOffset = 0;
    let isExplodedLocal = false;

    toggleExplodeRef.current = () => {
      isExplodedLocal = !isExplodedLocal;
      setIsExploded(isExplodedLocal);
    };

    let isXRayLocal = false;
    toggleXRayRef.current = () => {
      isXRayLocal = !isXRayLocal;
      setIsXRay(isXRayLocal);
      caseMaterial.opacity = isXRayLocal ? 0.08 : 0.25;
    };

    // Camera preset targets - centered on ENGINE_CENTER
    const targetCamPos = camera.position.clone();
    const targetRootRot = root.rotation.clone();

    setPresetRef.current = (preset) => {
      setActivePreset(preset);
      if (preset === '3/4') {
        targetCamPos.set(camDist * 0.38, 2.5, camDist * 0.92);
        targetRootRot.set(0.42, -0.28, 0);
      } else if (preset === 'prop') {
        targetCamPos.set(4.2, 1.4, 3.8);
        targetRootRot.set(0.12, -0.95, 0);
      } else if (preset === 'top') {
        targetCamPos.set(0.3, 9.2, 1.8);
        targetRootRot.set(1.42, 0, 0);
      } else if (preset === 'turbo') {
        targetCamPos.set(-4.2, 1.3, 3.6);
        targetRootRot.set(0.18, 0.92, 0);
      }
    };

    resetCameraRef.current = () => {
      setPresetRef.current('3/4');
    };

    function animate(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Smooth physics blend
      const k = Math.min(1, dt * 3.5);
      currentRpm += (targetRpmRef.current - currentRpm) * k;
      currentThr += (targetThrRef.current - currentThr) * k;

      if (isPlayingRef.current && currentRpm > 50) {
        const visualSpeed = (currentRpm * 0.35 * playbackRateRef.current);
        const crankStep = visualSpeed * 6 * dt;
        crankAngle = (crankAngle + crankStep) % 720;
      }
      const thetaRad = (crankAngle * Math.PI) / 180;

      // Explode offset lerp
      explodeOffset += ((isExplodedLocal ? 1.0 : 0.0) - explodeOffset) * Math.min(1, dt * 4);

      // Rotate Crankshaft & Reduction Propeller
      crankGroup.rotation.x = -thetaRad;
      propAssembly.rotation.x = -thetaRad / REDUCTION_RATIO;

      // Spin Turbo
      if (isPlayingRef.current) {
        turboRpm += dt * (12 + currentThr * (currentRpm / 120));
        compressorWheel.rotation.z = turboRpm;
      }

      // Smooth camera interpolation towards target position & rotation
      camera.position.lerp(targetCamPos, dt * 4);
      root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, targetRootRot.x, dt * 4);
      root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, targetRootRot.y, dt * 4);

      // CRUCIAL FIX: Continuously orient camera directly at the engine center!
      camera.lookAt(ENGINE_CENTER);

      const fault = faultRef.current;

      // Update 4 Opposed Cylinders
      cylinderObjs.forEach((cyl, i) => {
        const cycAngle = (((crankAngle - FIRE[i] + 360) % 720) + 720) % 720;
        const crankRad = ((cycAngle % 360) + (cyl.n < 0 ? 180 : 0)) * (Math.PI / 180);

        const s = cr * Math.cos(crankRad) + Math.sqrt(L * L - Math.pow(cr * Math.sin(crankRad), 2));
        const zPos = cyl.n * (s + explodeOffset * 0.4);
        cyl.pistonGroup.position.z = zPos;

        const py = cr * Math.sin(crankRad);
        const pz = cyl.n * cr * Math.cos(crankRad);
        cyl.rod.position.set(0, py / 2, (pz + cyl.n * s) / 2);
        cyl.rod.rotation.x = Math.atan2(cyl.n * s - pz, -py);

        const topOfPiston = s + 0.25;
        const gasHeight = HEAD_Z - topOfPiston;
        cyl.gas.scale.y = Math.max(gasHeight, 0.03);
        cyl.gas.position.z = cyl.n * ((HEAD_Z + topOfPiston) / 2 + explodeOffset * 0.2);

        // Valves
        cyl.valves[0].position.z = cyl.n * (HEAD_Z - (cycAngle < 180 ? Math.sin((cycAngle * Math.PI) / 180) * 0.1 : 0));
        cyl.valves[1].position.z = cyl.n * (HEAD_Z - (cycAngle >= 540 ? Math.sin(((cycAngle - 540) * Math.PI) / 180) * 0.1 : 0));

        // 4-Stroke flame color
        let stroke = 'INT';
        let opacity = 0.25;

        if (cycAngle < 180) {
          stroke = 'INT';
          workingColor.copy(colIntake);
          opacity = 0.25;
        } else if (cycAngle < 360) {
          stroke = 'CMP';
          workingColor.copy(colIntake).lerp(colCompress, (cycAngle - 180) / 180);
          opacity = 0.35 + 0.25 * ((cycAngle - 180) / 180);
        } else if (cycAngle < 540) {
          stroke = 'PWR';
          const f = (cycAngle - 360) / 180;
          if (fault.type === 'misfire' && i === fault.cyl) {
            workingColor.copy(colCompress).lerp(colExhaust, f);
            opacity = 0.2;
          } else {
            workingColor.copy(colFlame).lerp(colCombust, f);
            opacity = (0.95 - 0.5 * f) * (0.45 + 0.55 * currentThr);
            if (fault.type === 'knock' && i === fault.cyl && cycAngle < 430) {
              workingColor.lerp(colKnock, 0.9);
            }
          }
        } else {
          stroke = 'EXH';
          workingColor.copy(colExhaust);
          opacity = 0.3;
        }

        cyl.gasMat.color.copy(workingColor);
        cyl.gasMat.opacity = opacity;
        cyl.stroke = stroke;

        cyl.sparkPlugMat.color.set(cycAngle > 346 && cycAngle < 364 ? 0xffffff : 0x333333);

        // CHT & Thermal Glow
        let targetCht = targetChtRef.current + currentThr * 12;
        if (fault.type === 'overheat' && i === fault.cyl) targetCht += 65;
        if (fault.type === 'misfire' && i === fault.cyl) targetCht -= 38;
        cyl.cht += (targetCht - cyl.cht) * Math.min(1, dt * 0.9);

        const thermalStress = Math.min(1, Math.max(0, (cyl.cht - 180) / 180));
        cyl.headMat.emissive.setRGB(thermalStress * 0.95, thermalStress * 0.22, 0);
        cyl.barrelMat.emissive.setRGB(thermalStress * 0.55, thermalStress * 0.1, 0);
        cyl.finMat.emissive.setRGB(thermalStress * 0.65, thermalStress * 0.14, 0);
      });

      // Detonation Shake
      const isKnocking = fault.type === 'knock' && cylinderObjs[fault.cyl]?.stroke === 'PWR';
      root.position.x = 0 + (isKnocking ? (Math.random() - 0.5) * 0.1 : 0);
      root.position.y = 0 + (isKnocking ? (Math.random() - 0.5) * 0.06 : 0);

      // Exhaust pipe glow
      const pipeHeat = Math.max(0, Math.min(0.28, (targetEgtRef.current - 750) / 500));
      exhaustMat.emissive.setRGB(pipeHeat, pipeHeat * 0.22, 0);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    }

    animId = requestAnimationFrame(animate);

    // 10. MOUSE & TOUCH ORBIT CONTROLS
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      // Ignore clicks on floating controls
      if ((e.target as HTMLElement).closest('button')) return;
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMousePos.x;
      const dy = e.clientY - prevMousePos.y;

      targetRootRot.y += dx * 0.008;
      targetRootRot.x = Math.max(-0.4, Math.min(1.5, targetRootRot.x + dy * 0.008));
      root.rotation.y = targetRootRot.y;
      root.rotation.x = targetRootRot.x;

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onWheel = (e: WheelEvent) => {
      camDist = Math.max(7, Math.min(22, camDist + e.deltaY * 0.012));
      const dir = targetCamPos.clone().sub(ENGINE_CENTER).normalize();
      targetCamPos.copy(ENGINE_CENTER.clone().add(dir.multiplyScalar(camDist)));
      e.preventDefault();
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('wheel', onWheel, { passive: false });

    // 11. DYNAMIC CONTAINER RESIZE OBSERVER
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('wheel', onWheel);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[380px] sm:h-[400px] bg-[#070c18] rounded-xl overflow-hidden border border-slate-800/80 shadow-inner group">
      {/* Three.js canvas container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating View Presets Bar (Top Left - Compact & Non-overlapping) */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-[#0a1222]/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg text-xs z-10">
        <button
          onClick={() => setPresetRef.current('3/4')}
          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition ${
            activePreset === '3/4'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          3/4 View
        </button>
        <button
          onClick={() => setPresetRef.current('prop')}
          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition ${
            activePreset === 'prop'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Propeller
        </button>
        <button
          onClick={() => setPresetRef.current('top')}
          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition ${
            activePreset === 'top'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Top View
        </button>
        <button
          onClick={() => setPresetRef.current('turbo')}
          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition ${
            activePreset === 'turbo'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Turbo
        </button>
      </div>

      {/* Floating Inspection Controls (Top Right - Compact) */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-[#0a1222]/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg text-xs z-10">
        <button
          onClick={() => toggleXRayRef.current()}
          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 ${
            isXRay
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Toggle Crankcase X-Ray Transparency"
        >
          <Eye className="w-3 h-3" /> X-Ray
        </button>
        <button
          onClick={() => toggleExplodeRef.current()}
          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 ${
            isExploded
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Explode Cylinders & Pistons"
        >
          <Layers className="w-3 h-3" /> Explode
        </button>
        <button
          onClick={() => resetCameraRef.current()}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
          title="Reset Camera Center"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Interaction Hint (Bottom Left) */}
      <div className="absolute bottom-2 left-3 pointer-events-none text-[10px] text-slate-400/80 font-mono flex items-center gap-2 z-10">
        <span>Drag to rotate</span>
        <span>•</span>
        <span>Scroll to zoom</span>
        <span>•</span>
        <span className="text-cyan-400 font-semibold">Boxer Flat-4 Turbo (Rotax 914-Class)</span>
      </div>
    </div>
  );
};
