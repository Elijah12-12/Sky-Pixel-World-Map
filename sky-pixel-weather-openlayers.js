/*
 * Sky Pixel Live Weather Heat Map — OpenLayers / uNmINeD edition
 * Version 1.0
 *
 * Load this file AFTER uNmINeD has created `unmined.olMap`.
 * Open-Meteo attribution: https://open-meteo.com/
 */
(() => {
  "use strict";

  const DEFAULT_STATIONS = [
    // Exact Sky Pixel coordinates currently known.
    // Reference coordinates can be edited here later without touching index.html.
    { name: "Octavian",     x: -31.5,    z: 120.5,    lat: 38.5816, lon: -121.4944, reference: "Sacramento, CA" },
    { name: "Razalia",      x: -2416.5,  z: -2320.5,  lat: 47.6062, lon: -122.3321, reference: "Seattle, WA" },
    { name: "Harlow",       x: -2885.5,  z: -3465.5,  lat: 49.2827, lon: -123.1207, reference: "Vancouver, BC" },
    { name: "Elowah",       x: -5650.5,  z: -4527.5,  lat: 49.3200, lon: -123.0724, reference: "North Vancouver, BC" },
    { name: "La Morley",    x: -5132.5,  z: 4916.5,   lat: 29.9511, lon: -90.0715,  reference: "New Orleans, LA" },
    { name: "Little Ellie", x: -13070.5, z: -11698.5, lat: 60.1042, lon: -149.4422, reference: "Seward, AK" },
    { name: "L’Eulàlia",    x: 8648.5,   z: 21891.5,  lat: 43.2965, lon: 5.3698,    reference: "Marseille, France" },
    { name: "Valance",      x: 1725.5,   z: -951.5,   lat: 38.4405, lon: -122.7144, reference: "Santa Rosa, CA" },

    // Climate-control anchors. These shape the field but are not shown as city labels.
    { name: "Shaili Desert Basin", x: 2395.5, z: 14144.5, lat: 33.4484, lon: -112.0740, reference: "Phoenix, AZ", hidden: true },
    { name: "Mount Noraker", x: -13479.5, z: -22321.5, lat: 61.2176, lon: -149.8997, reference: "Anchorage, AK", hidden: true, offsetF: -18 },
    { name: "La Baie d’Ellie", x: -15654.5, z: -21138.5, lat: 58.3019, lon: -134.4197, reference: "Juneau, AK", hidden: true, offsetF: -5 }
  ];

  const CONFIG = {
    refreshMinutes: 20,
    mode: "temperature_2m",
    opacity: 0.58,
    interpolationPower: 2.2,
    minimumDistanceBlocks: 300,
    canvasScale: 0.42,
    maxCanvasDimension: 900,
    showLabels: true,
    zIndex: 420,
    // Standard uNmINeD/OpenLayers mapping: Minecraft X/Z -> [X, -Z].
    // Change zSign to +1 from the panel if the overlay is vertically mirrored.
    zSign: -1,
    stations: Array.isArray(window.SKY_PIXEL_WEATHER_STATIONS)
      ? window.SKY_PIXEL_WEATHER_STATIONS
      : DEFAULT_STATIONS
  };

  const state = {
    map: null,
    layer: null,
    source: null,
    labelLayer: null,
    weather: [],
    enabled: false,
    loading: false,
    lastUpdated: null,
    panel: null,
    pointerPopup: null,
    hoverEnabled: true
  };

  function waitForMap() {
    const map = window.unmined?.olMap || window.skyPixelMap;
    if (map && typeof map.addLayer === "function" && window.ol) {
      state.map = map;
      initialize();
      return;
    }
    setTimeout(waitForMap, 400);
  }

  function worldToMap(x, z) {
    // uNmINeD normally uses [Minecraft X, negative Minecraft Z].
    return [Number(x), Number(z) * CONFIG.zSign];
  }

  function mapToWorld(coordinate) {
    return [coordinate[0], coordinate[1] / CONFIG.zSign];
  }

  function buildApiUrl() {
    const stations = CONFIG.stations;
    const params = new URLSearchParams({
      latitude: stations.map(s => s.lat).join(","),
      longitude: stations.map(s => s.lon).join(","),
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      timezone: "auto"
    });
    return "https://api.open-meteo.com/v1/forecast?" + params.toString();
  }

  async function refreshWeather() {
    if (state.loading) return;
    state.loading = true;
    setStatus("Loading live weather…");

    try {
      const response = await fetch(buildApiUrl(), { cache: "no-store" });
      if (!response.ok) throw new Error("Open-Meteo returned " + response.status);
      const raw = await response.json();
      const rows = Array.isArray(raw) ? raw : [raw];

      state.weather = CONFIG.stations.map((station, index) => {
        const current = rows[index]?.current || {};
        const offset = Number(station.offsetF || 0);
        return {
          ...station,
          mapCoordinate: worldToMap(station.x, station.z),
          temperature_2m: finite(current.temperature_2m) ? Number(current.temperature_2m) + offset : NaN,
          apparent_temperature: finite(current.apparent_temperature) ? Number(current.apparent_temperature) + offset : NaN,
          relative_humidity_2m: finite(current.relative_humidity_2m) ? Number(current.relative_humidity_2m) : NaN,
          wind_speed_10m: finite(current.wind_speed_10m) ? Number(current.wind_speed_10m) : NaN,
          weather_code: finite(current.weather_code) ? Number(current.weather_code) : NaN
        };
      }).filter(item => finite(item.temperature_2m));

      state.lastUpdated = new Date();
      redraw();
      rebuildLabels();
      setStatus("Updated " + state.lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    } catch (error) {
      console.error("[Sky Pixel Weather Heat Map]", error);
      setStatus("Weather failed to load — " + error.message);
    } finally {
      state.loading = false;
    }
  }

  function finite(value) {
    return Number.isFinite(Number(value));
  }

  function interpolate(mapX, mapY, property = CONFIG.mode) {
    if (!state.weather.length) return null;

    let weighted = 0;
    let totalWeight = 0;
    let nearest = null;
    let nearestDistance = Infinity;

    for (const station of state.weather) {
      const dx = mapX - station.mapCoordinate[0];
      const dy = mapY - station.mapCoordinate[1];
      const distance = Math.hypot(dx, dy);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = station;
      }

      const value = Number(station[property]);
      if (!Number.isFinite(value)) continue;

      const adjustedDistance = Math.max(CONFIG.minimumDistanceBlocks, distance);
      const weight = 1 / Math.pow(adjustedDistance, CONFIG.interpolationPower);
      weighted += value * weight;
      totalWeight += weight;
    }

    if (!totalWeight) return null;

    return {
      value: weighted / totalWeight,
      nearest,
      nearestDistance
    };
  }

  function colorForTemperature(tempF) {
    const stops = [
      [-25, [48, 18, 92]],
      [-10, [61, 49, 155]],
      [10,  [43, 108, 176]],
      [32,  [50, 155, 196]],
      [50,  [123, 204, 196]],
      [62,  [186, 228, 168]],
      [72,  [255, 246, 171]],
      [82,  [254, 204, 115]],
      [92,  [249, 142, 82]],
      [102, [224, 67, 55]],
      [112, [165, 22, 47]],
      [125, [92, 12, 48]]
    ];

    if (tempF <= stops[0][0]) return stops[0][1];
    if (tempF >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];

    for (let i = 0; i < stops.length - 1; i++) {
      const [t0, c0] = stops[i];
      const [t1, c1] = stops[i + 1];
      if (tempF >= t0 && tempF <= t1) {
        const f = (tempF - t0) / (t1 - t0);
        return c0.map((value, channel) =>
          Math.round(value + (c1[channel] - value) * f)
        );
      }
    }
    return [255, 255, 255];
  }

  function canvasFunction(extent, resolution, pixelRatio, size) {
    const targetWidth = Math.max(2, Math.min(CONFIG.maxCanvasDimension, Math.round(size[0] * CONFIG.canvasScale)));
    const targetHeight = Math.max(2, Math.min(CONFIG.maxCanvasDimension, Math.round(size[1] * CONFIG.canvasScale)));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d", { alpha: true });
    const image = ctx.createImageData(targetWidth, targetHeight);

    const widthMapUnits = extent[2] - extent[0];
    const heightMapUnits = extent[3] - extent[1];

    for (let py = 0; py < targetHeight; py++) {
      const mapY = extent[3] - (py / Math.max(1, targetHeight - 1)) * heightMapUnits;

      for (let px = 0; px < targetWidth; px++) {
        const mapX = extent[0] + (px / Math.max(1, targetWidth - 1)) * widthMapUnits;
        const sample = interpolate(mapX, mapY);
        const index = (py * targetWidth + px) * 4;

        if (!sample || !Number.isFinite(sample.value)) {
          image.data[index + 3] = 0;
          continue;
        }

        const [r, g, b] = colorForTemperature(sample.value);
        image.data[index] = r;
        image.data[index + 1] = g;
        image.data[index + 2] = b;
        image.data[index + 3] = 238;
      }
    }

    ctx.putImageData(image, 0, 0);

    // OpenLayers sizes the returned canvas to the map viewport.
    canvas.style.width = size[0] + "px";
    canvas.style.height = size[1] + "px";
    canvas.style.imageRendering = "auto";
    return canvas;
  }

  function createHeatLayer() {
    if (!window.ol?.source?.ImageCanvas || !window.ol?.layer?.Image) {
      throw new Error("This OpenLayers build does not expose ol.source.ImageCanvas.");
    }

    state.source = new ol.source.ImageCanvas({
      canvasFunction,
      projection: state.map.getView().getProjection(),
      ratio: 1
    });

    state.layer = new ol.layer.Image({
      source: state.source,
      opacity: CONFIG.opacity,
      visible: false,
      zIndex: CONFIG.zIndex
    });

    state.layer.set("title", "Live Weather Heat Map");
    state.layer.set("skyPixelWeatherLayer", true);
    state.map.addLayer(state.layer);
  }

  function rebuildLabels() {
    if (!CONFIG.showLabels || !window.ol?.layer?.Vector || !window.ol?.source?.Vector) return;

    if (state.labelLayer) state.map.removeLayer(state.labelLayer);

    const features = state.weather
      .filter(station => !station.hidden)
      .map(station => {
        const feature = new ol.Feature({
          geometry: new ol.geom.Point(station.mapCoordinate),
          station
        });
        return feature;
      });

    state.labelLayer = new ol.layer.Vector({
      source: new ol.source.Vector({ features }),
      visible: state.enabled,
      zIndex: CONFIG.zIndex + 1,
      declutter: true,
      style: feature => {
        const station = feature.get("station");
        const value = station[CONFIG.mode];
        return new ol.style.Style({
          text: new ol.style.Text({
            text: Math.round(value) + "°",
            font: "700 11px system-ui, sans-serif",
            fill: new ol.style.Fill({ color: "#ffffff" }),
            stroke: new ol.style.Stroke({ color: "rgba(0,0,0,.9)", width: 3 }),
            backgroundFill: new ol.style.Fill({ color: "rgba(20,24,31,.72)" }),
            padding: [3, 5, 3, 5],
            offsetY: -14
          })
        });
      }
    });

    state.labelLayer.set("skyPixelWeatherLabels", true);
    state.map.addLayer(state.labelLayer);
  }

  function redraw() {
    if (state.source) state.source.changed();
    if (state.labelLayer) state.labelLayer.changed();
  }

  function setEnabled(enabled) {
    state.enabled = Boolean(enabled);
    state.layer?.setVisible(state.enabled);
    state.labelLayer?.setVisible(state.enabled);
    state.panel?.classList.toggle("is-active", state.enabled);

    const toggle = document.getElementById("sp-weather-toggle");
    if (toggle) toggle.checked = state.enabled;

    if (state.enabled && !state.weather.length) refreshWeather();
  }

  function setMode(mode) {
    if (!["temperature_2m", "apparent_temperature"].includes(mode)) return;
    CONFIG.mode = mode;
    redraw();
    rebuildLabels();
  }

  function addPanel() {
    const panel = document.createElement("section");
    panel.id = "sky-pixel-weather-panel";
    panel.innerHTML = `
      <div class="sp-weather-heading">
        <span>🌡️ Live Weather Heat Map</span>
        <button id="sp-weather-collapse" type="button" aria-label="Collapse weather panel">−</button>
      </div>

      <div class="sp-weather-content">
        <label class="sp-weather-switch-row">
          <span>Show heat map</span>
          <input id="sp-weather-toggle" type="checkbox">
        </label>

        <label class="sp-weather-field">
          <span>Weather layer</span>
          <select id="sp-weather-mode">
            <option value="temperature_2m">Temperature</option>
            <option value="apparent_temperature">Feels like</option>
          </select>
        </label>

        <label class="sp-weather-field">
          <span>Opacity <strong id="sp-weather-opacity-value">${Math.round(CONFIG.opacity * 100)}%</strong></span>
          <input id="sp-weather-opacity" type="range" min="0.15" max="0.90" step="0.05" value="${CONFIG.opacity}">
        </label>

        <label class="sp-weather-switch-row sp-weather-small">
          <span>City temperature labels</span>
          <input id="sp-weather-label-toggle" type="checkbox" checked>
        </label>

        <label class="sp-weather-field sp-weather-small">
          <span>Map orientation</span>
          <select id="sp-weather-orientation">
            <option value="-1">Standard uNmINeD</option>
            <option value="1">Flip north/south</option>
          </select>
        </label>

        <div class="sp-weather-legend-labels">
          <span>Cold</span><span>Mild</span><span>Hot</span><span>Extreme</span>
        </div>
        <div class="sp-weather-gradient"></div>

        <div class="sp-weather-buttons">
          <button id="sp-weather-refresh" type="button">Refresh</button>
        </div>

        <div id="sp-weather-status">Preparing weather layer…</div>
        <div class="sp-weather-credit">Weather data: Open-Meteo</div>
      </div>
    `;

    document.body.appendChild(panel);
    state.panel = panel;

    panel.querySelector("#sp-weather-collapse").addEventListener("click", event => {
      panel.classList.toggle("is-collapsed");
      event.currentTarget.textContent = panel.classList.contains("is-collapsed") ? "+" : "−";
    });

    panel.querySelector("#sp-weather-toggle").addEventListener("change", event => {
      setEnabled(event.target.checked);
    });

    panel.querySelector("#sp-weather-mode").addEventListener("change", event => {
      setMode(event.target.value);
    });

    panel.querySelector("#sp-weather-opacity").addEventListener("input", event => {
      CONFIG.opacity = Number(event.target.value);
      state.layer?.setOpacity(CONFIG.opacity);
      panel.querySelector("#sp-weather-opacity-value").textContent = Math.round(CONFIG.opacity * 100) + "%";
    });

    panel.querySelector("#sp-weather-label-toggle").addEventListener("change", event => {
      CONFIG.showLabels = event.target.checked;
      if (CONFIG.showLabels) rebuildLabels();
      else if (state.labelLayer) {
        state.map.removeLayer(state.labelLayer);
        state.labelLayer = null;
      }
    });

    panel.querySelector("#sp-weather-orientation").addEventListener("change", event => {
      CONFIG.zSign = Number(event.target.value);
      state.weather.forEach(station => {
        station.mapCoordinate = worldToMap(station.x, station.z);
      });
      redraw();
      rebuildLabels();
    });

    panel.querySelector("#sp-weather-refresh").addEventListener("click", refreshWeather);
  }

  function setStatus(message) {
    const status = document.getElementById("sp-weather-status");
    if (status) status.textContent = message;
  }

  function addHoverPopup() {
    const popup = document.createElement("div");
    popup.id = "sky-pixel-weather-hover";
    popup.hidden = true;
    state.map.getTargetElement().appendChild(popup);
    state.pointerPopup = popup;

    state.map.on("pointermove", event => {
      if (!state.enabled || event.dragging || !state.weather.length || !state.hoverEnabled) {
        popup.hidden = true;
        return;
      }

      const sample = interpolate(event.coordinate[0], event.coordinate[1]);
      if (!sample) {
        popup.hidden = true;
        return;
      }

      const world = mapToWorld(event.coordinate);
      const station = sample.nearest;
      const apparent = interpolate(event.coordinate[0], event.coordinate[1], "apparent_temperature");
      const humidity = interpolate(event.coordinate[0], event.coordinate[1], "relative_humidity_2m");
      const wind = interpolate(event.coordinate[0], event.coordinate[1], "wind_speed_10m");

      popup.innerHTML = `
        <strong>${Math.round(sample.value)}°F</strong>
        <span>Feels like ${apparent ? Math.round(apparent.value) : "—"}°F</span>
        <span>Humidity ${humidity ? Math.round(humidity.value) : "—"}%</span>
        <span>Wind ${wind ? Math.round(wind.value) : "—"} mph</span>
        <small>X ${Math.round(world[0]).toLocaleString()} · Z ${Math.round(world[1]).toLocaleString()}</small>
        <small>Nearest anchor: ${station?.name || "—"}</small>
      `;

      const pixel = state.map.getPixelFromCoordinate(event.coordinate);
      popup.style.left = pixel[0] + 16 + "px";
      popup.style.top = pixel[1] + 16 + "px";
      popup.hidden = false;
    });

    state.map.getViewport().addEventListener("mouseleave", () => {
      popup.hidden = true;
    });
  }

  function initialize() {
    try {
      createHeatLayer();
      addPanel();
      addHoverPopup();
      refreshWeather();
      setInterval(refreshWeather, CONFIG.refreshMinutes * 60 * 1000);

      // Public control API for future integration with your main tools panel.
      window.SkyPixelWeatherHeatMap = {
        show: () => setEnabled(true),
        hide: () => setEnabled(false),
        toggle: () => setEnabled(!state.enabled),
        refresh: refreshWeather,
        setMode,
        getStations: () => state.weather.slice(),
        config: CONFIG,
        layer: state.layer
      };

      console.info("[Sky Pixel Weather Heat Map] OpenLayers module ready.");
    } catch (error) {
      console.error("[Sky Pixel Weather Heat Map]", error);
      addPanel();
      setStatus("Could not initialize: " + error.message);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForMap);
  } else {
    waitForMap();
  }
})();
