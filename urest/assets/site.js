(() => {
  const canPlayMp4 = (video) => {
    try {
      return video.canPlayType('video/mp4').replace("no", "") !== "";
    } catch {
      return false;
    }
  };

  const swapVideoForFallback = (video) => {
    const fallbackSrc = video.dataset.fallbackSrc;

    if (!fallbackSrc || video.dataset.fallbackApplied === "true") {
      return;
    }

    const image = document.createElement("img");
    image.src = fallbackSrc;
    image.alt = video.getAttribute("aria-label") || "";
    image.loading = "lazy";
    image.decoding = "async";

    video.dataset.fallbackApplied = "true";
    video.replaceWith(image);
  };

  const loadLazyDemo = (video, { autoplay } = { autoplay: true }) => {
    if (video.dataset.loaded === "true") {
      if (autoplay) {
        const playAttempt = video.play();
        if (playAttempt && typeof playAttempt.catch === "function") {
          playAttempt.catch(() => {});
        }
      }
      return;
    }

    const videoSrc = video.dataset.videoSrc;
    if (!videoSrc) {
      return;
    }

    if (!canPlayMp4(video)) {
      swapVideoForFallback(video);
      return;
    }

    const source = document.createElement("source");
    source.src = videoSrc;
    source.type = "video/mp4";
    video.append(source);
    video.dataset.loaded = "true";

    video.addEventListener("error", () => swapVideoForFallback(video), { once: true });
    source.addEventListener("error", () => swapVideoForFallback(video), { once: true });

    video.load();

    if (autoplay) {
      const playAttempt = video.play();
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(() => {});
      }
    }
  };

  const isReadyToLoad = (element) => {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    return rect.top < viewportHeight * 0.85 && rect.bottom > viewportHeight * 0.15;
  };

  const initLazyDemos = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const demos = Array.from(document.querySelectorAll("video.lazy-demo"));

    if (demos.length === 0) {
      return;
    }

    let frameId = 0;

    const allHandled = () =>
      demos.every((video) =>
        video.dataset.loaded === "true" || video.dataset.fallbackApplied === "true");

    const maybeLoadVisibleDemos = () => {
      demos.forEach((video) => {
        if (video.dataset.loaded === "true" || video.dataset.fallbackApplied === "true") {
          return;
        }

        if (isReadyToLoad(video)) {
          loadLazyDemo(video, { autoplay: !prefersReducedMotion });
        }
      });

      if (allHandled()) {
        window.removeEventListener("scroll", scheduleCheck);
        window.removeEventListener("resize", scheduleCheck);
      }
    };

    const scheduleCheck = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        maybeLoadVisibleDemos();
      });
    };

    maybeLoadVisibleDemos();
    window.addEventListener("scroll", scheduleCheck, { passive: true });
    window.addEventListener("resize", scheduleCheck);

    demos.forEach((video) => {
      video.addEventListener("pointerenter", () => {
        loadLazyDemo(video, { autoplay: !prefersReducedMotion });
      }, { once: true });
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    initLazyDemos();
  });
})();
