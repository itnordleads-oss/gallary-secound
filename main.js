(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phoneQuery = window.matchMedia("(max-width: 760px)");
  let isPhone = phoneQuery.matches;
  const lowPower =
    isPhone
    || window.matchMedia("(prefers-reduced-data: reduce)").matches
    || (navigator.hardwareConcurrency || 8) <= 4;
  if (lowPower) document.documentElement.dataset.lowPower = "true";

  const nav = document.querySelector(".nav");
  const menuBtn = document.querySelector(".menu-btn");
  const momentWord = document.getElementById("momentWord");
  const clockFace = document.getElementById("clockFace");
  const clockTicks = document.getElementById("clockTicks");
  const loader = document.getElementById("loader");
  const loaderCount = document.getElementById("loaderCount");
  const loaderFill = document.getElementById("loaderFill");

  const required = { nav, menuBtn, momentWord, clockFace, clockTicks, loader, loaderCount, loaderFill };
  const missing = Object.entries(required).filter(([, node]) => !node).map(([name]) => name);
  if (missing.length) {
    throw new Error(`Site 02 required markup is missing: ${missing.join(", ")}`);
  }

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  const setMenu = (open) => {
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("nav-lock", open && isPhone);
  };

  menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  nav.querySelectorAll(".links a, .order").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });
  phoneQuery.addEventListener("change", (event) => {
    isPhone = event.matches;
    if (!isPhone) setMenu(false);
  });

  for (let hour = 1; hour <= 12; hour += 1) {
    const mark = document.createElement("span");
    mark.className = "clock-num";
    mark.textContent = String(hour);
    const angle = (hour / 12) * Math.PI * 2 - Math.PI / 2;
    mark.style.left = `${50 + Math.cos(angle) * 46}%`;
    mark.style.top = `${50 + Math.sin(angle) * 46}%`;
    mark.style.transform = "translate(-50%, -50%)";
    clockFace.append(mark);
  }
  for (let i = 0; i < 60; i += 1) {
    if (i % 5 === 0) continue;
    const tick = document.createElement("span");
    tick.className = "clock-tick";
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const radius = Math.max(clockFace.offsetWidth, 280) * 0.46;
    tick.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px)`;
    clockTicks.append(tick);
  }

  const typeWord = (word) => {
    momentWord.textContent = "";
    [...word].forEach((letter, index) => {
      window.setTimeout(() => {
        momentWord.textContent += letter;
      }, index * 42);
    });
  };

  const setNavTheme = () => {
    // Probe below the sticky nav so the nav itself does not steal the hit.
    const probeY = Math.min(window.innerHeight - 8, Math.max(88, nav.getBoundingClientRect().bottom + 12));
    const sample = document.elementsFromPoint(window.innerWidth / 2, probeY);
    const light = sample.find((node) => node instanceof Element && node.closest(".light"))?.closest(".light");
    nav.dataset.theme = light ? "light" : "dark";
    if (nav.classList.contains("open") && isPhone) nav.dataset.theme = "dark";
  };

  if (prefersReduced) {
    momentWord.textContent = "moment";
    loader.remove();
    const roast = document.querySelector(".tip-roast");
    if (roast) roast.style.opacity = "1";
    setNavTheme();
    window.addEventListener("scroll", setNavTheme, { passive: true });
    return;
  }

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    throw new Error("GSAP or ScrollTrigger failed to load.");
  }

  gsap.registerPlugin(ScrollTrigger);

  const SCRUB = window.BrewnnsScroll?.SCRUB ?? 0.5;
  const heroScrub = window.BrewnnsScroll?.heroScrollTrigger?.() ?? {
    trigger: ".hero",
    start: "top top",
    end: "bottom top",
    scrub: SCRUB,
  };
  const lenis = window.BrewnnsScroll?.bindSmoothScroll?.() ?? null;
  if (lenis) lenis.stop();

  document.body.style.overflow = "hidden";
  const intro = gsap.timeline({
    defaults: { ease: "power2.out" },
    onComplete: () => {
      document.body.style.overflow = "";
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
        lenis.start();
      } else {
        window.scrollTo(0, 0);
      }
      ScrollTrigger.refresh();
    },
  });
  const loadProxy = { n: 0 };
  intro.to(loadProxy, {
    n: 100,
    duration: 0.42,
    ease: "power1.inOut",
    onUpdate: () => {
      loaderCount.textContent = String(Math.round(loadProxy.n));
    },
  }, 0);
  intro.to(loaderFill, { height: "100%", duration: 0.42, ease: "power1.inOut" }, 0);
  intro.to(loader, { yPercent: -110, duration: 0.28, ease: "power3.inOut" }, "+=0.04");
  intro.set(loader, { display: "none" });

  gsap.set(".hero-copy > *", { y: 16, opacity: 0 });
  intro.to(".eyebrow", { y: 0, opacity: 1, duration: 0.2, ease: "power3.out" }, "-=0.12");
  intro.to(".hero-copy h1", { y: 0, opacity: 1, duration: 0.26, ease: "power3.out" }, "-=0.08");
  intro.add(() => typeWord("moment"), "<");
  intro.to(".lede", { y: 0, opacity: 1, duration: 0.2, ease: "power3.out" }, "-=0.08");
  intro.to(".text-link", { y: 0, opacity: 1, duration: 0.18, ease: "power3.out" }, "-=0.06");
  intro.from(".hero-meta span", { y: 8, opacity: 0, duration: 0.18, stagger: 0.04, ease: "power2.out" }, "-=0.08");
  intro.to(".tip-latte", { opacity: 1, y: 0, duration: 0.18 }, "-=0.1");
  intro.to(".tip-latte", { opacity: 0, y: -6, duration: 0.16 }, "+=0.12");
  intro.to(".tip-roast", { opacity: 1, y: 0, duration: 0.22 }, "-=0.04");

  gsap.to(".hero-copy", { scrollTrigger: heroScrub, y: -28, opacity: 0.72, ease: "none" });
  gsap.to(".hero-meta", { scrollTrigger: heroScrub, y: -12, opacity: 0.55, ease: "none" });
  gsap.to(".spot", { scrollTrigger: heroScrub, scale: 1.05, opacity: 0.55, ease: "none" });

  const favorites = document.querySelector(".favorites");
  const favLines = document.querySelectorAll(".fav-head h2 span");
  const favCopy = document.querySelector(".fav-head p");
  const favCards = document.querySelectorAll(".menu-card");
  const favShots = document.querySelectorAll(".shot-stage");
  const favCanvases = document.querySelectorAll(".fav-canvas");
  if (!favorites || !favLines.length || !favCopy || favCards.length !== 4 || favShots.length !== 4 || favCanvases.length !== 4) {
    throw new Error("Favorites section markup is missing.");
  }

  const favScroll = window.BrewnnsScroll?.favoritesScrollTrigger?.() ?? {
    trigger: ".favorites",
    start: "top 92%",
    end: "center 55%",
    scrub: SCRUB,
  };

  const favTl = gsap.timeline({ scrollTrigger: favScroll });
  favTl.from(favLines, { y: 18, ease: "none", duration: 0.28, stagger: 0.04 }, 0);
  favTl.from(favCopy, { y: 12, ease: "none", duration: 0.22 }, 0.06);
  favTl.from(".fav-all", { y: 8, ease: "none", duration: 0.18 }, 0.08);
  favTl.from(favCards, { y: 22, ease: "none", duration: 0.32, stagger: 0.05 }, 0.1);

  const favWire = window.BrewnnsFavorites;
  if (!favWire?.wireTimeline) {
    throw new Error("Favorites 3D scroll choreography failed to initialize.");
  }
  favWire.wireTimeline(favTl);

  gsap.fromTo(".menu-strip-label", { y: 12, opacity: 0 }, {
    y: 0,
    opacity: 1,
    scrollTrigger: { trigger: ".menu-strip", start: "top 88%", toggleActions: "play none none none" },
    duration: 0.4,
    ease: "power2.out",
  });
  gsap.fromTo(".menu-strip-track a", { y: 14, opacity: 0 }, {
    y: 0,
    opacity: 1,
    scrollTrigger: { trigger: ".menu-strip", start: "top 85%", toggleActions: "play none none none" },
    duration: 0.4,
    stagger: 0.03,
    ease: "power2.out",
  });

  gsap.fromTo(
    ".favorites .watermark",
    { x: 48 },
    {
      scrollTrigger: { trigger: favorites, start: "top 82%", end: "center center", scrub: SCRUB },
      x: 0,
      ease: "none",
    }
  );

  gsap.fromTo(".clock-kicker", { opacity: 0, x: -16 }, {
    opacity: 1,
    x: 0,
    scrollTrigger: { trigger: ".clock-sec", start: "top 78%", toggleActions: "play none none none" },
    duration: 0.4,
    ease: "power2.out",
  });
  gsap.fromTo(".clock-num", { opacity: 0 }, {
    opacity: 1,
    scrollTrigger: { trigger: ".clock-sec", start: "top 70%", toggleActions: "play none none none" },
    duration: 0.3,
    stagger: 0.015,
    ease: "power2.out",
  });
  gsap.fromTo(".clock-locs li", { y: 14, opacity: 0 }, {
    y: 0,
    opacity: 1,
    scrollTrigger: { trigger: ".clock-sec", start: "top 72%", toggleActions: "play none none none" },
    duration: 0.4,
    stagger: 0.06,
    ease: "power2.out",
  });
  gsap.fromTo(".clock-aside", { y: 14, opacity: 0 }, {
    y: 0,
    opacity: 1,
    scrollTrigger: { trigger: ".clock-sec", start: "top 68%", toggleActions: "play none none none" },
    duration: 0.45,
    ease: "power2.out",
  });

  gsap.fromTo(".city-sec h2", { y: 36 }, {
    y: 0,
    scrollTrigger: { trigger: ".city-sec", start: "top 88%", end: "top 42%", scrub: SCRUB },
    ease: "none",
  });

  const orderStage = document.querySelector(".crn-stage");
  if (!orderStage || !document.getElementById("coffee-right-now")) {
    throw new Error("Coffee for Right Now section markup is missing.");
  }
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    orderStage.addEventListener("pointermove", (event) => {
      const box = orderStage.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      orderStage.style.setProperty("--px", `${(x * 3).toFixed(2)}px`);
      orderStage.style.setProperty("--py", `${(y * 2).toFixed(2)}px`);
    });
    orderStage.addEventListener("pointerleave", () => {
      orderStage.style.setProperty("--px", "0px");
      orderStage.style.setProperty("--py", "0px");
    });
  }
  if (isPhone) {
    gsap.fromTo(".plate, .receipt, .crn-title span, .crn-copy, .crn-cta", { y: 10 }, {
      y: 0,
      duration: 0.45,
      stagger: 0.04,
      ease: "power2.out",
      scrollTrigger: { trigger: "#coffee-right-now", start: "top 80%", toggleActions: "play none none none" },
    });
  } else {
    const nowReveal = {
      trigger: "#coffee-right-now",
      start: "top 82%",
      end: "top 38%",
      scrub: SCRUB,
    };
    const nowTl = gsap.timeline({ scrollTrigger: nowReveal });
    nowTl.fromTo(".plate", { y: 16, opacity: 0.35 }, { y: 0, opacity: 1, ease: "none", duration: 0.28 }, 0);
    nowTl.fromTo(".matcha-slice, .matcha-cake", { opacity: 0.35 }, { opacity: 1, ease: "none", duration: 0.24 }, 0.18);
    nowTl.fromTo(".receipt", { y: 28, opacity: 0.2 }, { y: 0, opacity: 1, ease: "none", duration: 0.32 }, 0.32);
    nowTl.fromTo(".crn-title span", { y: 12, opacity: 0.45 }, { y: 0, opacity: 1, ease: "none", stagger: 0.04, duration: 0.22 }, 0.5);
    nowTl.fromTo(".crn-copy, .crn-cta", { y: 8, opacity: 0.4 }, { y: 0, opacity: 1, ease: "none", stagger: 0.04, duration: 0.18 }, 0.68);
  }
  const heroStage = document.getElementById("heroStage");
  const heroFloat = document.getElementById("heroFloat");
  if (!heroStage || !heroFloat) {
    throw new Error("Hero stage markup is missing.");
  }
  if (window.matchMedia("(min-width: 1101px)").matches) {
    ScrollTrigger.create({
      trigger: ".hero",
      start: "top top",
      endTrigger: ".favorites",
      end: "top 12%",
      pin: heroStage,
      pinSpacing: false,
      anticipatePin: 1,
    });
  }

  gsap.fromTo(".clock-hand", { rotation: -50 }, {
    rotation: 18,
    duration: 0.8,
    ease: "power2.out",
    scrollTrigger: { trigger: ".clock-sec", start: "top 70%", toggleActions: "play none none none" },
  });

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: setNavTheme,
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
  window.addEventListener("resize", () => ScrollTrigger.refresh());
})();
