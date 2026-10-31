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
   * Capability-based native scroll preference (not a Telegram-only UA hack).
   * iOS / WKWebView / in-app browsers must own vertical gestures — Lenis with
   * syncTouch:false can own document scroll while touch never drives it.
   */
  function isAppleTouchWebKit() {
    const ua = navigator.userAgent || "";
    const iOSDevice = /iP(hone|od|ad)/i.test(ua);
    // iPadOS desktop-UA mode still has multi-touch.
    const iPadDesktopUA =
      navigator.platform === "MacIntel"
      && typeof navigator.maxTouchPoints === "number"
      && navigator.maxTouchPoints > 1;
    return (iOSDevice || iPadDesktopUA) && /WebKit/i.test(ua);
  }

  function preferNativeScroll() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    // Any Apple touch WebKit (Safari + Telegram/WKWebView) → native document scroll.
    if (isAppleTouchWebKit()) return true;
    // Tablets + phones + any no-hover environment → native document scroll.
    if (window.matchMedia("(max-width: 1100px)").matches) return true;
    if (window.matchMedia("(pointer: coarse)").matches) return true;
    if (window.matchMedia("(hover: none)").matches) return true;
    if ((navigator.maxTouchPoints || 0) > 0
      && !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return true;
    }
    // Require clear desktop fine-pointer + hover before enabling Lenis.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return true;
    return false;
  }

  function bindSmoothScroll() {
    if (preferNativeScroll()) {
      document.documentElement.dataset.scrollMode = "native";
      document.documentElement.classList.remove("lenis", "lenis-smooth", "lenis-scrolling");
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
    isAppleTouchWebKit,
    heroScrollTrigger,
    heroTravelTrigger,
    clockScrollTrigger,
    favoritesScrollTrigger,
    cityScrollTrigger,
    bindSmoothScroll,
    revision: "web2-ios1",
  };
})();
