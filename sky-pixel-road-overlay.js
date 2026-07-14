/*
 * Sky Pixel Road Highlight Overlay
 *
 * Loads transparent PNG road-overlay tiles from:
 *   road-glow-tiles/
 *
 * The folder must mirror the normal uNmINeD tiles folder exactly,
 * except each file ends in .png instead of .jpeg.
 */
(() => {
  "use strict";

  const CACHE_VERSION = "road-overlay-1";

  const state = {
    map: null,
    source: null,
    layer: null,
    enabled: false,
    ready: false
  };

  function addToggle() {
    if (document.getElementById("skyPixelRoadOverlayToggle")) return;

    const button = document.createElement("button");
    button.id = "skyPixelRoadOverlayToggle";
    button.type = "button";
    button.className = "sky-pixel-road-overlay-toggle";
    button.setAttribute("aria-pressed", "false");
    button.textContent = "🛣 Road Highlight: Loading";

    const nightPanel = document.getElementById("skyPixelNightModePanel");
    const nightTools = document.querySelector(".sky-pixel-night-mode-tools");
    const toolsPanel = document.getElementById("skyPixelMapToolsPanel");

    if (nightPanel) {
      nightPanel.appendChild(button);
    } else if (nightTools) {
      nightTools.appendChild(button);
    } else if (toolsPanel) {
      toolsPanel.appendChild(button);
    } else {
      button.classList.add("sky-pixel-road-overlay-floating");
      document.body.appendChild(button);
    }

    button.addEventListener("click", () => {
      if (!state.ready) return;
      setEnabled(!state.enabled);
    });
  }

  function updateToggle() {
    const button = document.getElementById("skyPixelRoadOverlayToggle");
    if (!button) return;

    button.classList.toggle("is-active", state.enabled);
    button.classList.toggle("is-loading", !state.ready);
    button.setAttribute("aria-pressed", String(state.enabled));

    if (!state.ready) {
      button.textContent = "🛣 Road Highlight: Loading";
    } else {
      button.textContent = state.enabled
        ? "🛣 Road Highlight: On"
        : "🛣 Road Highlight";
    }
  }

  function getUnminedInstance() {
    try {
      if (typeof unmined !== "undefined" && unmined?.olMap) {
        return unmined;
      }
    } catch (_) {}

    if (window.unmined?.olMap) return window.unmined;
    return null;
  }

  function waitForMap() {
    const instance = getUnminedInstance();

    if (!instance?.olMap || !window.ol) {
      window.setTimeout(waitForMap, 300);
      return;
    }

    state.map = instance.olMap;

    try {
      createOverlayLayer();
      state.ready = true;
      updateToggle();
      console.info("[Sky Pixel Road Overlay] Ready.");
    } catch (error) {
      console.error("[Sky Pixel Road Overlay]", error);
      const button = document.getElementById("skyPixelRoadOverlayToggle");
      if (button) button.textContent = "🛣 Road Highlight: Error";
    }
  }

  function findBaseTileSource() {
    const layers = state.map.getLayers().getArray();

    for (const layer of layers) {
      if (layer?.get?.("skyPixelRoadOverlay")) continue;

      const source = layer?.getSource?.();
      if (
        source &&
        typeof source.getTileGrid === "function" &&
        typeof source.getTileUrlFunction === "function"
      ) {
        return source;
      }
    }

    throw new Error("Could not find the uNmINeD base tile source.");
  }

  function overlayUrlFromBaseUrl(url) {
    if (!url) return undefined;

    const cleanUrl = String(url).split("?")[0];

    return (
      cleanUrl
        .replace(/^(\.\/)?tiles\//, "$1road-glow-tiles/")
        .replace(/\.(?:jpeg|jpg|png)$/i, ".png") +
      "?v=" +
      CACHE_VERSION
    );
  }

  function createOverlayLayer() {
    const baseSource = findBaseTileSource();
    const baseUrlFunction = baseSource.getTileUrlFunction();

    state.source = new ol.source.XYZ({
      projection:
        baseSource.getProjection?.() ||
        state.map.getView().getProjection(),
      tileGrid: baseSource.getTileGrid(),
      tilePixelRatio:
        typeof baseSource.getTilePixelRatio === "function"
          ? baseSource.getTilePixelRatio(1)
          : 1,
      tileUrlFunction: tileCoordinate => {
        const normalUrl = baseUrlFunction(tileCoordinate);
        return overlayUrlFromBaseUrl(normalUrl);
      },
      wrapX: false
    });

    state.layer = new ol.layer.Tile({
      source: state.source,
      visible: false,
      opacity: 1,
      zIndex: 390
    });

    state.layer.set("title", "Road Highlight");
    state.layer.set("skyPixelRoadOverlay", true);
    state.map.addLayer(state.layer);
  }

  function setEnabled(enabled) {
    state.enabled = Boolean(enabled);
    state.layer?.setVisible(state.enabled);

    if (state.enabled) {
      state.source?.refresh();
    }

    updateToggle();
  }

  function start() {
    addToggle();
    updateToggle();
    waitForMap();

    window.SkyPixelRoadOverlay = {
      show: () => setEnabled(true),
      hide: () => setEnabled(false),
      toggle: () => setEnabled(!state.enabled),
      refresh: () => state.source?.refresh()
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
