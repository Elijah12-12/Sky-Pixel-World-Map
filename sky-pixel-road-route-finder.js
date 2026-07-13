(function(){
    const R101_STOP_COORDS = [
        { name: "Octavian", aliases: ["Octavoian", "Octavion"], coord: [160.3, -157], connection: "terminus" },
        { name: "Harlie", coord: [111, -283], connection: "near R101" },
        { name: "Chaseloke", coord: [70, -560], connection: "near R101" },
        { name: "Noland", coord: [-190, -1191], connection: "near R101" },
        { name: "Tayberry", coord: [-251, -1700], connection: "near R101" },
        { name: "Baylie", coord: [-1512, -2182], connection: "spur / off R101", offRoute: true },
        { name: "Bells", coord: [-1019, -2364], connection: "near R101" },
        { name: "Razalia", coord: [-2387.7, -2444.2], connection: "terminus" }
    ];

    function normalizeName(value){
        return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
    }

    function findStop(value){
        const key = normalizeName(value);
        return R101_STOP_COORDS.find(function(stop){
            if (normalizeName(stop.name) === key) return true;
            return (stop.aliases || []).some(function(alias){ return normalizeName(alias) === key; });
        }) || null;
    }

    function findR101Route(){
        const pools = [
            window.SKY_PIXEL_ROAD_ROUTES,
            window.skyPixelRoadRoutes,
            window.SKY_PIXEL_SAVED_ROUTES,
            window.skyPixelSavedRoadRoutes
        ];
        for (const pool of pools){
            if (Array.isArray(pool)){
                const found = pool.find(function(r){ return r && (r.id === "R101_Octavian_Razalia" || r.road === "R101"); });
                if (found && Array.isArray(found.points) && found.points.length > 1) return found;
            }
        }
        return null;
    }

    function ensureStopDatalist(){
        const list = document.getElementById("skyPixelRoadStopList");
        if (!list) return;
        list.innerHTML = R101_STOP_COORDS.map(function(s){ return `<option value="${s.name}"></option>`; }).join("");
    }

    function distance(a, b){
        return Math.hypot(Number(a[0]) - Number(b[0]), Number(a[1]) - Number(b[1]));
    }

    function projectStopToRoute(stop, route){
        let best = null;
        const p = stop.coord;
        for (let i = 0; i < route.points.length - 1; i++){
            const a = route.points[i];
            const b = route.points[i + 1];
            const ax = Number(a[0]), az = Number(a[1]);
            const bx = Number(b[0]), bz = Number(b[1]);
            const dx = bx - ax, dz = bz - az;
            const len2 = dx * dx + dz * dz || 1;
            const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / len2));
            const projected = [ax + dx * t, az + dz * t];
            const d = distance(p, projected);
            const along = i + t;
            if (!best || d < best.distance){
                best = { index: i, t: t, along: along, point: projected, distance: d };
            }
        }
        return best;
    }

    function blocksToView(point){
        const xz = { x: Number(point[0]), z: Number(point[1]) };
        if (typeof window.skyPixelBlocksToViewCoord === "function") return window.skyPixelBlocksToViewCoord(xz);
        if (typeof skyPixelBlocksToViewCoord === "function") return skyPixelBlocksToViewCoord(xz);
        return [Number(point[0]), Number(point[1])];
    }

    function buildSegment(route, fromProj, toProj){
        const forward = fromProj.along <= toProj.along;
        const start = forward ? fromProj : toProj;
        const end = forward ? toProj : fromProj;
        const points = [start.point];
        for (let i = Math.ceil(start.along); i <= Math.floor(end.along); i++){
            if (i > start.index && i < route.points.length) points.push(route.points[i]);
        }
        points.push(end.point);
        return forward ? points : points.reverse();
    }

    function drawEndpoint(source, stop, viewCoord, kind){
        const feature = new ol.Feature({ geometry: new ol.geom.Point(viewCoord) });
        feature.set('roadRouteType', 'endpoint');
        feature.set('endpointKind', kind);
        feature.set('label', stop.name);
        source.addFeature(feature);
    }

    function drawRouteSegment(fromName, toName){
        const result = document.getElementById("skyPixelRoadRouteResult");
        const route = findR101Route();
        if (!route){
            if (result) result.textContent = "R101 route data was not found in this file.";
            return;
        }

        const fromStop = findStop(fromName);
        const toStop = findStop(toName);
        if (!fromStop || !toStop){
            if (result) result.textContent = "Use R101 stops: " + R101_STOP_COORDS.map(function(s){ return s.name; }).join(", ");
            return;
        }

        const fromProj = projectStopToRoute(fromStop, route);
        const toProj = projectStopToRoute(toStop, route);
        const segment = buildSegment(route, fromProj, toProj);
        const viewPoints = segment.map(blocksToView);

        skyPixelRoadRouteSource.clear();

        const routeFeature = new ol.Feature({ geometry: new ol.geom.LineString(viewPoints) });
        routeFeature.set('roadRouteType', 'line');
        routeFeature.set('routeId', route.id || 'R101_Octavian_Razalia');
        skyPixelRoadRouteSource.addFeature(routeFeature);

        drawEndpoint(skyPixelRoadRouteSource, fromStop, viewPoints[0], 'start');
        drawEndpoint(skyPixelRoadRouteSource, toStop, viewPoints[viewPoints.length - 1], 'end');

        const midPoint = viewPoints[Math.floor(viewPoints.length / 2)];
        const labelFeature = new ol.Feature({ geometry: new ol.geom.Point(midPoint) });
        labelFeature.set('roadRouteType', 'label');
        labelFeature.set('label', `R101 · ${fromStop.name} → ${toStop.name}`);
        skyPixelRoadRouteSource.addFeature(labelFeature);

        try {
            unmined.olMap.getView().fit(routeFeature.getGeometry().getExtent(), {
                padding: [90, 90, 90, 90],
                duration: 650,
                maxZoom: 5.6
            });
        } catch (err) {}

        const offRouteNotes = [fromStop, toStop].filter(function(s){ return s.offRoute; }).map(function(s){ return s.name; });
        const note = offRouteNotes.length ? ` Note: ${offRouteNotes.join(" and ")} is off R101, so this snaps to the nearest R101 point until the spur road is added.` : "";
        if (result) result.textContent = `Showing R101: ${fromStop.name} → ${toStop.name}. ${segment.length} route points.${note}`;
    }

    function clearRoadRoute(){
        skyPixelRoadRouteSource.clear();
        const result = document.getElementById("skyPixelRoadRouteResult");
        if (result) result.textContent = "Road route hidden.";
    }

    function initRoadFinder(){
        ensureStopDatalist();
        const findBtn = document.getElementById("skyPixelRoadFindRoute");
        const clearBtn = document.getElementById("skyPixelRoadClearRoute");
        const from = document.getElementById("skyPixelRoadRouteFrom");
        const to = document.getElementById("skyPixelRoadRouteTo");

        if (findBtn && !findBtn.dataset.boundRoadFinder){
            findBtn.dataset.boundRoadFinder = "true";
            findBtn.addEventListener("click", function(){ drawRouteSegment(from && from.value, to && to.value); });
        }

        if (clearBtn && !clearBtn.dataset.boundRoadFinder){
            clearBtn.dataset.boundRoadFinder = "true";
            clearBtn.addEventListener("click", clearRoadRoute);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initRoadFinder);
    } else {
        initRoadFinder();
    }

    window.skyPixelDrawR101Route = drawRouteSegment;
})();
