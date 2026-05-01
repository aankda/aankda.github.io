(() => {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (prefersReducedMotion.matches) {
    return;
  }

  const state = {
    x: 74,
    y: 18,
    frame: 0,
  };

  const applyAmbient = () => {
    root.style.setProperty("--ambient-x", `${state.x.toFixed(2)}%`);
    root.style.setProperty("--ambient-y", `${state.y.toFixed(2)}%`);
    state.frame = 0;
  };

  const queueApply = () => {
    if (state.frame) {
      return;
    }

    state.frame = window.requestAnimationFrame(applyAmbient);
  };

  const handlePointerMove = (event) => {
    const { innerWidth, innerHeight } = window;

    if (!innerWidth || !innerHeight) {
      return;
    }

    state.x = Math.max(16, Math.min(84, (event.clientX / innerWidth) * 100));
    state.y = Math.max(10, Math.min(36, (event.clientY / innerHeight) * 100));
    queueApply();
  };

  const resetAmbient = () => {
    state.x = 74;
    state.y = 18;
    queueApply();
  };

  root.style.setProperty("--ambient-x", `${state.x}%`);
  root.style.setProperty("--ambient-y", `${state.y}%`);

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerout", (event) => {
    if (!event.relatedTarget) {
      resetAmbient();
    }
  });
})();
