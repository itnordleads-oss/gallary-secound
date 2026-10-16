import * as THREE from "three";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function stubFavoritesWire() {
  window.BrewnnsFavorites = { wireTimeline() {} };
}

if (prefersReduced) {
  document.documentElement.dataset.webgl = "off";
  document.documentElement.dataset.favRender = "css";
  stubFavoritesWire();
} else {
  try {
    bootWorld();
  } catch (error) {
    console.error("Brewnns WebGL world failed to start:", error);
    document.documentElement.dataset.webgl = "off";
    document.documentElement.dataset.favRender = "css";
    stubFavoritesWire();
  }
}

function bootWorld() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    throw new Error("GSAP or ScrollTrigger failed to load before the WebGL world.");
  }
  gsap.registerPlugin(ScrollTrigger);

  const lowPower =
    window.matchMedia("(max-width: 980px)").matches
    || window.matchMedia("(pointer: coarse)").matches
    || window.matchMedia("(prefers-reduced-data: reduce)").matches
    || (navigator.hardwareConcurrency || 8) <= 4;
  const segments = lowPower ? 28 : 48;

  const heroCanvas = document.getElementById("heroCanvas");
  const clockCanvas = document.getElementById("clockCanvas");
  const cityCanvas = document.getElementById("cityCanvas");
  if (!heroCanvas || !clockCanvas || !cityCanvas) {
    throw new Error("A required WebGL canvas is missing.");
  }

  document.documentElement.dataset.webgl = "on";

  const paper = makePaperMaterial();
  const black = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.45, metalness: 0.08 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xf4f1ec, roughness: 0.55, metalness: 0.02 });

  const hero = createStage(heroCanvas, { fov: 28, z: 7.2, lowPower });
  if (!hero) {
    throw new Error("Hero WebGL stage failed to initialize.");
  }
  const cup = makeCup(paper, black, sleeveTexture(), segments);
  const bag = makeBag(cream, bagTexture());
  cup.position.set(-0.35, 0.05, 0.2);
  cup.rotation.set(0.1, -0.38, -0.06);
  bag.position.set(1.35, 0.45, -0.25);
  bag.rotation.set(0.06, 0.48, 0.1);
  hero.scene.add(warmLights(), cup, bag, floorShadow(-0.35, -1.05), floorShadow(1.35, -0.62));
  hero.group = { cup, bag };

  const clock = createStage(clockCanvas, { fov: 30, z: 5.4, lowPower });
  if (!clock) {
    throw new Error("Clock WebGL stage failed to initialize.");
  }
  const iced = makeIcedDrink(black, lowPower ? 24 : 40);
  clock.scene.add(warmLights(1.15), iced);
  clock.group = { iced };

  const city = createStage(cityCanvas, {
    fov: lowPower ? 40 : 32,
    z: lowPower ? 5.8 : 8.4,
    lowPower,
  });
  if (!city) {
    throw new Error("City WebGL stage failed to initialize.");
  }
  const cityCup = makeCup(paper, black, sleeveTexture(), segments);
  if (lowPower) {
    cityCup.scale.setScalar(1.12);
    cityCup.position.set(0, -2.4, 0.15);
    cityCup.rotation.set(0.12, -0.38, -0.18);
    city.focusObject = cityCup;
    city.camera.position.set(0, 0.15, 5.8);
    city.camera.lookAt(0, -0.35, 0);
  } else {
    cityCup.scale.setScalar(1.25);
    cityCup.position.set(2.85, -3.2, 0);
    cityCup.rotation.set(0.18, -0.45, -0.28);
  }
  const beans = makeBeans(lowPower ? 18 : 42, lowPower);
  city.scene.add(cityLights(), cityCup, beans.mesh);
  city.group = { cityCup, beans };

  const cupPose = { x: -0.35, y: -1.15, z: 0.2, rx: 0.1, ry: -0.72, rz: -0.06, s: 0.72 };
  const bagPose = { x: 1.35, y: -0.8, z: -0.25, rx: 0.06, ry: 0.78, rz: 0.1, s: 0.72 };
  const idle = { cupZ: 0, bagZ: 0, cupY: 0, bagY: 0 };
  const mouse = { x: 0, y: 0 };

  const intro = gsap.timeline({ delay: 1.85, defaults: { ease: "power3.out" } });
  intro.to(cupPose, { y: 0.22, s: 0.88, ry: -0.38, duration: 1.1 }, 0);
  intro.to(bagPose, { y: 0.52, s: 0.88, ry: 0.48, duration: 1.2 }, 0.08);

  gsap.to(idle, { cupZ: -0.08, cupY: -0.1, duration: 3.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
  gsap.to(idle, { bagZ: 0.08, bagY: 0.12, duration: 4.2, yoyo: true, repeat: -1, ease: "sine.inOut" });

  const heroStage = document.getElementById("heroStage");
  if (!heroStage) throw new Error("Hero stage markup is missing.");
  heroStage.addEventListener("pointermove", (event) => {
    const box = heroStage.getBoundingClientRect();
    mouse.x = (event.clientX - box.left) / box.width - 0.5;
    mouse.y = (event.clientY - box.top) / box.height - 0.5;
  });

  const SCRUB = window.BrewnnsScroll?.SCRUB ?? 0.5;
  const heroScroll = window.BrewnnsScroll?.heroScrollTrigger?.() ?? {
    trigger: ".hero",
    start: "top top",
    end: "bottom top",
    scrub: SCRUB,
  };
  gsap.to(cupPose, {
    scrollTrigger: heroScroll,
    y: lowPower ? 1.05 : 3.6,
    ry: lowPower ? -0.48 : -0.62,
    rz: lowPower ? -0.1 : -0.16,
    ease: "none",
  });
  gsap.to(bagPose, {
    scrollTrigger: heroScroll,
    y: lowPower ? 0.85 : 3.2,
    x: lowPower ? 0.95 : 1.15,
    ry: 0.48,
    rz: 0.12,
    ease: "none",
  });

  const clockScroll = window.BrewnnsScroll?.clockScrollTrigger?.() ?? {
    trigger: ".clock-sec",
    start: "top 55%",
    end: "bottom top",
    scrub: SCRUB,
  };
  gsap.fromTo(
    iced.rotation,
    { x: 0.04, y: 0.02, z: 0 },
    {
      scrollTrigger: clockScroll,
      x: 0.95,
      y: -0.18,
      z: 0.7,
      ease: "none",
    }
  );

  const cityCupY = cityCup.rotation.y;
  const cityScroll = {
    trigger: ".city-sec",
    start: "top bottom",
    end: "bottom top",
    scrub: SCRUB,
  };
  if (lowPower) {
    gsap.timeline({ scrollTrigger: cityScroll })
      .fromTo(
        cityCup.position,
        { x: 0, y: -3.4, z: 0.1 },
        { x: 0, y: -0.55, z: 0.2, ease: "none", duration: 0.58 },
        0
      )
      .to(cityCup.position, { x: 0.08, y: 0.55, z: 0.22, ease: "none", duration: 0.42 }, 0.58)
      .fromTo(
        cityCup.rotation,
        { z: -0.32, x: 0.18, y: cityCupY },
        { z: -0.06, x: 0.05, ease: "none", duration: 0.58 },
        0
      )
      .to(cityCup.rotation, { z: 0.1, y: -0.22, ease: "none", duration: 0.42 }, 0.58);
  } else {
    gsap.timeline({ scrollTrigger: cityScroll })
      .fromTo(
        cityCup.position,
        { x: 2.7, y: -4.6 },
        { x: 2.55, y: -0.95, ease: "none", duration: 0.58 },
        0
      )
      .to(cityCup.position, { x: 2.9, y: 2.8, ease: "none", duration: 0.42 }, 0.58)
      .fromTo(
        cityCup.rotation,
        { z: -0.55, x: 0.28, y: cityCupY },
        { z: -0.12, x: 0.08, ease: "none", duration: 0.58 },
        0
      )
      .to(cityCup.rotation, { z: 0.2, y: -0.2, ease: "none", duration: 0.42 }, 0.58);
  }

  const stages = [hero, clock, city];
  const favMotion = setupFavorites({
    paper,
    black,
    segments,
    lowPower,
    sleeve: sleeveTexture(),
    stages,
  });
  const clockObj = new THREE.Clock();
  let frameId = 0;
  let running = true;

  function tick() {
    if (!running) return;
    const t = clockObj.getElapsedTime();
    cup.position.set(cupPose.x, cupPose.y + idle.cupY, cupPose.z);
    cup.rotation.set(cupPose.rx - mouse.y * 0.28, cupPose.ry + mouse.x * 0.55, cupPose.rz + idle.cupZ);
    cup.scale.setScalar(cupPose.s);
    bag.position.set(bagPose.x, bagPose.y + idle.bagY, bagPose.z);
    bag.rotation.set(bagPose.rx - mouse.y * 0.22, bagPose.ry + mouse.x * 0.7, bagPose.rz + idle.bagZ);
    bag.scale.setScalar(bagPose.s);
    beans.update(t);
    favMotion.update(t);
    stages.forEach((stage) => {
      if (!stage.visible) return;
      if (stage.focusObject) {
        const target = stage.focusObject.position;
        stage.camera.lookAt(target.x, target.y * 0.85, target.z);
      }
      stage.render();
    });
    frameId = requestAnimationFrame(tick);
  }

  const visibility = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const stage = stages.find((item) => item.canvas === entry.target);
        if (stage) stage.visible = entry.isIntersecting;
      });
      running = stages.some((stage) => stage.visible) && !document.hidden;
      if (running) tick();
    },
    { rootMargin: "12% 0px", threshold: 0.01 }
  );
  stages.forEach((stage) => visibility.observe(stage.canvas));

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden && stages.some((stage) => stage.visible);
    if (running) tick();
    else cancelAnimationFrame(frameId);
  });
  stages.forEach((stage) => { stage.visible = true; });
  tick();
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

