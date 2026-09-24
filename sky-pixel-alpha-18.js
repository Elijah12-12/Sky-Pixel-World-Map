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
        [-11350.2, 15740.9], [-12486.2, 15900.9], [-13046.2, 15564.9],
        [-12774.2, 14620.9], [-11894.2, 14332.9], [-10470.2, 14108.9],
        [-9494.2, 12572.9], [-11174.2, 11884.9], [-14966.2, 13724.9],
        [-16582.2, 16364.9], [-15686.2, 21340.9], [-12950.2, 24876.9],
        [-12391.6, 30250.1], [-11031.6, 34122.1], [-7934.4, 38628.1],
        [-2894.4, 39300.1], [4897.6, 39812.1], [9697.6, 34212.1],
        [10724.1, 26823], [10836.1, 24423], [9812.1, 23719],
        [5924.1, 23543], [4612.1, 24727], [3108.1, 26935],
        [-1947.9, 25735], [-6809, 17181.5], [-8921, 14621.5],
        [-11369, 15757.5]
      ]
    },
    {
      name: 'Alpha 18 Area 2',
      points: [
        [-15210.1, -22125.3], [-16450.1, -22117.3], [-17906.1, -21701.3],
        [-18602.1, -20621.3], [-18738.1, -20229.3], [-18522.1, -19453.3],
        [-18490.1, -18861.3], [-19170.1, -17805.3], [-19466.1, -16485.3],
        [-20690.1, -15189.3], [-26653.3, -15423.7], [-28893.3, -17679.7],
        [-29293.3, -22543.7], [-27325.3, -27407.7], [-22153.1, -33271.7],
        [-17545.1, -34087.7], [-7977.1, -33351.7], [-7961.1, -28199.7],
        [-7897.1, -23735.7], [-9561.1, -23031.7], [-11961.1, -23191.7],
        [-11993.1, -23687.7], [-14809.1, -23671.7], [-14809.1, -22119.7],
        [-15241.1, -22119.7]
      ]
    },
    {
      name: 'Alpha 18 Area 3',
      points: [
        [-3586, -2596.5], [-4046, -2924.5], [-4478, -3184.5],
        [-4974, -3428.5], [-5290, -3468.5], [-5186, -3220.5],
        [-5514, -3160.5], [-5702, -3272.5], [-5866, -3304.5],
        [-5930, -3484.5], [-5934, -3664.5], [-6074, -3964.5],
        [-6294, -3684.5], [-6030, -2924.5], [-5170, -2552.5],
        [-4110, -2440.5], [-3598, -2408.5], [-3574, -2584.5]
      ]
    },
    {
      name: 'Alpha 18 Area 4',
      points: [
        [-14579.6, -9711.4], [-14663.6, -10099.4], [-14619.6, -10479.4],
        [-14707.6, -11551.4], [-14991.6, -11643.4], [-15815.6, -11675.4],
        [-16439.6, -11251.4], [-16747.6, -10175.4], [-16803.6, -9155.4],
        [-16843.6, -8215.4], [-15711.6, -8135.4], [-14783.6, -8375.4],
        [-13907.6, -9143.4], [-13543.6, -9631.4], [-13887.6, -9723.4],
        [-14583.6, -9723.4]
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
