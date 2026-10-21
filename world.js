import * as THREE from "three";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (prefersReduced) {
  document.documentElement.dataset.webgl = "off";
} else {
  bootWorld();
}

function bootWorld() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    throw new Error("GSAP or ScrollTrigger failed to load before the WebGL world.");
  }
  gsap.registerPlugin(ScrollTrigger);

  const viewport = window.innerWidth;
  const narrow = viewport < 760;
  const tablet = viewport >= 760 && viewport < 1100;
  const lowPower =
    viewport < 980
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
  const black = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.32, metalness: 0.22 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xf4f1ec, roughness: 0.55, metalness: 0.02 });

  // Phone stages keep products inside the narrower frame.
  const hero = createStage(heroCanvas, {
    fov: narrow ? 32 : tablet ? 30 : 24,
    z: narrow ? 7.8 : tablet ? 7.6 : 5.8,
    lowPower,
  });
  const cup = makeCup(paper, black, sleeveTexture(), segments);
  const bag = makeBag(cream, bagTexture());
  const cupHome = narrow
    ? { x: -0.02, y: 0.18, z: 0.12 }
    : tablet
      ? { x: 0.05, y: -0.1, z: 0.2 }
      : { x: 0.22, y: -0.22, z: 0.05 };
  const bagHome = narrow
    ? { x: 0.48, y: 0.12, z: -0.42 }
    : tablet
      ? { x: 0.85, y: 0.22, z: -0.45 }
      : { x: 1.22, y: 0.38, z: -0.35 };
  cup.position.set(cupHome.x, cupHome.y, cupHome.z);
  cup.rotation.set(0.04, -0.18, -0.02);
  bag.position.set(bagHome.x, bagHome.y, bagHome.z);
  bag.rotation.set(0.04, 0.28, 0.04);
  hero.scene.add(warmLights(), cup, bag, floorShadow(cupHome.x, -1.05), floorShadow(bagHome.x, -0.62));
  hero.group = { cup, bag };

  const clock = createStage(clockCanvas, { fov: 30, z: narrow ? 6.2 : tablet ? 5.6 : 5.1, lowPower });
  const iced = makeIcedDrink(black, lowPower ? 24 : 40, { flavor: "coffee", lowPower });
  clock.scene.add(warmLights(1.15), iced);
  clock.group = { iced };

  const city = createStage(cityCanvas, {
    fov: narrow ? 34 : tablet ? 32 : 30,
    z: narrow ? 8.6 : tablet ? 8.2 : 7.6,
    lowPower,
  });
  city.camera.position.x = narrow ? 0 : tablet ? 0.15 : 0.45;
  city.camera.lookAt(narrow ? 0 : 0.2, narrow ? -0.7 : -0.35, 0);
  const cityCup = makeCup(paper, black, sleeveTexture(), segments);
  const cityHome = narrow
    ? { x: 0.05, y: -0.85, s: 0.78 }
    : tablet
      ? { x: 0.55, y: -0.7, s: 0.92 }
      : { x: 1.42, y: -0.78, s: 1.14 };
  cityCup.scale.setScalar(cityHome.s);
  cityCup.position.set(cityHome.x, cityHome.y, 0.15);
  cityCup.rotation.set(0.06, -0.22, -0.04);
  const beans = makeBeans(narrow ? 8 : tablet ? 14 : 20, cityHome);
  const cityLight = cityLights();
  city.scene.add(cityLight, cityCup, floorShadow(cityHome.x, cityHome.y - 0.95), beans.mesh);
  city.group = { cityCup, beans };

  const cupPose = {
    x: cupHome.x,
    y: narrow ? -0.2 : -1.15,
    z: cupHome.z,
    rx: 0.04,
    ry: narrow ? -1.2 : -0.55,
    rz: -0.02,
    s: narrow ? 0.96 : tablet ? 0.76 : 0.72,
  };
  const bagPose = {
    x: bagHome.x,
    y: narrow ? -0.15 : -0.8,
    z: bagHome.z,
    rx: 0.04,
    ry: 0.55,
    rz: 0.04,
    s: narrow ? 0.84 : tablet ? 0.76 : 0.72,
  };
  const idle = { cupZ: 0, bagZ: 0, cupY: 0, bagY: 0 };
  const mouse = { x: 0, y: 0 };

  const intro = gsap.timeline({ delay: 0.72, defaults: { ease: "power3.out" } });
  intro.to(cupPose, {
    y: narrow ? -0.18 : tablet ? -0.02 : -0.18,
    s: narrow ? 1 : tablet ? 1.02 : 0.88,
    ry: -1.35,
    duration: 0.55,
  }, 0);
  intro.to(bagPose, {
    x: narrow ? 0.3 : bagHome.x,
    y: narrow ? 0.02 : tablet ? 0.22 : 0.32,
    s: narrow ? 0.84 : tablet ? 1.08 : 1.22,
    ry: 0.42,
    duration: 0.62,
  }, 0.06);

  gsap.to(idle, { cupZ: -0.08, cupY: -0.1, duration: 3.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
  gsap.to(idle, { bagZ: 0.08, bagY: 0.12, duration: 4.2, yoyo: true, repeat: -1, ease: "sine.inOut" });

  const heroStage = document.getElementById("heroStage");
  if (!heroStage) throw new Error("Hero stage markup is missing.");
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    heroStage.addEventListener("pointermove", (event) => {
      const box = heroStage.getBoundingClientRect();
      mouse.x = (event.clientX - box.left) / box.width - 0.5;
      mouse.y = (event.clientY - box.top) / box.height - 0.5;
    });
  }

  const SCRUB = window.BrewnnsScroll?.SCRUB ?? 0.5;
  const heroTravel = window.BrewnnsScroll?.heroTravelTrigger?.() ?? {
    trigger: ".menu-strip",
    start: "top bottom",
    endTrigger: ".favorites",
    end: "top 12%",
    scrub: SCRUB,
  };
  const heroTravelTweens = [];
  if (!narrow && !tablet) {
    heroTravelTweens.push(gsap.to(cupPose, {
      scrollTrigger: { ...heroTravel },
      y: 1.45,
      ry: -0.48,
      rz: -0.12,
      ease: "none",
    }));
    heroTravelTweens.push(gsap.to(bagPose, {
      scrollTrigger: { ...heroTravel },
      y: 1.7,
      x: 0.86,
      ry: 0.36,
      rz: 0.08,
      ease: "none",
    }));
  }

  gsap.fromTo(
    iced.rotation,
    { x: 0.02, y: 0.04, z: 0 },
    {
      scrollTrigger: {
        trigger: ".clock-sec",
        start: "center 38%",
        end: "bottom top",
        scrub: SCRUB,
      },
      x: narrow ? 0.14 : 0.92,
      y: -0.38,
      z: 0.28,
      ease: "none",
    }
  );

  const cityCupY = cityCup.rotation.y;
  gsap.timeline({
    scrollTrigger: {
      trigger: ".city-sec",
      start: "top bottom",
      end: "bottom top",
      scrub: SCRUB,
    },
  })
    .fromTo(
      cityCup.position,
      { x: cityHome.x - 0.08, y: cityHome.y - 0.22 },
      { x: cityHome.x, y: cityHome.y + 0.08, ease: "none", duration: 0.58 },
      0
    )
    .to(cityCup.position, { x: cityHome.x + 0.28, y: cityHome.y + 1.05, ease: "none", duration: 0.42 }, 0.58)
    .fromTo(
      cityCup.rotation,
      { z: -0.06, x: 0.08, y: cityCupY },
      { z: -0.04, x: 0.06, ease: "none", duration: 0.7 },
      0
    )
    .to(cityCup.rotation, { z: -0.02, y: cityCupY - 0.08, ease: "none", duration: 0.3 }, 0.7);

  gsap.to(beans.mesh.position, {
    y: 0.85,
    x: 0.15,
    scrollTrigger: {
      trigger: ".city-sec",
      start: "top bottom",
      end: "bottom top",
      scrub: SCRUB,
    },
    ease: "none",
  });

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
    cup.rotation.set(cupPose.rx - mouse.y * 0.08, cupPose.ry + mouse.x * 0.12, cupPose.rz + idle.cupZ);
    cup.scale.setScalar(cupPose.s);
    bag.position.set(bagPose.x, bagPose.y + idle.bagY, bagPose.z);
    bag.rotation.set(bagPose.rx - mouse.y * 0.06, bagPose.ry + mouse.x * 0.14, bagPose.rz + idle.bagZ);
    bag.scale.setScalar(bagPose.s);
    if (city.visible) beans.update(t);
    favMotion.update(t);
    stages.forEach((stage) => {
      if (stage.visible) stage.render();
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
  const frameHero = () => {
    const width = window.innerWidth;
    const isNarrow = width < 760;
    const isTablet = width >= 760 && width < 1100;
    if (isNarrow || isTablet) {
      heroTravelTweens.splice(0).forEach((tween) => {
        tween.scrollTrigger?.kill();
        tween.kill();
      });
      if (isNarrow) {
        cupPose.x = 0.02;
        cupPose.y = -0.18;
        cupPose.z = 0.12;
        cupPose.s = 1;
        cupPose.ry = -1.35;
        bagPose.x = 0.3;
        bagPose.y = 0.02;
        bagPose.z = -0.32;
        bagPose.s = 0.84;
        bagPose.ry = 0.42;
        hero.camera.fov = 28;
        hero.camera.position.set(0, -0.05, 6.6);
      } else {
        cupPose.x = 0.02;
        cupPose.y = -0.02;
        cupPose.z = 0.14;
        cupPose.s = 1.02;
        cupPose.ry = -1.35;
        bagPose.x = 0.7;
        bagPose.y = 0.18;
        bagPose.z = -0.32;
        bagPose.s = 1.08;
        bagPose.ry = 0.42;
        hero.camera.fov = 28;
        hero.camera.position.set(0, 0.02, 6.2);
      }
    } else {
      hero.camera.fov = 24;
      hero.camera.position.set(0, 0, 5.8);
    }
    hero.camera.lookAt(0, 0, 0);
    hero.camera.updateProjectionMatrix();
  };
  const frameCity = () => {
    const width = window.innerWidth;
    const narrow = width < 760;
    const tablet = width >= 760 && width < 1100;
    city.camera.fov = narrow ? 34 : tablet ? 32 : 30;
    city.camera.position.z = narrow ? 8.6 : tablet ? 8.2 : 7.6;
    city.camera.position.x = narrow ? 0 : tablet ? 0.15 : 0.45;
    city.camera.lookAt(narrow ? 0 : 0.2, narrow ? -0.7 : -0.35, 0);
    city.camera.updateProjectionMatrix();
  };
  frameHero();
  frameCity();
  window.addEventListener("resize", () => {
    frameHero();
    frameCity();
  });
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

function setupFavorites({ paper, black, segments, lowPower, sleeve, stages }) {
  const canvases = [...document.querySelectorAll(".fav-canvas")];
  if (canvases.length !== 4) {
    throw new Error("Favorites section requires four WebGL canvases.");
  }

  const favSeg = Math.max(22, Math.floor(segments * 0.75));
  const favLowPower = lowPower || window.matchMedia("(max-width: 1200px)").matches;
  const builders = {
    cappuccino: () => makeEspressoShot(paper, favSeg),
    latte: () => makeLatteProduct(paper, creamLid(), sleeve, favSeg),
    matcha: () => makeIcedDrink(black, favSeg, { flavor: "matcha", lowPower: favLowPower }),
    roll: () => makeCinnamonRoll(),
  };
  const layout = {
    cappuccino: { scale: 0.92, y: -0.22, ry: -0.42, rz: 0.02, rotX: 0.14 },
    latte: { scale: 0.86, y: -0.18, ry: -0.38, rz: 0.02, rotX: 0.14 },
    matcha: { scale: 0.94, y: -0.12, ry: -0.32, rz: -0.04, rotX: 0.12 },
    roll: { scale: 1.05, y: -0.08, ry: 0.28, rz: 0.12, rotX: 0.1 },
  };

  const items = canvases.map((canvas, index) => {
    const kind = canvas.dataset.product;
    const build = builders[kind];
    const settle = layout[kind];
    if (!build || !settle) {
      throw new Error(`Favorites product "${kind}" is not configured.`);
    }

    const stage = createStage(canvas, { fov: 36, z: 5.4, lowPower: favLowPower });
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
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (card && finePointer) {
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

    return stage;
  });

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

function createStage(canvas, { fov, z, lowPower }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 40);
  camera.position.set(0, 0, z);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !lowPower,
    powerPreference: lowPower ? "low-power" : "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  const dprCap = (canvas.clientWidth || window.innerWidth) < 760 ? 1.5 : lowPower ? 1.5 : 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = false;

  const fit = () => {
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 1;
    const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  fit();
  new ResizeObserver(fit).observe(canvas.parentElement || canvas);

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
  const rim = new THREE.PointLight(0xffb978, 1.35 * intensity, 12);
  rim.position.set(0.4, 1.8, -2.4);
  group.add(key, fill, rim);
  return group;
}

function cityLights() {
  const group = new THREE.Group();
  group.add(new THREE.AmbientLight(0x2a2018, 0.55));
  const key = new THREE.DirectionalLight(0xffd2a0, 1.15);
  key.position.set(4.2, 5.4, 3.2);
  const fill = new THREE.DirectionalLight(0x6a5a48, 0.35);
  fill.position.set(-2.8, 1.2, 2.4);
  const rim = new THREE.DirectionalLight(0xffc48a, 0.42);
  rim.position.set(2.6, 2.8, -2.2);
  group.add(key, fill, rim);
  return group;
}

function makePaperMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xf3eee6,
    roughness: 0.62,
    metalness: 0.04,
  });
}

function creamLid() {
  return new THREE.MeshStandardMaterial({ color: 0xf4f1ec, roughness: 0.42, metalness: 0.02 });
}

function makeCup(paper, lidMat, sleeve, segments) {
  const group = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0xf6f3ee, roughness: 0.78, metalness: 0.02 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.5, 1.92, segments, 1, true), wall);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.48, 1.88, segments, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xe7e1d6, side: THREE.BackSide, roughness: 0.84 })
  );
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.5, segments), paper);
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = -0.96;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.028, 8, segments), wall);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.94;
  const labelMat = new THREE.MeshStandardMaterial({
    map: sleeve,
    roughness: 0.8,
    metalness: 0,
    transparent: true,
    depthWrite: false,
  });
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.648, 0.508, 1.2, segments, 1, true), labelMat);
  label.position.y = -0.08;
  const lidSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.7, 0.07, segments), lidMat);
  lidSkirt.position.y = 1.02;
  const lidDeck = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.05, segments), lidMat);
  lidDeck.position.y = 1.07;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, Math.max(16, segments / 2), 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
    lidMat
  );
  dome.scale.y = 0.22;
  dome.position.y = 1.08;
  const sip = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.045, 12), lidMat);
  sip.position.set(0.16, 1.16, 0.2);
  group.add(body, inner, bottom, lip, label, lidSkirt, lidDeck, dome, sip);
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

