(function () {
    'use strict';

    if (!window.ol || typeof unmined === 'undefined' || !unmined.olMap) return;

    const toolsPanel = document.getElementById('skyPixelMapToolsPanel');
    const countryTools = toolsPanel ? toolsPanel.querySelector('.sky-pixel-country-border-tools') : null;

    const maritimeSection = document.createElement('section');
    maritimeSection.className = 'sky-pixel-maritime-tools';
    maritimeSection.setAttribute('aria-label', 'Sky Pixel maritime route tools');
    maritimeSection.innerHTML =
        '<button id="skyPixelMaritimeRoutesToggle" type="button" aria-pressed="false">⚓ Maritime Routes</button>' +
        '<div id="skyPixelMaritimeRoutesPanel" class="sky-pixel-maritime-panel" hidden>' +
        '<label class="sky-pixel-maritime-route-picker">Routes shown' +
        '<select id="skyPixelMaritimeRouteSelect" aria-label="Choose all maritime routes or one route">' +
        '<option value="all">All maritime routes</option>' +
        '</select></label>' +
        'Active maritime network<br>' +
        '• 3 Port of Razalia routes<br>' +
        '• 4 Harlow / Saylor routes<br>' +
        '• 5 Port of Elowah connections<br>' +
        '• 9 unique maritime routes total<br>' +
        '<span style="color:#ff7b7b;font-weight:900">• 3 Lillooet routes — Non-Operational</span>' +
        '</div>';

    if (toolsPanel) {
        if (countryTools) toolsPanel.insertBefore(maritimeSection, countryTools);
        else toolsPanel.appendChild(maritimeSection);
    }

    const routes = [
        {
            name: 'Port of Razalia Terminal 1 ↔ Lillooet Terminal 1',
            origin: 'Port of Razalia Terminal 1',
            destination: 'Lillooet Terminal 1',
            terminal: 'Razalia Terminal 1 / Lillooet Terminal 1',
            points: [
                [-3346, -2860],
                [-3725, -2921],
                [-4345, -3027],
                [-5033, -3013],
                [-5165, -3137]
            ]
        },
        {
            name: 'Port of Razalia Terminal 2 ↔ Elowah Terminal 1',
            origin: 'Port of Razalia Terminal 2',
            destination: 'Elowah Terminal 1',
            terminal: 'Razalia Terminal 2 / Elowah Terminal 1',
            points: [
                [-3366, -2882],
                [-3496, -2898],
                [-4050, -3027],
                [-4535, -3064],
                [-4877, -3396],
                [-5217, -3720],
                [-5627, -3858],
                [-6106, -4109],
                [-6226, -4576],
                [-6389, -4584],
                [-6342, -4720],
                [-6232, -4734]
            ]
        },
        {
            name: 'Port of Razalia Terminal 3 ↔ Harlow / Saylor Terminal 5',
            origin: 'Port of Razalia Terminal 3',
            destination: 'Harlow / Saylor Terminal 5',
            terminal: 'Razalia Terminal 3 / Harlow-Saylor Terminal 5',
            points: [
                [-3373, -2908],
                [-3708, -2997],
                [-3938, -3046],
                [-3943, -3092]
            ]
        },
        {
            name: 'Harlow / Saylor Terminal 1 ↔ Elowah Terminal 2, Barge 3',
            origin: 'Harlow / Saylor Terminal 1',
            destination: 'Elowah Terminal 2, Barge 3',
            terminal: 'Harlow-Saylor Terminal 1 / Elowah Terminal 2, Barge 3',
            points: [
                [-3982, -3294],
                [-4315, -3340],
                [-4719, -3380],
                [-5284, -3809],
                [-5915, -3982],
                [-6097, -4225],
                [-6135, -4464],
                [-6447, -4597],
                [-6293, -4745]
            ]
        },
        {
            name: 'Harlow / Saylor Terminal 2 ↔ Elowah Terminal 3, Barge 2',
            origin: 'Harlow / Saylor Terminal 2',
            destination: 'Elowah Terminal 3, Barge 2',
            terminal: 'Harlow-Saylor Terminal 2 / Elowah Terminal 3, Barge 2',
            points: [
                [-4008, -3267],
                [-4315, -3340],
                [-4719, -3380],
                [-5284, -3809],
                [-5915, -3982],
                [-6097, -4225],
                [-6135, -4464],
                [-6447, -4597],
                [-6325, -4743]
            ]
        },
        {
            name: 'Harlow / Saylor Terminal 3 ↔ Port of Lillooet',
            origin: 'Harlow / Saylor Terminal 3',
            destination: 'Port of Lillooet',
            terminal: 'Harlow-Saylor Terminal 3 / Port of Lillooet',
            points: [
                [-4038, -3239],
                [-4503, -3238],
                [-4872, -3059],
                [-5132, -3033],
                [-5145, -3132],
                [-5195, -3141]
            ]
        },
        {
            name: 'Harlow / Saylor Terminal 4 ↔ Port of Sitkan / Alouette',
            origin: 'Harlow / Saylor Terminal 4',
            destination: 'Port of Sitkan / Alouette',
            terminal: 'Harlow-Saylor Terminal 4 / Sitkan-Alouette Port',
            points: [
                [-4067, -3205],
                [-4406, -3241],
                [-4915, -3471],
                [-5173, -3601],
                [-5781, -3910],
                [-6118, -4279],
                [-6260, -4467],
                [-6569, -4613],
                [-6916, -5551],
                [-7548, -6793],
                [-9027, -7599],
                [-11136, -8317],
                [-11412, -8757],
                [-11443, -9194],
                [-11555, -9646],
                [-11677, -9665]
            ]
        },
        {
            name: 'Port of Elowah Terminal 4 ↔ Port of Lillooet',
            origin: 'Port of Elowah Terminal 4',
            destination: 'Port of Lillooet',
            terminal: 'Elowah Terminal 4 / Port of Lillooet',
            points: [
                [-6179, -4847],
                [-6270, -4859],
                [-6288, -4898],
                [-6411, -4886],
                [-6454, -4780],
                [-6397, -4550],
                [-6038, -4277],
                [-5805, -3968],
                [-5297, -3779],
                [-4962, -3194],
                [-5021, -3079],
                [-5119, -3075],
                [-5160, -3133],
                [-5197, -3144]
            ]
        },
        {
            name: 'Port of Elowah Terminal 5 ↔ Port of Alouette / Sitkan',
            origin: 'Port of Elowah Terminal 5',
            destination: 'Port of Alouette / Sitkan',
            terminal: 'Elowah Terminal 5 / Alouette-Sitkan Port',
            points: [
                [-6105, -5038],
                [-6329, -5081],
                [-7159, -6156],
                [-7756, -6813],
                [-9141, -7586],
                [-11195, -8332],
                [-11390, -8785],
                [-11429, -9202],
                [-11569, -9632],
                [-11677, -9670]
            ]
        }
    ];

    function toViewCoord(point) {
        return ol.proj.transform(point, unmined.dataProjection, unmined.viewProjection);
    }

    const routeFeatures = routes.map(function (route) {
        const feature = new ol.Feature({
            geometry: new ol.geom.LineString(route.points.map(toViewCoord))
        });
        feature.set('maritimeRoute', true);
        feature.set('routeName', route.name);
        feature.set('origin', route.origin);
        feature.set('destination', route.destination);
        feature.set('terminal', route.terminal);
        const isNonOperational = /lillooet/i.test(route.name + ' ' + route.origin + ' ' + route.destination + ' ' + route.terminal);
        feature.set('isNonOperational', isNonOperational);
        feature.set('status', isNonOperational ? 'Non-Operational' : 'Operational');
        return feature;
    });

    const maritimeSource = new ol.source.Vector({ features: routeFeatures });
    let selectedMaritimeRoute = 'all';

    function maritimeStyle(feature) {
        if (selectedMaritimeRoute !== 'all' && feature.get('routeName') !== selectedMaritimeRoute) return null;
        const hovered = !!feature.get('isHovered');
        const isNonOperational = !!feature.get('isNonOperational');
        const outerColor = isNonOperational
            ? (hovered ? 'rgba(92,0,0,0.92)' : 'rgba(72,0,0,0.80)')
            : (hovered ? 'rgba(5,40,75,0.82)' : 'rgba(5,34,66,0.68)');
        const innerColor = isNonOperational
            ? (hovered ? 'rgba(255,92,92,1)' : 'rgba(230,45,45,0.98)')
            : (hovered ? 'rgba(105,205,255,1)' : 'rgba(71,166,235,0.94)');
        const dashPattern = isNonOperational ? [12, 8] : [7, 6];

        return [
            new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: outerColor,
                    width: hovered ? 4.2 : 3.4,
                    lineDash: dashPattern,
                    lineCap: 'round',
                    lineJoin: 'round'
                })
            }),
            new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: innerColor,
                    width: hovered ? 2.6 : 1.9,
                    lineDash: dashPattern,
                    lineCap: 'round',
                    lineJoin: 'round'
                })
            })
        ];
    }

    const maritimeLayer = new ol.layer.Vector({
        source: maritimeSource,
        visible: false,
        zIndex: 900000,
        style: maritimeStyle
    });
    maritimeLayer.set('skyPixelMaritimeLayer', true);
    unmined.olMap.addLayer(maritimeLayer);

    const popupElement = document.createElement('div');
    popupElement.className = 'sky-pixel-maritime-popup';
    popupElement.hidden = true;
    document.body.appendChild(popupElement);

    const popup = new ol.Overlay({
        element: popupElement,
        positioning: 'bottom-center',
        offset: [0, -10],
        stopEvent: false
    });
    unmined.olMap.addOverlay(popup);

    const toggle = document.getElementById('skyPixelMaritimeRoutesToggle');
    const panel = document.getElementById('skyPixelMaritimeRoutesPanel');
    const routeSelect = document.getElementById('skyPixelMaritimeRouteSelect');

    if (routeSelect) {
        routes.forEach(function (route) {
            const option = document.createElement('option');
            option.value = route.name;
            option.textContent = route.name + (/lillooet/i.test(route.name) ? ' — Non-Operational' : '');
            routeSelect.appendChild(option);
        });

        routeSelect.addEventListener('change', function () {
            selectedMaritimeRoute = routeSelect.value || 'all';
            routeFeatures.forEach(function (feature) { feature.set('isHovered', false); });
            hoveredFeature = null;
            popupElement.hidden = true;
            popup.setPosition(undefined);
            maritimeLayer.changed();
        });
    }

    function setVisible(visible) {
        maritimeLayer.setVisible(visible);
        if (toggle) {
            toggle.classList.toggle('is-active', visible);
            toggle.setAttribute('aria-pressed', visible ? 'true' : 'false');
        }
        if (panel) panel.hidden = !visible;
        if (!visible) {
            popupElement.hidden = true;
            popup.setPosition(undefined);
            routeFeatures.forEach(function (feature) { feature.set('isHovered', false); });
            maritimeLayer.changed();
        }
    }

    if (toggle) {
        toggle.addEventListener('click', function () {
            setVisible(!maritimeLayer.getVisible());
        });
    }

    let hoveredFeature = null;
    unmined.olMap.on('pointermove', function (event) {
        if (!maritimeLayer.getVisible() || event.dragging) return;
        const found = unmined.olMap.forEachFeatureAtPixel(event.pixel, function (feature, layer) {
            if (layer !== maritimeLayer) return null;
            if (selectedMaritimeRoute !== 'all' && feature.get('routeName') !== selectedMaritimeRoute) return null;
            return feature;
        }, { hitTolerance: 5 });

        if (hoveredFeature !== found) {
            if (hoveredFeature) hoveredFeature.set('isHovered', false);
            hoveredFeature = found || null;
            if (hoveredFeature) hoveredFeature.set('isHovered', true);
            maritimeLayer.changed();
        }
        const target = unmined.olMap.getTargetElement();
        if (target) target.style.cursor = found ? 'pointer' : '';
    });

    unmined.olMap.on('singleclick', function (event) {
        if (!maritimeLayer.getVisible()) return;
        const feature = unmined.olMap.forEachFeatureAtPixel(event.pixel, function (candidate, layer) {
            if (layer !== maritimeLayer) return null;
            if (selectedMaritimeRoute !== 'all' && candidate.get('routeName') !== selectedMaritimeRoute) return null;
            return candidate;
        }, { hitTolerance: 7 });

        if (!feature) {
            popupElement.hidden = true;
            popup.setPosition(undefined);
            return;
        }

        const status = feature.get('status') || 'Operational';
        const isNonOperational = status === 'Non-Operational';
        popupElement.innerHTML =
            '<strong>' + feature.get('routeName') + (isNonOperational ? ' — Non-Operational' : '') + '</strong>' +
            '<div><span>Origin:</span> ' + feature.get('origin') + '</div>' +
            '<div><span>Destination:</span> ' + feature.get('destination') + '</div>' +
            '<div><span>Terminal connection:</span> ' + feature.get('terminal') + '</div>' +
            '<div><span>Type:</span> Maritime route</div>' +
            '<div><span>Status:</span> <strong style="color:' + (isNonOperational ? '#ff6b6b' : '#8eeaff') + '">' + status + '</strong></div>';
        popupElement.hidden = false;
        popup.setPosition(event.coordinate);
    });

    window.skyPixelMaritimeRoutesLayer = maritimeLayer;
    window.skyPixelSetMaritimeRoutesVisible = setVisible;
})();