function setupFavorites({ paper, black, segments, lowPower, sleeve, stages }) {
  const useCssFavorites =
    lowPower
    || window.matchMedia("(pointer: coarse)").matches;

  if (useCssFavorites) {
    document.documentElement.dataset.favRender = "css";
    window.BrewnnsFavorites = { wireTimeline() {} };
    return { update() {} };
  }

  const canvases = [...document.querySelectorAll(".fav-canvas")];
  if (canvases.length !== 4) {
    throw new Error("Favorites section requires four WebGL canvases.");
  }

  const favSeg = Math.max(22, Math.floor(segments * 0.75));
  const favLowPower = lowPower || window.matchMedia("(max-width: 1200px)").matches;
  const builders = {
    espresso: () => makeEspressoShot(paper, black, favSeg),
    latte: () => makeLatteProduct(paper, black, sleeve, favSeg),
    iced: () => makeIcedDrink(black, favSeg),
    roll: () => makeCinnamonRoll(),
  };
  const layout = {
    espresso: { scale: 0.92, y: -0.22, ry: -0.42, rz: 0.02, rotX: 0.14 },
    latte: { scale: 0.86, y: -0.18, ry: -0.38, rz: 0.02, rotX: 0.14 },
    iced: { scale: 0.94, y: -0.12, ry: -0.32, rz: -0.04, rotX: 0.12 },
    roll: { scale: 1.05, y: -0.08, ry: 0.28, rz: 0.12, rotX: 0.1 },
  };

  const items = [];
  for (let index = 0; index < canvases.length; index += 1) {
    const canvas = canvases[index];
    const kind = canvas.dataset.product;
    const build = builders[kind];
    const settle = layout[kind];
    if (!build || !settle) {
      throw new Error(`Favorites product "${kind}" is not configured.`);
    }

    const stage = createStage(canvas, { fov: 36, z: 5.4, lowPower: favLowPower });
    if (!stage) {
      document.documentElement.dataset.favRender = "css";
      window.BrewnnsFavorites = { wireTimeline() {} };
      return { update() {} };
    }
    stage.baseCamZ = 5.4;
    const product = build();
    const reveal = {
      y: settle.y,
      z: 0,
      scale: settle.scale,
      rotX: settle.rotX,
      rotY: settle.ry,
      rotZ: settle.rz,
    };
    const steam = product.getObjectByName("steam");
    stage.scene.add(warmLights(1.18), product, floorShadow(0, -1.02));
    stage.group = {
      product,
      steam,
      tilt: { x: 0, y: 0 },
      phase: index * 0.85,
      reveal,
      settle,
    };
    stages.push(stage);

    const card = canvas.closest(".menu-card");
    if (card) {
      card.addEventListener("pointermove", (event) => {
        const box = card.getBoundingClientRect();
        stage.group.tilt.y = ((event.clientX - box.left) / box.width - 0.5) * 0.72;
        stage.group.tilt.x = ((event.clientY - box.top) / box.height - 0.5) * -0.48;
      });
      card.addEventListener("pointerleave", () => {
        stage.group.tilt.x = 0;
        stage.group.tilt.y = 0;
      });
    }

    items.push(stage);
  }

  window.BrewnnsFavorites = {
    wireTimeline(timeline) {
      if (!timeline) {
        throw new Error("Favorites DOM timeline is required for 3D wiring.");
      }
      items.forEach((stage, index) => {
        const { reveal, settle } = stage.group;
        const at = 0.11 + index * 0.125;
        timeline.fromTo(
          reveal,
          {
            y: settle.y - 0.55,
            z: -0.15,
            scale: settle.scale * 0.78,
            rotX: 0.42,
            rotY: settle.ry - 0.45,
            rotZ: (index - 1.5) * 0.22,
          },
          {
            y: settle.y + 0.22,
            z: 0.08,
            scale: settle.scale * 1.08,
            rotX: settle.rotX - 0.04,
            rotY: settle.ry + 0.16,
            rotZ: settle.rz,
            ease: "none",
            duration: 0.22,
          },
          at
        );
        timeline.to(
          reveal,
          {
            y: settle.y,
            z: 0,
            scale: settle.scale,
            rotX: settle.rotX,
            rotY: settle.ry,
            rotZ: settle.rz,
            ease: "none",
            duration: 0.16,
          },
          at + 0.22
        );
      });
    },
  };

  return {
    update(time) {
      items.forEach((stage) => {
        if (!stage.visible) return;
        const { product, steam, tilt, phase, reveal, settle } = stage.group;
        const bob = Math.sin(time * 1.15 + phase) * 0.04;
        product.position.set(0, reveal.y + bob, reveal.z);
        product.scale.setScalar(reveal.scale);
        product.rotation.set(
          reveal.rotX + tilt.x + Math.sin(time * 0.55 + phase) * 0.03,
          reveal.rotY + tilt.y + Math.sin(time * 0.4 + phase) * 0.05,
          reveal.rotZ
        );

        const pop = THREE.MathUtils.clamp((reveal.scale - settle.scale * 0.78) / (settle.scale * 0.3), 0, 1);
        stage.camera.position.z = stage.baseCamZ + (1 - pop) * 2.1;
        stage.camera.position.y = (1 - pop) * -0.32;
        stage.camera.lookAt(0, reveal.y * 0.35, 0);

        if (steam) {
          steam.visible = pop > 0.45;
          steam.children.forEach((wisp, wispIndex) => {
            wisp.position.y = wispIndex * 0.14 + Math.sin(time * 2.4 + phase + wispIndex) * 0.1;
            wisp.position.x = Math.sin(time * 1.6 + wispIndex + phase) * 0.05;
            wisp.rotation.z = Math.sin(time * 1.2 + wispIndex) * 0.12;
            wisp.material.opacity = 0.08 + pop * 0.22;
          });
        }
      });
    },
  };
}

