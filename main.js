(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phoneQuery = window.matchMedia("(max-width: 980px)");
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
      }, index * 85);
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
    duration: 1.45,
    ease: "power1.inOut",
    onUpdate: () => {
      loaderCount.textContent = String(Math.round(loadProxy.n));
    },
  }, 0);
  intro.to(loaderFill, { height: "100%", duration: 1.45, ease: "power1.inOut" }, 0);
  intro.to(loader, { yPercent: -110, duration: 0.85, ease: "power3.inOut" }, "+=0.12");
  intro.set(loader, { display: "none" });

  gsap.set(".hero-copy > *", { y: 28, opacity: 0 });
  intro.to(".hero-copy > *", { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: "power3.out" }, "-=0.35");
  intro.add(() => typeWord("moment"), "-=0.55");
  intro.to(".tip-latte", { opacity: 1, y: 0, duration: 0.35 }, "+=0.55");
  intro.to(".tip-latte", { opacity: 0, y: -6, duration: 0.28 }, "+=0.9");
  intro.to(".tip-roast", { opacity: 1, y: 0, duration: 0.35 }, "-=0.05");
  intro.to(".tip-roast", { opacity: 0, y: -6, duration: 0.28 }, "+=1.0");

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

  gsap.from(".menu-strip-label", {
    scrollTrigger: { trigger: ".menu-strip", start: "top 88%" },
    y: 16,
    opacity: 0,
    duration: 0.45,
    ease: "power2.out",
  });
  gsap.from(".menu-strip-track a", {
    scrollTrigger: { trigger: ".menu-strip", start: "top 85%" },
    y: 22,
    opacity: 0,
    duration: 0.5,
    stagger: 0.04,
    ease: "power2.out",
  });

  gsap.fromTo(
    ".favorites .watermark",
    { opacity: 0, x: 60 },
    {
      scrollTrigger: { trigger: favorites, start: "top 82%", end: "center center", scrub: SCRUB },
      opacity: 1,
      x: 0,
      ease: "none",
    }
  );

  gsap.from(".clock-kicker", {
    scrollTrigger: { trigger: ".clock-sec", start: "top 78%" },
    opacity: 0,
    x: -20,
    duration: 0.45,
    ease: "power2.out",
  });
  gsap.from(".clock-num", {
    scrollTrigger: { trigger: ".clock-sec", start: "top 70%" },
    opacity: 0,
    duration: 0.35,
    stagger: 0.02,
    ease: "power2.out",
  });
  gsap.from(".clock-locs li", {
    scrollTrigger: { trigger: ".clock-sec", start: "top 72%" },
    y: 18,
    opacity: 0,
    duration: 0.45,
    stagger: 0.08,
    ease: "power2.out",
  });
  gsap.from(".clock-aside", {
    scrollTrigger: { trigger: ".clock-sec", start: "top 68%" },
    y: 20,
    opacity: 0,
    duration: 0.5,
    ease: "power2.out",
  });

  gsap.from(".city-sec h2", {
    scrollTrigger: { trigger: ".city-sec", start: "top 72%" },
    y: 50,
    opacity: 0,
    duration: 0.85,
    ease: "power3.out",
  });
  gsap.to(".city-sec h2", {
    scrollTrigger: { trigger: ".city-sec", start: "top bottom", end: "bottom top", scrub: SCRUB },
    y: -40,
    ease: "none",
  });

  gsap.from(".now-head h2 span", {
    scrollTrigger: { trigger: ".now-sec", start: "top 75%" },
    y: 40,
    opacity: 0,
    duration: 0.75,
    stagger: 0.06,
    ease: "power3.out",
  });
  gsap.from(".now-copy, .now-cta", {
    scrollTrigger: { trigger: ".now-sec", start: "top 72%" },
    y: 24,
    opacity: 0,
    duration: 0.6,
    stagger: 0.08,
    ease: "power2.out",
  });
  gsap.from(".still-life", {
    scrollTrigger: { trigger: ".now-sec", start: "top 72%" },
    y: 70,
    scale: 0.92,
    opacity: 0,
    duration: 0.7,
    ease: "power3.out",
  });
  gsap.to(".still-life", {
    scrollTrigger: { trigger: ".now-sec", start: "top 65%", end: "bottom top", scrub: SCRUB },
    scale: 1.08,
    y: -30,
    ease: "none",
  });
  gsap.to(".receipt", {
    scrollTrigger: { trigger: ".now-sec", start: "top 70%", end: "bottom top", scrub: SCRUB },
    y: -70,
    rotate: -4,
    ease: "none",
  });

  gsap.from(".site-footer", {
    scrollTrigger: { trigger: ".site-footer", start: "top 88%" },
    y: 28,
    opacity: 0,
    duration: 0.65,
    ease: "power3.out",
  });

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: setNavTheme,
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
  window.addEventListener("resize", () => ScrollTrigger.refresh());
})();
