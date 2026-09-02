/* Sky Pixel Alpha 18 highlighted-area overlay.
 * Load this file after the uNmINeD/OpenLayers map scripts.
 * Add or edit areas only in ALPHA_18_AREAS below.
 */
(function () {
  'use strict';

  const ALPHA_18_AREAS = [
    {
      name: 'Alpha 18 Area 1',
      points: [
        [-17353.7, -21948.1], [-15185.7, -22588.1], [-14089.7, -24292.1],
        [-13857.7, -26116.1], [-14465.7, -28388.1], [-19537.7, -28980.1],
        [-23680, -28132.1], [-26112, -27332.1], [-28672, -24708.1],
        [-28960, -19780.1], [-27936, -16164.1], [-23648, -15748.1],
        [-20064, -15748.1], [-19398.4, -16901.7], [-19462.4, -17861.7],
        [-19006.4, -18965.7], [-18542.4, -19645.7], [-18258.6, -20764.2],
        [-18130.6, -21372.2], [-17922.6, -21772.2], [-17362.6, -21948.2]
      ]
    },
    {
      name: 'Alpha 18 Area 2',
      points: [
        [-3516.7, -2269.3], [-3516.7, -2709.3], [-4044.7, -2933.3],
        [-4596.7, -3341.3], [-5012.7, -3445.3], [-5356.7, -3429.3],
        [-5380.7, -3253.3], [-5308.7, -3069.3], [-5612.7, -3125.3],
        [-5812.7, -3309.3], [-5924.7, -3517.3], [-6036.7, -3901.3],
        [-6212.7, -3925.3], [-6244.7, -3557.3], [-5980.7, -2965.3],
        [-5556.7, -2677.3], [-5036.7, -2573.3], [-4348.7, -2381.3],
        [-3508.7, -2277.3]
      ]
    },
    {
      name: 'Alpha 18 Area 3',
      points: [
        [-7546.3, 31017.3], [-1818.3, 30921.3], [-714.3, 26745.3],
        [-1914.3, 21497.3], [-5994.3, 19273.3], [-8554.3, 15593.3],
        [-9626.3, 14777.3], [-11626.3, 15665.3], [-12418.3, 15729.3],
        [-12770.3, 15281.3], [-12490.3, 14457.3], [-11418.3, 14329.3],
        [-9810.3, 13833.3], [-9682.3, 12161.3], [-11034.3, 12025.3],
        [-14734.6, 13477.6], [-16302.6, 15861.6], [-16862.6, 19061.6],
        [-14910.6, 22789.6], [-12956.1, 27893], [-12636.1, 31509],
        [-7548.1, 31029]
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
    toggle.title = 'Show or hide areas added in Alpha 18';

    toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.setAttribute('aria-label', 'Toggle Alpha 18 highlighted areas');
    toggleInput.addEventListener('change', function () {
      setAlpha18Visible(toggleInput.checked);
    });

    const toggleText = document.createElement('span');
    toggleText.textContent = 'Alpha 18 Areas';
    toggle.append(toggleInput, toggleText);
    document.body.appendChild(toggle);

    const backdrop = document.createElement('div');
    backdrop.className = 'sp-a18-backdrop';
    backdrop.innerHTML =
      '<section class="sp-a18-dialog" role="dialog" aria-modal="true" aria-labelledby="spA18Title">' +
        '<div class="sp-a18-kicker">Sky Pixel map version</div>' +
        '<h2 id="spA18Title">Current map: Volume 17.5</h2>' +
        '<p>This map shows the current Volume 17.5 release. Toggle Alpha 18 to see highlighted areas containing new Alpha 18 development.</p>' +
        '<div class="sp-a18-actions">' +
          '<button class="sp-a18-button" type="button" data-a18-dismiss>Not now</button>' +
          '<button class="sp-a18-button sp-a18-button--primary" type="button" data-a18-show>Show Alpha 18 areas</button>' +
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