let webglContextCount = 0;

function createStage(canvas, { fov, z, lowPower }) {
  const contextBudget = lowPower ? 4 : 8;
  if (webglContextCount >= contextBudget) {
    return null;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 40);
  camera.position.set(0, 0, z);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !lowPower,
      powerPreference: lowPower ? "low-power" : "high-performance",
    });
  } catch (error) {
    console.error("WebGL renderer creation failed:", error);
    return null;
  }

  const gl = renderer.getContext();
  if (!gl || gl.isContextLost()) {
    renderer.dispose();
    return null;
  }
  webglContextCount += 1;

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = false;

  const fit = () => {
    const parent = canvas.parentElement;
    const rect = parent?.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect?.width || canvas.clientWidth || 1));
    const height = Math.max(1, Math.round(rect?.height || canvas.clientHeight || 1));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  fit();
  const observeTarget = canvas.parentElement || canvas;
  new ResizeObserver(fit).observe(observeTarget);
  window.addEventListener("orientationchange", () => {
    requestAnimationFrame(fit);
  });

  return {
    canvas,
    scene,
    camera,
    renderer,
    visible: true,
    render() {
      renderer.render(scene, camera);
    },
  };
}

function warmLights(intensity = 1) {
  const group = new THREE.Group();
  group.add(new THREE.AmbientLight(0xffe6c8, 0.42 * intensity));
  const key = new THREE.DirectionalLight(0xffd7a8, 1.35 * intensity);
  key.position.set(3.2, 4.2, 3.6);
  const fill = new THREE.DirectionalLight(0xb9d4ff, 0.28 * intensity);
  fill.position.set(-3.4, 0.6, 2.2);
  const rim = new THREE.PointLight(0xffb978, 1.1 * intensity, 12);
  rim.position.set(0.4, 1.8, -2.4);
  group.add(key, fill, rim);
  return group;
}

