(function () {
    'use strict';

    if (!window.ol || typeof unmined === 'undefined' || !unmined.olMap || !window.UnminedMapProperties) return;

    const toolsPanel = document.getElementById('skyPixelMapToolsPanel');
    const maritimeTools = toolsPanel ? toolsPanel.querySelector('.sky-pixel-maritime-tools') : null;
    const countryTools = toolsPanel ? toolsPanel.querySelector('.sky-pixel-country-border-tools') : null;

    const gridSection = document.createElement('section');
    gridSection.className = 'sky-pixel-coordinate-grid-tools';
    gridSection.setAttribute('aria-label', 'Sky Pixel coordinate grid tools');
    gridSection.innerHTML =
        '<button id="skyPixelCoordinateGridToggle" type="button" aria-pressed="false">🌐 Coordinate Grid</button>' +
        '<div id="skyPixelCoordinateGridPanel" class="sky-pixel-coordinate-grid-panel" hidden>' +
        '<div>1,000-block latitude / longitude grid</div>' +
        '<div class="sky-pixel-coordinate-grid-options">' +
        '<label><input id="skyPixelLatitudeToggle" type="checkbox" checked> Latitude</label>' +
        '<label><input id="skyPixelLongitudeToggle" type="checkbox" checked> Longitude</label>' +
        '</div>' +
        '</div>';

    if (toolsPanel) {
        if (maritimeTools) toolsPanel.insertBefore(gridSection, maritimeTools);
        else if (countryTools) toolsPanel.insertBefore(gridSection, countryTools);
        else toolsPanel.appendChild(gridSection);
    }

    const readout = document.createElement('div');
    readout.id = 'skyPixelCoordinateReadout';
    readout.className = 'sky-pixel-coordinate-readout';
    readout.hidden = true;
    readout.innerHTML = '<strong>Map coordinates</strong><div>X: — &nbsp; Z: —</div><span>Latitude: —<br>Longitude: —</span>';
    document.body.appendChild(readout);

    const minXRaw = UnminedMapProperties.minRegionX * 512;
    const maxXRaw = (UnminedMapProperties.maxRegionX + 1) * 512;
    const minZRaw = UnminedMapProperties.minRegionZ * 512;
    const maxZRaw = (UnminedMapProperties.maxRegionZ + 1) * 512;

    const minX = Math.floor(minXRaw / 1000) * 1000;
    const maxX = Math.ceil(maxXRaw / 1000) * 1000;
    const minZ = Math.floor(minZRaw / 1000) * 1000;
    const maxZ = Math.ceil(maxZRaw / 1000) * 1000;

    let showLatitude = true;
    let showLongitude = true;

    function toViewCoord(point) {
        return ol.proj.transform(point, unmined.dataProjection, unmined.viewProjection);
    }

    function toWorldCoord(point) {
        return ol.proj.transform(point, unmined.viewProjection, unmined.dataProjection);
    }

    function formatDirection(value, axis) {
        if (value === 0) return '0';
        const amount = Math.abs(value) >= 1000 ? (Math.abs(value) / 1000).toFixed(Math.abs(value) % 1000 ? 1 : 0) + 'K' : Math.abs(Math.round(value));
        const suffix = axis === 'X' ? (value > 0 ? 'E' : 'W') : (value > 0 ? 'S' : 'N');
        return amount + ' ' + suffix;
    }

    function fullAxisLabel(value, axis) {
        return (axis === 'X' ? 'Longitude ' : 'Latitude ') + formatDirection(value, axis);
    }

    const features = [];
    const labelFractions = [0.18, 0.50, 0.82];

    for (let x = minX; x <= maxX; x += 1000) {
        const line = new ol.Feature({
            geometry: new ol.geom.LineString([
                toViewCoord([x, minZRaw]),
                toViewCoord([x, maxZRaw])
            ])
        });
        line.set('coordinateGrid', true);
        line.set('axis', 'X');
        line.set('value', x);
        line.set('isZero', x === 0);
        features.push(line);

        labelFractions.forEach(function (fraction) {
            const z = minZRaw + ((maxZRaw - minZRaw) * fraction);
            const label = new ol.Feature({ geometry: new ol.geom.Point(toViewCoord([x, z])) });
            label.set('coordinateGridLabel', true);
            label.set('axis', 'X');
            label.set('value', x);
            label.set('label', fullAxisLabel(x, 'X'));
            label.set('isZero', x === 0);
            features.push(label);
        });
    }

    for (let z = minZ; z <= maxZ; z += 1000) {
        const line = new ol.Feature({
            geometry: new ol.geom.LineString([
                toViewCoord([minXRaw, z]),
                toViewCoord([maxXRaw, z])
            ])
        });
        line.set('coordinateGrid', true);
        line.set('axis', 'Z');
        line.set('value', z);
        line.set('isZero', z === 0);
        features.push(line);

        labelFractions.forEach(function (fraction) {
            const x = minXRaw + ((maxXRaw - minXRaw) * fraction);
            const label = new ol.Feature({ geometry: new ol.geom.Point(toViewCoord([x, z])) });
            label.set('coordinateGridLabel', true);
            label.set('axis', 'Z');
            label.set('value', z);
            label.set('label', fullAxisLabel(z, 'Z'));
            label.set('isZero', z === 0);
            features.push(label);
        });
    }

    /* Dense close-zoom labels: every 1K intersection and every 1K square. */
    for (let x = minX; x <= maxX; x += 1000) {
        for (let z = minZ; z <= maxZ; z += 1000) {
            const intersection = new ol.Feature({ geometry: new ol.geom.Point(toViewCoord([x, z])) });
            intersection.set('coordinateGridIntersectionLabel', true);
            intersection.set('xValue', x);
            intersection.set('zValue', z);
            intersection.set('label', 'Lat ' + formatDirection(z, 'Z') + '\nLon ' + formatDirection(x, 'X'));
            features.push(intersection);

            if (x < maxX && z < maxZ) {
                const cell = new ol.Feature({ geometry: new ol.geom.Point(toViewCoord([x + 500, z + 500])) });
                cell.set('coordinateGridCellLabel', true);
                cell.set('xValue', x + 500);
                cell.set('zValue', z + 500);
                cell.set('label', formatDirection(z + 500, 'Z') + '  •  ' + formatDirection(x + 500, 'X'));
                features.push(cell);
            }
        }
    }

    const gridSource = new ol.source.Vector({ features: features });

    const regularLineStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(255,255,255,0.36)',
            width: 1,
            lineDash: [5, 7],
            lineCap: 'round'
        })
    });

    const zeroLineStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(255,255,255,0.78)',
            width: 1.7,
            lineCap: 'round'
        })
    });

    const labelCache = {};
    const denseLabelCache = {};

    function getDenseLabelStyle(feature, kind) {
        const key = kind + ':' + feature.get('label');
        if (!denseLabelCache[key]) {
            denseLabelCache[key] = new ol.style.Style({
                text: new ol.style.Text({
                    text: feature.get('label'),
                    font: kind === 'intersection' ? '700 7px Arial, sans-serif' : '700 6.5px Arial, sans-serif',
                    textAlign: 'center',
                    fill: new ol.style.Fill({ color: kind === 'intersection' ? 'rgba(255,255,255,0.94)' : 'rgba(235,245,255,0.88)' }),
                    stroke: new ol.style.Stroke({ color: 'rgba(0,0,0,0.96)', width: 2.2 }),
                    backgroundFill: new ol.style.Fill({ color: kind === 'intersection' ? 'rgba(8,14,22,0.58)' : 'rgba(8,14,22,0.42)' }),
                    backgroundStroke: new ol.style.Stroke({ color: 'rgba(255,255,255,0.16)', width: 0.5 }),
                    padding: kind === 'intersection' ? [1, 2, 1, 2] : [0.5, 2, 0.5, 2],
                    offsetY: kind === 'intersection' ? -9 : 0,
                    overflow: true
                })
            });
        }
        return denseLabelCache[key];
    }

    function getLabelStyle(feature) {
        const key = feature.get('label') + ':' + (feature.get('isZero') ? 'zero' : 'regular');
        if (!labelCache[key]) {
            labelCache[key] = new ol.style.Style({
                text: new ol.style.Text({
                    text: feature.get('label'),
                    font: feature.get('isZero') ? '800 9px Arial, sans-serif' : '700 8px Arial, sans-serif',
                    fill: new ol.style.Fill({ color: 'rgba(255,255,255,0.94)' }),
                    stroke: new ol.style.Stroke({ color: 'rgba(0,0,0,0.94)', width: 2.4 }),
                    backgroundFill: new ol.style.Fill({ color: 'rgba(8,14,22,0.62)' }),
                    backgroundStroke: new ol.style.Stroke({ color: 'rgba(255,255,255,0.22)', width: 0.7 }),
                    padding: [1, 3, 1, 3],
                    offsetY: feature.get('axis') === 'X' ? -6 : 0,
                    offsetX: feature.get('axis') === 'Z' ? 6 : 0,
                    overflow: true
                })
            });
        }
        return labelCache[key];
    }

    function axisEnabled(axis) {
        return axis === 'X' ? showLongitude : showLatitude;
    }

    function gridStyle(feature) {
        const axis = feature.get('axis');
        if (!axisEnabled(axis)) return null;

        if (feature.get('coordinateGrid')) {
            return feature.get('isZero') ? zeroLineStyle : regularLineStyle;
        }

        if (feature.get('coordinateGridLabel')) {
            const zoom = unmined.olMap.getView().getZoom() || 0;
            const value = Math.abs(feature.get('value'));
            let interval = 1000;
            if (zoom < 2.8) interval = 10000;
            else if (zoom < 3.8) interval = 5000;
            else if (zoom < 4.8) interval = 2000;
            if (!feature.get('isZero') && value % interval !== 0) return null;
            return getLabelStyle(feature);
        }

        if (feature.get('coordinateGridIntersectionLabel')) {
            const zoom = unmined.olMap.getView().getZoom() || 0;
            if (!showLatitude || !showLongitude || zoom < 6.2) return null;
            return getDenseLabelStyle(feature, 'intersection');
        }

        if (feature.get('coordinateGridCellLabel')) {
            const zoom = unmined.olMap.getView().getZoom() || 0;
            if (!showLatitude || !showLongitude || zoom < 7.8) return null;
            return getDenseLabelStyle(feature, 'cell');
        }
        return null;
    }

    const gridLayer = new ol.layer.Vector({
        source: gridSource,
        visible: false,
        zIndex: 850000,
        declutter: false,
        style: gridStyle
    });
    gridLayer.set('skyPixelCoordinateGridLayer', true);
    unmined.olMap.addLayer(gridLayer);

    const toggle = document.getElementById('skyPixelCoordinateGridToggle');
    const panel = document.getElementById('skyPixelCoordinateGridPanel');
    const latitudeToggle = document.getElementById('skyPixelLatitudeToggle');
    const longitudeToggle = document.getElementById('skyPixelLongitudeToggle');

    function syncMainToggle() {
        const active = gridLayer.getVisible() && (showLatitude || showLongitude);
        if (toggle) {
            toggle.classList.toggle('is-active', active);
            toggle.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
        if (panel) panel.hidden = !gridLayer.getVisible();
        readout.hidden = !active;
    }

    function setVisible(visible) {
        if (visible && !showLatitude && !showLongitude) {
            showLatitude = true;
            showLongitude = true;
            if (latitudeToggle) latitudeToggle.checked = true;
            if (longitudeToggle) longitudeToggle.checked = true;
        }
        gridLayer.setVisible(visible);
        gridLayer.changed();
        syncMainToggle();
    }

    if (toggle) {
        toggle.addEventListener('click', function () {
            setVisible(!gridLayer.getVisible());
        });
    }

    if (latitudeToggle) {
        latitudeToggle.addEventListener('change', function () {
            showLatitude = latitudeToggle.checked;
            if (!showLatitude && !showLongitude) gridLayer.setVisible(false);
            else gridLayer.setVisible(true);
            gridLayer.changed();
            syncMainToggle();
        });
    }

    if (longitudeToggle) {
        longitudeToggle.addEventListener('change', function () {
            showLongitude = longitudeToggle.checked;
            if (!showLatitude && !showLongitude) gridLayer.setVisible(false);
            else gridLayer.setVisible(true);
            gridLayer.changed();
            syncMainToggle();
        });
    }

    unmined.olMap.getView().on('change:resolution', function () {
        if (gridLayer.getVisible()) gridLayer.changed();
    });

    unmined.olMap.on('pointermove', function (event) {
        if (!gridLayer.getVisible() || event.dragging) return;
        const world = toWorldCoord(event.coordinate);
        const x = Math.round(world[0]);
        const z = Math.round(world[1]);
        readout.innerHTML =
            '<strong>Map coordinates</strong>' +
            '<div>X: ' + x.toLocaleString() + ' &nbsp; Z: ' + z.toLocaleString() + '</div>' +
            '<span>Latitude: ' + formatDirection(z, 'Z') + '<br>Longitude: ' + formatDirection(x, 'X') + '</span>';
    });

    window.skyPixelCoordinateGridLayer = gridLayer;
    window.skyPixelSetCoordinateGridVisible = setVisible;
})();