function makeLatteProduct(paper, lidMat, sleeve, segments) {
  return makeCup(paper, lidMat, sleeve, segments);
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

function makeEspressoShot(paper, segments) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.5, 1.05, segments, 1, true), paper);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.48, 1.02, segments, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xe8e0d4, side: THREE.BackSide, roughness: 0.72 })
  );
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.5, segments), paper);
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = -0.52;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.03, 8, segments), paper);
  rim.position.y = 0.52;
  rim.rotation.x = Math.PI / 2;
  const coffee = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.2, segments),
    new THREE.MeshStandardMaterial({ color: 0x2a1608, roughness: 0.35, metalness: 0.05 })
  );
  coffee.position.y = 0.38;
  const crema = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 0.07, segments),
    new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.48 })
  );
  crema.position.y = 0.5;
  group.add(body, inner, bottom, rim, coffee, crema);
  return group;
}

function makeCinnamonRoll() {
  const group = new THREE.Group();
  const dough = new THREE.MeshStandardMaterial({ color: 0xf3d7a6, roughness: 0.58 });
  const spice = new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.72 });
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 1.12, 0.07, 32),
    new THREE.MeshStandardMaterial({ color: 0xf7f4ef, roughness: 0.82 })
  );
  plate.position.y = -0.28;
  group.add(plate);

  for (let ring = 0; ring < 6; ring += 1) {
    const radius = 0.58 - ring * 0.08;
    const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.09, 10, 36), ring % 2 === 0 ? spice : dough);
    torus.rotation.x = Math.PI / 2;
    torus.position.y = ring * 0.035 - 0.12;
    torus.rotation.z = ring * 0.28;
    group.add(torus);
  }

  const glaze = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff4e8, roughness: 0.35, transparent: true, opacity: 0.88 })
  );
  glaze.position.set(0.1, 0.16, 0.12);
  glaze.scale.set(1.3, 0.4, 1.15);
  group.add(glaze);
  return group;
}