function cityLights() {
  const group = warmLights(0.95);
  const ember = new THREE.PointLight(0xc47a3a, 1.4, 14);
  ember.position.set(2.4, 1.2, 1.5);
  group.add(ember);
  return group;
}

function makePaperMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xf3eee6,
    roughness: 0.62,
    metalness: 0.04,
  });
}

function makeCup(paper, black, sleeve, segments) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.58, 1.72, segments, 1, true), paper);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.56, 1.7, segments, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xe8e0d4, side: THREE.BackSide, roughness: 0.7 })
  );
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.58, segments), paper);
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = -0.86;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.76, 0.16, segments), black);
  lid.position.y = 0.94;
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.05, segments), black);
  ridge.position.y = 1.02;
  const sip = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, Math.max(12, segments / 2)), black);
  sip.position.y = 1.08;
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.731, 0.605, 0.78, segments, 1, true),
    new THREE.MeshStandardMaterial({ map: sleeve, roughness: 0.7 })
  );
  label.position.y = 0.02;
  group.add(body, inner, bottom, lid, ridge, sip, label);
  return group;
}

function makeBag(cream, artwork) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.05, 0.38), cream);
  const fold = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.32, 0.22), cream);
  fold.position.set(0, 1.12, 0.04);
  fold.rotation.x = -0.22;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.32, 1.78),
    new THREE.MeshStandardMaterial({ map: artwork, roughness: 0.68 })
  );
  face.position.z = 0.2;
  group.add(body, fold, face);
  return group;
}

