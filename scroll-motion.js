(() => {
  // Small scrub = less catch-up lag. Lenis only smooths true desktop wheel input.
  const SCRUB = 0.08;

  function heroScrollTrigger() {
    return {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: SCRUB,
    };
  }

  // Desktop product travel continues through menu into Favorites — continuity, not a hard drop.
  function heroTravelTrigger() {
    return {
      trigger: ".hero",
      start: "top top",
      endTrigger: ".favorites",
      end: "top 28%",
      scrub: SCRUB,
    };
  }

  function clockScrollTrigger() {
    return {
      trigger: ".clock-sec",
      start: "top 70%",
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

  function cityScrollTrigger() {
    return {
      trigger: ".city-sec",
      start: "top bottom",
      end: "bottom top",
      scrub: SCRUB,
    };
  }

  /**
   * Lenis must stay desktop-wheel-only.
   * Telegram / WKWebView / Android WebView often report widths >760 in landscape
   * and/or lack a reliable coarse pointer — Lenis with syncTouch:false then
   * owns document scroll while touch never drives it (Issue C).
   */
  function preferNativeScroll() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    // Tablets + phones + any no-hover environment → native document scroll.
    if (window.matchMedia("(max-width: 1100px)").matches) return true;
    if (window.matchMedia("(pointer: coarse)").matches) return true;
    if (window.matchMedia("(hover: none)").matches) return true;
    // Require clear desktop fine-pointer + hover before enabling Lenis.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return true;
    return false;
  }

  function bindSmoothScroll() {
    if (preferNativeScroll()) {
      document.documentElement.dataset.scrollMode = "native";
      return null;
    }
    if (typeof Lenis === "undefined" || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      document.documentElement.dataset.scrollMode = "native";
      return null;
    }

    // Single Lenis instance — desktop wheel only; touch never hijacked.
    const lenis = new Lenis({
      duration: 0.72,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 0,
      wheelMultiplier: 1,
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(500, 33);

    document.documentElement.dataset.scrollMode = "lenis";
    return lenis;
  }

  window.BrewnnsScroll = {
    SCRUB,
    preferNativeScroll,
    heroScrollTrigger,
    heroTravelTrigger,
    clockScrollTrigger,
    favoritesScrollTrigger,
    cityScrollTrigger,
    bindSmoothScroll,
    revision: "web2-q3",
  };
})();
