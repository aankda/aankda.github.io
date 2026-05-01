(() => {
  const script = document.currentScript;

  if (!script) {
    return;
  }

  const root = document.documentElement;
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const mediaQuery = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  const normalizeTheme = (value) => (value === "light" || value === "dark" ? value : null);

  const config = {
    storageKey: script.dataset.themeKey || "site-theme",
    explicitDefaultTheme: normalizeTheme(script.dataset.defaultTheme),
    defaultTheme: script.dataset.defaultTheme === "dark" ? "dark" : "light",
    lightThemeColor: script.dataset.lightThemeColor || "",
    darkThemeColor: script.dataset.darkThemeColor || ""
  };
  const authoredInlineTheme = normalizeTheme(root.getAttribute("data-theme"));

  const readStoredTheme = () => {
    try {
      return normalizeTheme(window.localStorage.getItem(config.storageKey));
    } catch {
      return null;
    }
  };

  const getSystemTheme = () => (mediaQuery?.matches ? "dark" : "light");

  const getPreferredTheme = () => {
    const storedTheme = readStoredTheme();
    if (storedTheme) {
      return storedTheme;
    }

    if (authoredInlineTheme) {
      return authoredInlineTheme;
    }

    if (config.explicitDefaultTheme) {
      return config.explicitDefaultTheme;
    }

    return getSystemTheme() || config.defaultTheme;
  };

  const syncThemeColor = (theme) => {
    if (!themeColorMeta) {
      return;
    }

    const color = theme === "dark" ? config.darkThemeColor : config.lightThemeColor;

    if (color) {
      themeColorMeta.setAttribute("content", color);
    }
  };

  const syncThemeButtons = (theme) => {
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const nextTheme = theme === "dark" ? "light" : "dark";
      button.dataset.themeState = theme;
      button.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
      button.setAttribute("title", `Switch to ${nextTheme} theme`);
      button.setAttribute("aria-pressed", String(theme === "light"));
    });
  };

  const applyTheme = (theme, { persist = false } = {}) => {
    const resolvedTheme = normalizeTheme(theme) || config.defaultTheme;
    root.setAttribute("data-theme", resolvedTheme);

    if (persist) {
      try {
        window.localStorage.setItem(config.storageKey, resolvedTheme);
      } catch {
        /* Ignore storage write failures. */
      }
    }

    syncThemeColor(resolvedTheme);
    syncThemeButtons(resolvedTheme);

    root.dispatchEvent(
      new CustomEvent("aankda:themechange", {
        detail: { theme: resolvedTheme }
      })
    );

    return resolvedTheme;
  };

  const bindThemeButtons = () => {
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      if (button.dataset.themeBound === "true") {
        return;
      }

      button.dataset.themeBound = "true";
      button.addEventListener("click", () => {
        const currentTheme = normalizeTheme(root.getAttribute("data-theme")) || config.defaultTheme;
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        applyTheme(nextTheme, { persist: true });
      });
    });
  };

  const init = () => {
    bindThemeButtons();
    syncThemeButtons(normalizeTheme(root.getAttribute("data-theme")) || config.defaultTheme);
  };

  if (!root.dataset.themeListenerBound) {
    root.dataset.themeListenerBound = "true";

    if (mediaQuery) {
      const handleSystemThemeChange = () => {
        if (!readStoredTheme()) {
          applyTheme(getPreferredTheme(), { persist: false });
        }
      };

      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleSystemThemeChange);
      } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(handleSystemThemeChange);
      }
    }
  }

  applyTheme(getPreferredTheme(), { persist: false });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.AANKDATheme = {
    getTheme: () => normalizeTheme(root.getAttribute("data-theme")) || config.defaultTheme,
    setTheme: (theme) => applyTheme(theme, { persist: true })
  };
})();