function makeLatteProduct(paper, black, sleeve, segments) {
  const group = new THREE.Group();
  const cup = makeCup(paper, black, sleeve, segments);
  const steam = makeSteamPlume();
  steam.position.y = 1.08;
  group.add(cup, steam);
  return group;
}

function makeSteamPlume() {
  const group = new THREE.Group();
  group.name = "steam";
  for (let i = 0; i < 4; i += 1) {
    const wisp = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.82),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      })
    );
    wisp.position.set((i - 1.5) * 0.1, i * 0.12, 0.02);
    wisp.rotation.y = 0.35 + i * 0.08;
    group.add(wisp);
  }
  return group;
}

function makeEspressoShot(paper, black, segments) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.5, 1.35, segments, 1, true), paper);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.48, 1.32, segments, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xe8e0d4, side: THREE.BackSide, roughness: 0.72 })
  );
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.5, segments), paper);
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = -0.68;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.64, 0.12, segments), black);
  lid.position.y = 0.72;
  const coffee = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.52, 0.22, segments),
    new THREE.MeshStandardMaterial({ color: 0x2a1608, roughness: 0.35, metalness: 0.05 })
  );
  coffee.position.y = 0.58;
  const crema = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.06, segments),
    new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.48 })
  );
  crema.position.y = 0.72;
  group.add(body, inner, bottom, lid, coffee, crema);
  return group;
}

function makeCinnamonRoll() {
  const group = new THREE.Group();
  const dough = new THREE.MeshStandardMaterial({ color: 0xf3d7a6, roughness: 0.58 });
  const spice = new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.72 });
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.08, 32),
    new THREE.MeshStandardMaterial({ color: 0xefeae3, roughness: 0.82 })
  );
  plate.position.y = -0.62;
  group.add(plate);

  for (let ring = 0; ring < 7; ring += 1) {
    const radius = 0.62 - ring * 0.075;
    const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.085, 10, 36), ring % 2 === 0 ? spice : dough);
    torus.rotation.x = Math.PI / 2;
    torus.position.y = ring * 0.1 - 0.28;
    torus.rotation.z = ring * 0.22;
    group.add(torus);
  }

  const glaze = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff4e8, roughness: 0.35, transparent: true, opacity: 0.88 })
  );
  glaze.position.set(0.12, 0.42, 0.16);
  glaze.scale.set(1.2, 0.55, 1.1);
  group.add(glaze);
  return group;
}

