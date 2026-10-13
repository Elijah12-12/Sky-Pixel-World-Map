/* Sky Pixel Bedrock Volume 17.5 availability overlay.
 * Load after sky-pixel-main.js. This overlay is independent of Alpha 18.
 */
(function () {
  'use strict';

  const VOLUME_17_5_AREAS = [
    {
      name: 'Volume 17.5 Area 1',
      points: [
        [6468, 23508.9], [10084, 23572.9], [10948, 20212.9], [8036, 17684.9],
        [4260, 11476.9], [5476, 11540.9], [5860, 7412.9], [4036, 6356.9],
        [1476, 6068.9], [1092, 4276.9], [3076, 2740.9], [6212, 2644.9],
        [6424.4, -4173.8], [1336.4, -2861.8], [-290.6, -3937], [-74.6, -6329],
        [-378.6, -6497], [-858.6, -6073], [-1311.5, -8495.7], [-1823.5, -8695.7],
        [-2231.5, -9847.7], [-2143.5, -12271.7], [-3279.5, -12911.7],
        [-4473.4, -12896.3], [-4329.4, -13528.3], [-4097.4, -14216.3],
        [-4697.4, -15432.3], [-6257.4, -16272.3], [-6969.4, -16056.3],
        [-6929.4, -16544.3], [-6897.4, -17416.3], [-6808, -19191.5],
        [-9520, -19247.5], [-9456, -18647.5], [-9944, -18639.5],
        [-9953.4, -22652], [-11953.4, -22692], [-12009.4, -23652],
        [-14817.4, -23652], [-14849.4, -22980], [-14873.4, -21980],
        [-17897.4, -21932], [-18105.4, -21756], [-18185.4, -19012],
        [-19056.5, -17825.8], [-19408.5, -16769.8], [-19400.5, -14873.8],
        [-19671.4, -12148], [-17023.4, -12084], [-15429.5, -11472.5],
        [-14781.5, -11544.5], [-14669.5, -11024.5], [-14813.5, -10456.5],
        [-14661.5, -9936.5], [-13677.5, -9816.5], [-13413.5, -8920.5],
        [-12993.1, -7262.7], [-9105.1, -5174.7], [-8596.3, -449.3],
        [-6588.3, 1126.7], [-6172.3, 3792.2], [-7724.3, 4992.2],
        [-8524.3, 5704.2], [-9076.3, 8240.2], [-10463.1, 9765.7],
        [-10495.1, 11429.7], [-10306.2, 12448.9], [-10226.2, 13776.9],
        [-11410.2, 14480.9], [-12946.2, 14536.9], [-12866.2, 15704.9],
        [-11066.2, 15816.9], [-9002.2, 14080.9], [-8162.2, 12304.9],
        [-6146.2, 11560.9], [-5436.5, 9481.2], [-4532.5, 9257.2],
        [-4492.5, 7265.2], [-3606.8, 5870.9], [-2630.8, 5990.9],
        [-1286.8, 6534.9], [-1718.8, 6710.9], [-1750.1, 10740.9],
        [-697.3, 10969.8], [877.1, 13608.9], [1454.8, 15847.2],
        [2302.8, 16583.2], [3822.8, 17951.2], [4054.8, 19399.2],
        [5864.1, 20420.4], [6536.1, 21004.4], [6480.1, 23524.4]
      ]
    },
    {
      name: 'Volume 17.5 Area 2',
      points: [
        [7904.3, -2651.6], [7896.3, -1339.6], [7488.3, -1187.6],
        [7592.3, -459.6], [8024.3, -491.6], [8424.3, 52.4],
        [9688.3, 92.4], [9632.3, -467.6], [9264.3, -1067.6],
        [9352.3, -1283.6], [9360.3, -2731.6], [8000.3, -2683.6],
        [7920.3, -2635.6]
      ]
    },
    {
      name: 'Volume 17.5 Area 3',
      points: [
        [15021.2, -6871.2], [16221.2, -6967.2], [16365.2, -8367.2],
        [16613.2, -8543.2], [16677.2, -9727.2], [18165.2, -9719.2],
        [18157.2, -11119.2], [17781.2, -12151.2], [16581.2, -12199.2],
        [16549.2, -11031.2], [15549.2, -10991.2], [15445.2, -10423.2],
        [14261.2, -10431.2], [14269.2, -10935.2], [13005.2, -10975.2],
        [13093.2, -7359.2], [15021.2, -6863.2]
      ]
    },
    {
      name: 'Volume 17.5 Area 4',
      points: [
        [20331.3, -2111.7], [20343.3, -827.7], [21635.3, -843.7],
        [21627.3, -2115.7], [20339.3, -2111.7]
      ]
    }
  ];

  const WORLD_LIMIT = 30000000;
  let volumeLayer = null;
  let volumeVisible = false;
  let toggleInput = null;
  let mapInstance = null;

  function cssValue(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function closeRing(points) {
    const ring = points.map(function (point) { return point.slice(); });
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (!last || first[0] !== last[0] || first[1] !== last[1]) ring.push(first.slice());
    return ring;
  }

  function signedArea(ring) {
    let area = 0;
    for (let index = 0; index < ring.length - 1; index += 1) {
      area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
    }
    return area / 2;
  }

  function orientRing(ring, clockwise) {
    const isClockwise = signedArea(ring) < 0;
    return isClockwise === clockwise ? ring : ring.slice().reverse();
  }

  function toViewCoordinate(point) {
    return ol.proj.transform(point, mapInstance.dataProjection, mapInstance.viewProjection);
  }

  function buildVolumeLayer() {
    const source = new ol.source.Vector();
    const outerDataRing = orientRing(closeRing([
      [-WORLD_LIMIT, -WORLD_LIMIT],
      [-WORLD_LIMIT, WORLD_LIMIT],
      [WORLD_LIMIT, WORLD_LIMIT],
      [WORLD_LIMIT, -WORLD_LIMIT]
    ]), false);

    const maskRings = [outerDataRing].concat(VOLUME_17_5_AREAS.map(function (area) {
      return orientRing(closeRing(area.points), true);
    }));
    const maskGeometry = new ol.geom.Polygon(maskRings.map(function (ring) {
      return ring.map(toViewCoordinate);
    }));

    const maskFeature = new ol.Feature({ geometry: maskGeometry, volume175Mask: true });
    maskFeature.setStyle(new ol.style.Style({
      fill: new ol.style.Fill({
        color: cssValue('--sp-v175-mask', 'rgba(72, 78, 88, 0.64)')
      })
    }));
    source.addFeature(maskFeature);

    VOLUME_17_5_AREAS.forEach(function (area) {
      const boundary = new ol.geom.Polygon([
        closeRing(area.points).map(toViewCoordinate)
      ]);
      const feature = new ol.Feature({ geometry: boundary, volume175Area: area });
      feature.setStyle(new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(0, 0, 0, 0)' }),
        stroke: new ol.style.Stroke({
          color: cssValue('--sp-v175-outline', 'rgba(80, 190, 255, 0.98)'),
          width: 3,
          lineDash: [10, 7]
        })
      }));
      source.addFeature(feature);
    });

    volumeLayer = new ol.layer.Vector({ source: source, visible: false });
    if (typeof volumeLayer.setZIndex === 'function') volumeLayer.setZIndex(1700);
    mapInstance.olMap.addLayer(volumeLayer);
  }

  function setVisible(visible) {
    volumeVisible = Boolean(visible);
    if (volumeLayer) volumeLayer.setVisible(volumeVisible);
    if (toggleInput) toggleInput.checked = volumeVisible;
  }

  function createInterface() {
    const toggle = document.createElement('label');
    toggle.className = 'sp-v175-toggle';
    toggle.title = 'Show the areas available in the Bedrock Volume 17.5 world';

    toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.setAttribute('aria-label', 'Toggle Bedrock Volume 17.5 available areas');
    toggleInput.addEventListener('change', function () { setVisible(toggleInput.checked); });

    const copy = document.createElement('span');
    copy.className = 'sp-v175-toggle-copy';
    const title = document.createElement('span');
    title.className = 'sp-v175-toggle-title';
    title.textContent = 'Show Bedrock Volume 17.5 areas';
    const note = document.createElement('span');
    note.className = 'sp-v175-toggle-note';
    note.textContent = 'Bedrock only — not Java Alpha 18 and forward';
    copy.append(title, note);
    toggle.append(toggleInput, copy);
    document.body.appendChild(toggle);
  }

  function waitForMap() {
    let resolvedMap = null;
    try {
      if (typeof unmined !== 'undefined') resolvedMap = unmined;
    } catch (error) {
      resolvedMap = null;
    }
    resolvedMap = resolvedMap || window.unmined || window.SkyPixelUnmined || null;

    if (window.ol && resolvedMap && resolvedMap.olMap && resolvedMap.dataProjection && resolvedMap.viewProjection) {
      mapInstance = resolvedMap;
      buildVolumeLayer();
      setVisible(volumeVisible);
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

  window.SkyPixelVolume175 = {
    areas: VOLUME_17_5_AREAS,
    setVisible: setVisible,
    getVisible: function () { return volumeVisible; }
  };
})();
