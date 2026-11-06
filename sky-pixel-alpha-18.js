/* Sky Pixel Alpha 18.1 highlighted-area overlay.
 * Load this file after the uNmINeD/OpenLayers map scripts.
 * Add or edit areas only in ALPHA_18_AREAS below.
 */
(function () {
  'use strict';

  const ALPHA_18_AREAS = [
    {
      name: 'Developing Area 1',
      points: [
        [-14720.8, -23566], [-12224.8, -23614], [-11936.8, -22638],
        [-10016.8, -22654], [-9920.8, -18590], [-9472.8, -18590],
        [-9488.8, -19166], [-6912.8, -19070], [-6960.8, -16366],
        [-6896.8, -15678], [-4416.8, -15182], [-3840.8, -20398],
        [-3648.8, -28862], [-3461.1, -33047.6], [-8693.1, -34823.6],
        [-13765.1, -34583.6], [-15557.1, -31479.6], [-15637.1, -29127.6],
        [-15621.1, -27111.6], [-15250.5, -25791.4], [-14722.5, -23519.4]
      ]
    },
    {
      name: 'Developing Area 3',
      points: [
        [-11244.1, 31103.2], [-3628.1, 31135.2], [51.9, 29247.2],
        [2451.9, 26239.2], [-2380.1, 19263.2], [-8492.1, 15327.2],
        [-11660.1, 15903.2], [-12972.1, 15615.2], [-12844.1, 14527.2],
        [-10124.1, 14047.2], [-9580.1, 12255.2], [-15980.1, 13535.2],
        [-18860.1, 18591.2], [-11308.1, 31103.2]
      ]
    }
  ];

  let alpha18Layer = null;
  let alpha18Visible = false;
  let toggleInput = null;
  let mapInstance = null;

  function cssValue(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function closeRing(points) {
    const ring = points.slice();
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (!last || first[0] !== last[0] || first[1] !== last[1]) ring.push(first.slice());
    return ring;
  }

  function toViewCoordinate(point) {
    return ol.proj.transform(point, mapInstance.dataProjection, mapInstance.viewProjection);
  }

  function buildAlpha18Layer() {
    const source = new ol.source.Vector();
    ALPHA_18_AREAS.forEach(function (area) {
      const ring = closeRing(area.points).map(toViewCoordinate);
      const polygon = new ol.geom.Polygon([ring]);

      const areaFeature = new ol.Feature({ geometry: polygon, alpha18Area: area });
      areaFeature.setStyle(new ol.style.Style({
        fill: new ol.style.Fill({ color: cssValue('--sp-a18-fill', 'rgba(255,176,32,0.16)') }),
        stroke: new ol.style.Stroke({
          color: cssValue('--sp-a18-outline', 'rgba(255,196,82,0.96)'),
          width: 3,
          lineDash: [12, 8]
        })
      }));
      source.addFeature(areaFeature);

      const labelFeature = new ol.Feature({ geometry: polygon.getInteriorPoint(), alpha18Area: area });
      labelFeature.setStyle(new ol.style.Style({
        text: new ol.style.Text({
          text: area.name,
          font: '700 17px Arial, sans-serif',
          fill: new ol.style.Fill({ color: cssValue('--sp-a18-label', '#fff4d6') }),
          stroke: new ol.style.Stroke({ color: 'rgba(0,0,0,0.92)', width: 4 }),
          padding: [5, 8, 5, 8],
          backgroundFill: new ol.style.Fill({ color: 'rgba(10,14,22,0.72)' })
        })
      }));
      source.addFeature(labelFeature);
    });

    alpha18Layer = new ol.layer.Vector({ source: source, visible: false });
    if (typeof alpha18Layer.setZIndex === 'function') alpha18Layer.setZIndex(1750);
    mapInstance.olMap.addLayer(alpha18Layer);
  }

  function setAlpha18Visible(visible) {
    alpha18Visible = Boolean(visible);
    if (alpha18Layer) alpha18Layer.setVisible(alpha18Visible);
    if (toggleInput) toggleInput.checked = alpha18Visible;
  }

  function createInterface() {
    const toggle = document.createElement('label');
    toggle.className = 'sp-a18-toggle';
    toggle.title = 'Show or hide developing areas planned for later versions';

    toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.setAttribute('aria-label', 'Toggle developing areas for later versions');
    toggleInput.addEventListener('change', function () {
      setAlpha18Visible(toggleInput.checked);
    });

    const toggleCopy = document.createElement('span');
    toggleCopy.className = 'sp-a18-toggle-copy';

    const toggleText = document.createElement('span');
    toggleText.className = 'sp-a18-toggle-title';
    toggleText.textContent = 'Show developing areas for later versions';

    const toggleVersion = document.createElement('span');
    toggleVersion.className = 'sp-a18-toggle-version';
    toggleVersion.textContent = 'Current version: Alpha 18.1';

    toggleCopy.append(toggleText, toggleVersion);
    toggle.append(toggleInput, toggleCopy);
    document.body.appendChild(toggle);

    const backdrop = document.createElement('div');
    backdrop.className = 'sp-a18-backdrop';
    backdrop.innerHTML =
      '<section class="sp-a18-dialog" role="dialog" aria-modal="true" aria-labelledby="spA18Title">' +
        '<div class="sp-a18-kicker">Sky Pixel development map</div>' +
        '<h2 id="spA18Title">Show developing areas for later versions</h2>' +
        '<p class="sp-a18-current-version">Current version: Alpha 18.1</p>' +
        '<p>Turn on the overlay to view areas currently planned or under development for releases after Alpha 18.1.</p>' +
        '<div class="sp-a18-actions">' +
          '<button class="sp-a18-button" type="button" data-a18-dismiss>Not now</button>' +
          '<button class="sp-a18-button sp-a18-button--primary" type="button" data-a18-show>Show developing areas</button>' +
        '</div>' +
      '</section>';
    document.body.appendChild(backdrop);

    backdrop.querySelector('[data-a18-dismiss]').addEventListener('click', function () {
      backdrop.hidden = true;
    });
    backdrop.querySelector('[data-a18-show]').addEventListener('click', function () {
      setAlpha18Visible(true);
      backdrop.hidden = true;
    });
    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop) backdrop.hidden = true;
    });
  }

  function waitForMap() {
    let resolvedMap = null;
    try {
      // sky-pixel-main.js declares `const unmined`, which is globally accessible to
      // later classic scripts but is intentionally not attached to window.
      if (typeof unmined !== 'undefined') resolvedMap = unmined;
    } catch (error) {
      resolvedMap = null;
    }
    resolvedMap = resolvedMap || window.unmined || window.SkyPixelUnmined || null;

    if (window.ol && resolvedMap && resolvedMap.olMap && resolvedMap.dataProjection && resolvedMap.viewProjection) {
      mapInstance = resolvedMap;
      buildAlpha18Layer();
      setAlpha18Visible(alpha18Visible);
      return;
    }
    window.setTimeout(waitForMap, 150);
  }

  function start() {
    createInterface();
    waitForMap();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.SkyPixelAlpha18 = {
    areas: ALPHA_18_AREAS,
    setVisible: setAlpha18Visible,
    getVisible: function () { return alpha18Visible; }
  };
})();
