(function (global) {
  'use strict';

  function dispatch(name, detail) {
    const event = new CustomEvent(`sky-pixel-atlas:${name}`, { detail: detail || {} });
    global.dispatchEvent(event);
    return event;
  }

  function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
  function normalize(value) { return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function cleanPlaceName(value) { return String(value || '').split(',')[0].trim(); }
  function visible(element) { return Boolean(element && !element.hidden && element.offsetParent !== null); }

  function availablePlaceNames() {
    const names = new Set();
    document.querySelectorAll('#skyPixelSearchList option').forEach((option) => {
      const value = cleanPlaceName(option.value || option.textContent);
      if (value) names.add(value);
    });
    if (global.SkyPixelPlaceLinks) Object.keys(global.SkyPixelPlaceLinks).forEach((name) => names.add(name));
    const markerSources = [global.UnminedCustomMarkers?.markers, global.SkyPixelLandmarkMarkers?.markers];
    markerSources.filter(Array.isArray).flat().forEach((marker) => {
      const name = cleanPlaceName(marker?.text || marker?.name || marker?.title);
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => b.length - a.length);
  }

  function resolvePlaceName(requested) {
    const wanted = normalize(requested);
    if (!wanted) return null;
    const names = availablePlaceNames();
    return names.find((name) => normalize(name) === wanted)
      || names.find((name) => normalize(name).includes(wanted) || wanted.includes(normalize(name)))
      || null;
  }

  function getActivePlaceName() {
    const panel = document.getElementById('skyPixelPanel');
    const title = cleanPlaceName(document.getElementById('skyPixelPanelTitle')?.textContent);
    return panel?.classList.contains('is-visible') && title ? title : '';
  }

  async function openPlacePanel(placeName) {
    const resolved = resolvePlaceName(placeName) || cleanPlaceName(placeName);
    const input = document.getElementById('skyPixelSearchInput');
    const button = document.getElementById('skyPixelSearchButton');
    const panel = document.getElementById('skyPixelPanel');
    const title = document.getElementById('skyPixelPanelTitle');
    if (!input || !button || !panel || !title) return { ok: false, reason: 'The Sky Pixel search or location panel is unavailable.' };

    input.value = resolved;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();

    const deadline = Date.now() + 7000;
    while (Date.now() < deadline) {
      const currentTitle = cleanPlaceName(title.textContent);
      if (panel.classList.contains('is-visible') && normalize(currentTitle) === normalize(resolved)) {
        return { ok: true, placeName: currentTitle || resolved };
      }
      await sleep(100);
    }
    return { ok: false, reason: `I could not open the location panel for ${resolved}.`, placeName: resolved };
  }

  function detailsFrom(root) {
    const details = {};
    root.querySelectorAll('.sky-pixel-real-weather-details > div, [class*="weather-detail"] > div, dl > div').forEach((row) => {
      const label = row.querySelector('span, dt, small')?.textContent?.trim();
      const value = row.querySelector('strong, dd, b')?.textContent?.trim();
      if (label && value) details[label] = value;
    });
    return details;
  }

  const DAY_ALIASES = {
    Sunday: ['sunday', 'sun'], Monday: ['monday', 'mon'], Tuesday: ['tuesday', 'tue', 'tues'],
    Wednesday: ['wednesday', 'wed'], Thursday: ['thursday', 'thu', 'thur', 'thurs'],
    Friday: ['friday', 'fri'], Saturday: ['saturday', 'sat']
  };

  function canonicalDay(value) {
    const text = normalize(value);
    if (!text) return '';
    return Object.keys(DAY_ALIASES).find((day) => DAY_ALIASES[day].some((alias) => text === alias || text.startsWith(alias + ' '))) || '';
  }

  function dayFromNode(node) {
    const attrs = [
      node.dataset?.day, node.dataset?.weekday, node.dataset?.date,
      node.getAttribute?.('aria-label'), node.getAttribute?.('title'),
      node.querySelector?.('[data-day],[data-weekday],time,[class*="day"],[class*="date"]')?.textContent,
      node.textContent
    ];
    for (const value of attrs) {
      const direct = canonicalDay(value);
      if (direct) return direct;
      const normalized = normalize(value);
      for (const [day, aliases] of Object.entries(DAY_ALIASES)) {
        if (aliases.some((alias) => new RegExp(`(?:^|\\s)${alias}(?:\\s|$)`, 'i').test(normalized))) return day;
      }
    }
    return '';
  }

  function parseForecastText(text, dayName) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    let temps = [...clean.matchAll(/-?\d{1,3}\s*°(?:\s*[FC])?/gi)].map((m) => m[0].replace(/\s+/g, ''));
    if (!temps.length) {
      const afterDay = clean.replace(new RegExp(`^.*?\\b(?:${DAY_ALIASES[dayName].join('|')})\\b`, 'i'), '');
      temps = [...afterDay.matchAll(/(?:^|\s)(-?\d{1,3})(?=\s|\/|$)/g)].map((m) => `${m[1]}°`).slice(0, 2);
    }
    const percentages = [...clean.matchAll(/\b\d{1,3}%/g)].map((m) => m[0]);
    const wind = clean.match(/(?:wind|winds?|gusts?)\s*[:\-]?\s*([^|•,;]{1,35}(?:mph|km\/h|kph))/i)?.[1]?.trim()
      || clean.match(/\b(?:N|NE|E|SE|S|SW|W|NW)?\s*\d{1,3}\s*(?:mph|km\/h|kph)\b/i)?.[0] || '';
    const sunrise = clean.match(/sunrise\s*[:\-]?\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i)?.[1] || '';
    const sunset = clean.match(/sunset\s*[:\-]?\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i)?.[1] || '';
    const conditionMatch = clean.match(/\b(clear sky|clear|sunny|mostly sunny|partly sunny|partly cloudy|mostly cloudy|cloudy|overcast|foggy|fog|mist|drizzle|showers?|rain(?:y)?|thunderstorms?|storms?|snow(?:y)?|flurries|sleet|freezing rain|windy|breezy|smoke|haze)\b/i);
    return {
      day: dayName,
      text: clean,
      condition: conditionMatch ? conditionMatch[0] : '',
      high: temps[0] || '',
      low: temps[1] || '',
      temperatures: temps,
      precipitation: percentages[0] || '',
      percentages,
      wind,
      sunrise,
      sunset
    };
  }

  function readDailyForecasts(body) {
    const found = new Map();
    const selectors = [
      '[data-day]', '[data-weekday]', '[data-date]', 'time',
      '[class*="forecast"]', '[class*="daily"]', '[class*="weather-day"]',
      '[class*="day-card"]', '[class*="day-item"]', '[class*="week"] > *',
      '.sky-pixel-real-weather-day'
    ].join(',');

    body.querySelectorAll(selectors).forEach((node) => {
      const day = dayFromNode(node);
      if (!day) return;
      let card = node;
      for (let i = 0; i < 3; i += 1) {
        const parent = card.parentElement;
        if (!parent || parent === body) break;
        const parentDay = dayFromNode(parent);
        if (parentDay === day && (parent.textContent || '').length < 500) card = parent;
        else break;
      }
      const parsed = parseForecastText(card.textContent || node.textContent || '', day);
      const existing = found.get(day);
      if (!existing || parsed.text.length > existing.text.length) found.set(day, parsed);
    });

    const full = (body.innerText || body.textContent || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
    const hits = [];
    Object.entries(DAY_ALIASES).forEach(([day, aliases]) => {
      aliases.forEach((alias) => {
        const regex = new RegExp(`(?:^|\\s)(${alias})(?=\\s|$)`, 'ig');
        let match;
        while ((match = regex.exec(full))) hits.push({ day, index: match.index + (match[0].length - match[1].length) });
      });
    });
    hits.sort((a, b) => a.index - b.index);
    hits.forEach((entry, i) => {
      if (found.has(entry.day)) return;
      const next = hits.slice(i + 1).find((candidate) => candidate.index > entry.index);
      const end = next?.index ?? Math.min(full.length, entry.index + 260);
      found.set(entry.day, parseForecastText(full.slice(entry.index, end), entry.day));
    });

    return Object.fromEntries(found);
  }

  function readWeatherSnapshot() {
    const panel = document.getElementById('skyPixelRealWeather');
    const body = document.getElementById('skyPixelRealWeatherBody');
    if (!panel || !body || panel.hidden) return null;

    const noteText = body.textContent || '';
    if (/loading live weather|loading weather/i.test(noteText)) return { loading: true };
    if (/could not load live weather|unable to load weather/i.test(noteText)) return { error: noteText.trim() };

    const details = detailsFrom(body);
    const getDetail = (...labels) => {
      const key = Object.keys(details).find((item) => labels.some((label) => normalize(item).includes(normalize(label))));
      return key ? details[key] : '';
    };
    const rawText = (body.innerText || body.textContent || '').replace(/\s+/g, ' ').trim();

    return {
      loading: false,
      temperature: body.querySelector('.sky-pixel-real-weather-temp, [class*="weather-temp"]')?.textContent?.trim() || '',
      condition: body.querySelector('.sky-pixel-real-weather-condition, [class*="weather-condition"]')?.textContent?.trim() || '',
      feelsLike: getDetail('Feels like'),
      wind: getDetail('Wind'),
      humidity: getDetail('Humidity'),
      highLow: getDetail('Today', 'High / Low', 'High Low'),
      rainChance: getDetail('Rain chance', 'Precipitation'),
      visibility: getDetail('Visibility'),
      pressure: getDetail('Pressure'),
      uvIndex: getDetail('UV'),
      sunrise: getDetail('Sunrise') || rawText.match(/sunrise\s*[:\-]?\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i)?.[1] || '',
      sunset: getDetail('Sunset') || rawText.match(/sunset\s*[:\-]?\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i)?.[1] || '',
      reference: body.querySelector('.sky-pixel-real-weather-reference-city, [class*="weather-reference"]')?.textContent?.trim() || '',
      localTime: document.getElementById('skyPixelLocalTimeClock')?.textContent?.trim() || '',
      localStatus: document.getElementById('skyPixelLocalTimeStatus')?.textContent?.trim() || '',
      forecasts: readDailyForecasts(body),
      rawText
    };
  }

  async function waitForWeather(timeoutMs) {
    const body = document.getElementById('skyPixelRealWeatherBody');
    if (!body) return { ok: false, reason: 'The weather panel is unavailable.' };
    const deadline = Date.now() + (timeoutMs || 18000);
    while (Date.now() < deadline) {
      const snapshot = readWeatherSnapshot();
      if (snapshot?.error) return { ok: false, reason: snapshot.error };
      if (snapshot && !snapshot.loading && (snapshot.temperature || Object.keys(snapshot.forecasts || {}).length)) return { ok: true, weather: snapshot };
      await sleep(150);
    }
    return { ok: false, reason: 'The weather service did not finish loading in time.' };
  }

  async function getWeatherForPlace(placeName) {
    dispatch('weather-place-request', { placeName });
    const opened = await openPlacePanel(placeName);
    if (!opened.ok) return opened;
    const refresh = document.getElementById('skyPixelRealWeatherRefresh');
    if (refresh) refresh.click();
    const result = await waitForWeather(18000);
    return result.ok ? { ok: true, placeName: opened.placeName, weather: result.weather } : { ...result, placeName: opened.placeName };
  }


  function getPlaceInfo(placeName) {
    return global.SkyPixelAtlasDB?.describePlace(placeName) || { ok:false, error:'Atlas database is unavailable.' };
  }
  function searchAtlas(query, filters) {
    return { ok:true, query:query||'', results: global.SkyPixelAtlasDB?.search(query, filters||{}) || [] };
  }
  async function showPlaceOnMap(placeName) {
    const info = getPlaceInfo(placeName);
    const opened = await openPlacePanel(info.ok ? info.place.name : placeName);
    if (!opened.ok) return opened;
    dispatch('map-place-opened', { placeName: opened.placeName });
    return { ok:true, placeName:opened.placeName, place:info.ok?info.place:null, message:`Opened ${opened.placeName} on the map.` };
  }
  function getNearbyPlaces(placeName, options) {
    const resolved = placeName || getActivePlaceName();
    if (!resolved) return { ok:false, error:'No place was named and no map location is currently open.' };
    return global.SkyPixelAtlasDB?.nearby(resolved, options||{}) || { ok:false,error:'Atlas database is unavailable.' };
  }
  function getTeleportPath(from, to) {
    return global.SkyPixelAtlasDB?.teleportPath(from, to) || { ok:false,error:'Atlas database is unavailable.' };
  }


  // Atlas control adapter: operates the existing visible Sky Pixel controls.
  // It never removes, replaces, or hides the manual buttons and panels.
  function element(id) { return document.getElementById(id); }
  function emitInput(node) {
    if (!node) return;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function setCheckbox(id, checked) {
    const node = element(id);
    if (!node) return { ok:false, error:`Control ${id} is unavailable.` };
    const wanted = Boolean(checked);
    if (node.checked !== wanted) {
      node.checked = wanted;
      emitInput(node);
      node.click();
      // Some handlers read the checked value after click; restore requested state if click toggled it.
      if (node.checked !== wanted) { node.checked = wanted; emitInput(node); }
    } else emitInput(node);
    return { ok:true, id, checked:node.checked };
  }
  function setRange(id, value) {
    const node = element(id);
    if (!node) return { ok:false, error:`Control ${id} is unavailable.` };
    const min = Number(node.min || 0), max = Number(node.max || 100);
    const numeric = Math.max(min, Math.min(max, Number(value)));
    node.value = String(numeric);
    emitInput(node);
    return { ok:true, id, value:numeric };
  }
  function clickControl(id, desiredState) {
    const node = element(id);
    if (!node) return { ok:false, error:`Control ${id} is unavailable.` };
    if (typeof desiredState === 'boolean') {
      const current = node.getAttribute('aria-pressed') === 'true' || node.classList.contains('is-active');
      if (current !== desiredState) node.click();
    } else node.click();
    return { ok:true, id, ariaPressed:node.getAttribute('aria-pressed'), active:node.classList.contains('is-active') };
  }

  async function openTeleportPlanner() {
    const planner = element('skyPixelTeleportPlanner');
    const toggle = element('skyPixelTeleportRoutesToggle');
    if (!planner || !toggle) return { ok:false, error:'The existing Teleport Network planner is unavailable.' };
    if (planner.hidden) toggle.click();
    const deadline = Date.now() + 2500;
    while (Date.now() < deadline) {
      if (!planner.hidden) return { ok:true };
      await sleep(50);
    }
    return { ok:false, error:'Atlas could not open the Teleport Network planner.' };
  }

  function teleportCityNames() {
    const names=[];
    document.querySelectorAll('#skyPixelTeleportCityList option').forEach(o=>{
      const name=cleanPlaceName(o.value || o.textContent); if(name) names.push(name);
    });
    return Array.from(new Set(names));
  }
  function resolveTeleportName(name) {
    const wanted=normalize(name); if(!wanted) return '';
    const names=teleportCityNames();
    return names.find(n=>normalize(n)===wanted)
      || names.find(n=>normalize(n).includes(wanted)||wanted.includes(normalize(n)))
      || resolvePlaceName(name) || cleanPlaceName(name);
  }
  async function waitForTeleportResult(previousText, timeoutMs) {
    const result=element('skyPixelTeleportRouteResult');
    if(!result) return {ok:false,error:'The teleport route result panel is unavailable.'};
    const deadline=Date.now()+(timeoutMs||8000);
    while(Date.now()<deadline){
      const text=(result.innerText||result.textContent||'').replace(/\s+/g,' ').trim();
      if(text && text!==previousText && !/choose two places/i.test(text)) return {ok:true,text,html:result.innerHTML};
      await sleep(80);
    }
    const text=(result.innerText||result.textContent||'').replace(/\s+/g,' ').trim();
    return text && !/choose two places/i.test(text) ? {ok:true,text,html:result.innerHTML} : {ok:false,error:'The existing teleport planner did not return a readable route.',text};
  }

  async function operateTeleportRoute(from, to, options) {
    const opened=await openTeleportPlanner(); if(!opened.ok) return opened;
    const fromInput=element('skyPixelTeleportFrom'), toInput=element('skyPixelTeleportTo');
    const button=element('skyPixelTeleportFindRoute'), result=element('skyPixelTeleportRouteResult');
    if(!fromInput||!toInput||!button||!result) return {ok:false,error:'Teleport planner route controls are unavailable.'};
    const resolvedFrom=resolveTeleportName(from || getActivePlaceName());
    const resolvedTo=resolveTeleportName(to);
    if(!resolvedFrom||!resolvedTo) return {ok:false,error:'Both a valid teleport origin and destination are required.',from:resolvedFrom,to:resolvedTo};

    const opts=options||{};
    if(opts.directOnly===true){ setCheckbox('skyPixelTeleportShowDirect',true); setCheckbox('skyPixelTeleportShowLayover',false); setCheckbox('skyPixelTeleportShowThird',false); }
    else {
      if(typeof opts.showDirect==='boolean') setCheckbox('skyPixelTeleportShowDirect',opts.showDirect);
      if(typeof opts.showLayover==='boolean') setCheckbox('skyPixelTeleportShowLayover',opts.showLayover);
      if(typeof opts.showThird==='boolean') setCheckbox('skyPixelTeleportShowThird',opts.showThird);
    }
    if(typeof opts.showLabels==='boolean') setCheckbox('skyPixelTeleportShowLabels',opts.showLabels);
    if(typeof opts.showExternalTowers==='boolean') setCheckbox('skyPixelTeleportShowExternalTowers',opts.showExternalTowers);

    fromInput.value=resolvedFrom; emitInput(fromInput);
    toInput.value=resolvedTo; emitInput(toInput);
    const old=(result.innerText||result.textContent||'').replace(/\s+/g,' ').trim();
    button.click();
    const route=await waitForTeleportResult(old,9000);
    return route.ok ? {ok:true,from:resolvedFrom,to:resolvedTo,routeText:route.text,routeHtml:route.html,plannerOpened:true,message:`Displayed the existing teleport route from ${resolvedFrom} to ${resolvedTo}.`} : {...route,from:resolvedFrom,to:resolvedTo};
  }

  async function controlTeleportNetwork(action) {
    const args=action||{};
    const opened=await openTeleportPlanner(); if(!opened.ok) return opened;
    if(typeof args.showDirect==='boolean') setCheckbox('skyPixelTeleportShowDirect',args.showDirect);
    if(typeof args.showLayover==='boolean') setCheckbox('skyPixelTeleportShowLayover',args.showLayover);
    if(typeof args.showThird==='boolean') setCheckbox('skyPixelTeleportShowThird',args.showThird);
    if(typeof args.showLabels==='boolean') setCheckbox('skyPixelTeleportShowLabels',args.showLabels);
    if(typeof args.showExternalTowers==='boolean') setCheckbox('skyPixelTeleportShowExternalTowers',args.showExternalTowers);
    if(args.focusCity!==undefined){
      const select=element('skyPixelTeleportFocusCity');
      if(select){
        const wanted=resolveTeleportName(args.focusCity||'');
        const option=Array.from(select.options).find(o=>normalize(o.value||o.textContent)===normalize(wanted));
        select.value=option?option.value:''; emitInput(select);
      }
    }
    return {ok:true,message:'Updated the existing Teleport Network controls.',state:{
      direct:element('skyPixelTeleportShowDirect')?.checked,
      layover:element('skyPixelTeleportShowLayover')?.checked,
      third:element('skyPixelTeleportShowThird')?.checked,
      labels:element('skyPixelTeleportShowLabels')?.checked,
      externalTowers:element('skyPixelTeleportShowExternalTowers')?.checked,
      focusCity:element('skyPixelTeleportFocusCity')?.value||''
    }};
  }

  function controlMapInterface(command) {
    const args=command||{};
    const feature=normalize(args.feature||args.control||'');
    const enabled=args.enabled;
    if(feature.includes('night')) return clickControl('skyPixelNightModeToggle',enabled);
    if(feature.includes('political')||feature.includes('border')) return clickControl('skyPixelCountryBordersToggle',enabled);
    if(feature.includes('cloud')) return clickControl('skyPixelCloudLayerToggle',enabled);
    if(feature.includes('teleport')) return clickControl('skyPixelTeleportRoutesToggle',enabled);
    if(feature.includes('brightness')) return setRange('skyPixelMapBrightness',args.value??args.percent??100);
    if(feature.includes('label')) return setCheckbox('skyPixelTeleportShowLabels',enabled!==false);
    if(feature.includes('tower')) return setCheckbox('skyPixelTeleportShowExternalTowers',enabled!==false);
    return {ok:false,error:`Atlas does not have a control adapter for “${args.feature||''}” yet.`};
  }

  global.SkyPixelAtlasActions = Object.freeze({
    dispatch, availablePlaceNames, resolvePlaceName, getActivePlaceName, openPlacePanel,
    readWeatherSnapshot, readDailyForecasts, waitForWeather, getWeatherForPlace,
    getPlaceInfo, searchAtlas, showPlaceOnMap, getNearbyPlaces, getTeleportPath,
    openTeleportPlanner, operateTeleportRoute, controlTeleportNetwork, controlMapInterface,
    teleportCityNames, resolveTeleportName
  });
})(window);