function makeIcedDrink(black, segments, { flavor = "coffee" } = {}) {
  const group = new THREE.Group();
  const matcha = flavor === "matcha";
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.54, 0.46, 1.48, segments),
    new THREE.MeshStandardMaterial({ color: matcha ? 0x86c96f : 0xc49a68, roughness: 0.34 })
  );
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.54, 0.035, 8, segments),
    new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.28 })
  );
  rim.position.y = 0.74;
  rim.rotation.x = Math.PI / 2;
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.22, 12), black);
  straw.position.set(0.16, 1.18, 0.04);
  straw.rotation.z = -0.16;
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xf7f4ef, roughness: 0.16, transparent: true, opacity: 0.86 });
  [
    [0.1, 0.78, 0.08],
    [-0.12, 0.74, 0.06],
    [0.02, 0.86, -0.08],
    [-0.04, 0.7, -0.12],
  ].forEach(([x, y, z], index) => {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.16), iceMat);
    cube.position.set(x, y, z);
    cube.rotation.set(0.35 + index * 0.2, 0.4, 0.18);
    group.add(cube);
  });
  group.add(liquid, rim, straw);
  return group;
}

function makeBeans(count, anchor = { x: 1.2, y: -0.7 }) {
  const geometry = new THREE.SphereGeometry(0.09, 10, 8);
  geometry.scale(1, 0.62, 0.82);
  const material = new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.82, metalness: 0.04 });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  const seeds = [];
  for (let i = 0; i < count; i += 1) {
    const layer = i % 3;
    const spreadX = layer === 0 ? 3.4 : layer === 1 ? 2.2 : 1.4;
    const spreadY = layer === 0 ? 2.2 : layer === 1 ? 1.5 : 1.0;
    seeds.push({
      x: anchor.x + (Math.random() - 0.5) * spreadX,
      y: anchor.y + (Math.random() - 0.5) * spreadY,
      z: (layer - 1) * 0.55 + (Math.random() - 0.5) * 0.35,
      s: layer === 0 ? 0.38 + Math.random() * 0.22 : layer === 1 ? 0.58 + Math.random() * 0.28 : 0.82 + Math.random() * 0.35,
      spin: Math.random() * Math.PI,
      speed: 0.12 + Math.random() * 0.16,
      drift: 0.06 + Math.random() * 0.08,
    });
  }
  return {
    mesh,
    update(time) {
      seeds.forEach((seed, index) => {
        dummy.position.set(
          seed.x,
          seed.y + Math.sin(time * seed.speed + seed.spin) * seed.drift,
          seed.z
        );
        dummy.rotation.set(seed.spin + time * 0.1, time * seed.speed * 0.6, seed.spin);
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
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sleeve texture context failed.");
  ctx.clearRect(0, 0, 1024, 512);
  ctx.fillStyle = "#161616";
  ctx.textAlign = "center";
  ctx.font = "700 118px 'Bebas Neue', sans-serif";
  ctx.fillText("brewnns", 512, 250);
  ctx.font = "500 26px Inter, sans-serif";
  ctx.fillText("COFFEE HOUSE", 512, 296);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.offset.x = 0.25;
  texture.wrapS = THREE.RepeatWrapping;
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
  ctx.font = "italic 110px 'Cormorant Garamond', serif";
  ctx.fillText("slow roast", 256, 348);
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