function makeIcedDrink(black, segments) {
  const group = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.48, 1.55, segments),
    new THREE.MeshStandardMaterial({ color: 0x6b4224, roughness: 0.35, metalness: 0.05 })
  );
  const creamTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.52, 0.18, segments),
    new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.55 })
  );
  creamTop.position.y = 0.62;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.58, 0.12, segments), black);
  lid.position.y = 0.84;
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.15, 12), black);
  straw.position.set(0.18, 1.28, 0);
  straw.rotation.z = -0.18;
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xf0e6d8, roughness: 0.3, transparent: true, opacity: 0.72 });
  [
    [0.12, 0.2, 0.18],
    [-0.16, 0.02, 0.12],
    [0.05, -0.22, 0.16],
  ].forEach(([x, y, z]) => {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.18), iceMat);
    cube.position.set(x, y, z);
    cube.rotation.set(0.3, 0.4, 0.2);
    group.add(cube);
  });
  group.add(glass, creamTop, lid, straw);
  return group;
}

function makeBeans(count, tight = false) {
  const geometry = new THREE.SphereGeometry(0.09, 10, 8);
  geometry.scale(1, 0.62, 0.82);
  const material = new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.8 });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  const spreadX = tight ? 3.4 : 7.5;
  const spreadY = tight ? 3.6 : 4.8;
  const spreadZ = tight ? 2.2 : 3.2;
  const seeds = [];
  for (let i = 0; i < count; i += 1) {
    seeds.push({
      x: (Math.random() - 0.45) * spreadX,
      y: (Math.random() - 0.5) * spreadY,
      z: (Math.random() - 0.5) * spreadZ,
      s: 0.55 + Math.random() * 1.1,
      spin: Math.random() * Math.PI,
      speed: 0.4 + Math.random() * 0.8,
    });
  }
  return {
    mesh,
    update(time) {
      seeds.forEach((seed, index) => {
        dummy.position.set(seed.x, seed.y + Math.sin(time * seed.speed + seed.spin) * 0.35, seed.z);
        dummy.rotation.set(seed.spin + time * 0.2, time * seed.speed, seed.spin);
        dummy.scale.setScalar(seed.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

function floorShadow(x, y) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Shadow texture context failed.");
  const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,0.38)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 2.2),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, 0);
  return mesh;
}

function sleeveTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sleeve texture context failed.");
  ctx.fillStyle = "#f7f4ef";
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = "#111";
  ctx.textAlign = "center";
  ctx.font = "700 64px 'Bebas Neue', sans-serif";
  ctx.fillText("brewnns", 256, 150);
  ctx.font = "500 18px Inter, sans-serif";
  ctx.letterSpacing = "6px";
  ctx.fillText("COFFEE HOUSE", 256, 188);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function bagTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Bag texture context failed.");
  ctx.fillStyle = "#f7f4ef";
  ctx.fillRect(0, 0, 512, 720);
  ctx.fillStyle = "#111";
  ctx.textAlign = "center";
  ctx.font = "700 58px 'Bebas Neue', sans-serif";
  ctx.fillText("brewnns", 256, 180);
  ctx.font = "500 16px Inter, sans-serif";
  ctx.fillText("COFFEE HOUSE", 256, 214);
  ctx.font = "italic 86px 'Cormorant Garamond', serif";
  ctx.fillText("slow roast", 256, 340);
  ctx.font = "400 18px Inter, sans-serif";
  ctx.fillStyle = "#555";
  ctx.fillText("citrus", 256, 430);
  ctx.fillText("brown sugar", 256, 458);
  ctx.fillText("roasted almond", 256, 486);
  ctx.fillStyle = "#888";
  ctx.font = "400 14px Inter, sans-serif";
  ctx.fillText("12/06/24", 420, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
