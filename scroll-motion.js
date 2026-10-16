(() => {
  const SCRUB = 0.5;

  function heroScrollTrigger() {
    return {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: SCRUB,
    };
  }

  function clockScrollTrigger() {
    return {
      trigger: ".clock-sec",
      start: "top 55%",
      end: "bottom top",
      scrub: SCRUB,
    };
  }

  function favoritesScrollTrigger() {
    return {
      trigger: ".favorites",
      start: "top 92%",
      end: "center 55%",
      scrub: SCRUB,
    };
  }

  function bindSmoothScroll() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return null;
    }
    if (typeof Lenis === "undefined" || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      return null;
    }

    const lenis = new Lenis({
      duration: 1.12,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.92,
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return lenis;
  }

  window.BrewnnsScroll = {
    SCRUB,
    heroScrollTrigger,
    clockScrollTrigger,
    favoritesScrollTrigger,
    bindSmoothScroll,
  };
})();
