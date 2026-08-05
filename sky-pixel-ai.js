(function (global) {
  'use strict';

  const DEFAULT_CONFIG = {
    endpoint: '',
    model: 'openrouter/free',
    requestTimeoutMs: 60000,
    headers: {},
    localFallback: true
  };

  const SESSION_KEY = 'skyPixelAtlasOpenRouterMessages';
  let conversationMessages = loadConversation();

  function loadConversation() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  function saveConversation() {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(conversationMessages.slice(-30))); } catch {}
  }

  function getConfig() {
    return { ...DEFAULT_CONFIG, ...(global.SKY_PIXEL_ATLAS_CONFIG || {}) };
  }

  async function postJSON(url, body, headers, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs || 60000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(headers || {}) },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
      if (!response.ok) throw new Error(data.error || data.message || `Atlas Worker request failed (${response.status})`);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function buildRuntimeContext(context) {
    const actions = global.SkyPixelAtlasActions;
    return {
      activePlace: actions?.getActivePlaceName?.() || context?.activePlace || '',
      availablePlaces: actions?.availablePlaceNames?.() || [],
      currentDateTime: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      mapContext: context || {}
    };
  }

  async function executeTool(call) {
    const actions = global.SkyPixelAtlasActions;
    const args = call.arguments || call.args || {};
    if (!actions) return { ok: false, error: 'Sky Pixel map actions are unavailable.' };
    if (call.name === 'get_active_place') return { ok:true, activePlace:actions.getActivePlaceName?.()||'' };
    if (call.name === 'get_weather') {
      const place=args.place||actions.getActivePlaceName?.()||'';
      if(!place)return {ok:false,error:'No place was named and no map location is currently open.'};
      const result=await actions.getWeatherForPlace(place);return result.ok?{ok:true,place:result.placeName,requestedDay:args.day||'',weather:result.weather}:result;
    }
    if (call.name === 'compare_weather') {
      const places=Array.isArray(args.places)?args.places.filter(Boolean).slice(0,6):[];if(places.length<2)return {ok:false,error:'At least two places are required.'};
      const results=[];for(const place of places){const r=await actions.getWeatherForPlace(place);results.push(r.ok?{ok:true,place:r.placeName,weather:r.weather}:{ok:false,place,error:r.reason||r.error});}
      return {ok:true,requestedDay:args.day||'',results};
    }
    if (call.name === 'search_atlas') return actions.searchAtlas(args.query||'',args.filters||{});
    if (call.name === 'get_place') return actions.getPlaceInfo(args.place||'');
    if (call.name === 'open_map_place') return await actions.showPlaceOnMap(args.place||'');
    if (call.name === 'get_nearby') return actions.getNearbyPlaces(args.place||'',{type:args.type||'',limit:args.limit||8});
    if (call.name === 'plan_teleport') {
      const from=args.from||actions.getActivePlaceName?.()||'';if(!from)return {ok:false,error:'Name a starting place or open one on the map first.'};
      return await actions.operateTeleportRoute(from,args.to||'',args);
    }
    if (call.name === 'control_teleport_network') return await actions.controlTeleportNetwork(args);
    if (call.name === 'control_map_interface') return actions.controlMapInterface(args);
    return { ok:false,error:`Unknown Atlas tool: ${call.name}` };
  }

  async function localFallback() {
    const actions = global.SkyPixelAtlasActions;
    const active = actions?.getActivePlaceName?.();
    return `OpenRouter is not connected yet. Deploy the included Cloudflare Worker and place its URL in atlas-config.js.${active ? ` The active map location is **${active}**.` : ''}`;
  }

  async function ask({ message, history, context }) {
    const config = getConfig();
    if (!config.endpoint) return localFallback();

    const userMessage = { role: 'user', content: String(message || '') };
    conversationMessages.push(userMessage);
    saveConversation();

    for (let pass = 0; pass < 6; pass += 1) {
      const data = await postJSON(config.endpoint, {
        messages: conversationMessages.slice(-30),
        context: buildRuntimeContext(context),
        model: config.model,
        history: Array.isArray(history) ? history.slice(-12) : []
      }, config.headers, config.requestTimeoutMs);

      if (data.type === 'answer') {
        const answer = data.answer || 'Atlas returned an empty answer.';
        conversationMessages.push({ role: 'assistant', content: answer });
        saveConversation();
        return answer;
      }

      if (data.type !== 'tool_calls' || !Array.isArray(data.calls) || !data.calls.length) {
        return data.answer || data.error || 'Atlas received an unreadable response from the OpenRouter Worker.';
      }

      if (data.assistantMessage) conversationMessages.push(data.assistantMessage);

      for (const call of data.calls) {
        let result;
        try { result = await executeTool(call); }
        catch (error) { result = { ok: false, error: error?.message || String(error) }; }
        conversationMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.name,
          content: JSON.stringify(result)
        });
      }
      saveConversation();
    }

    return 'Atlas reached its tool-call safety limit before producing an answer.';
  }

  function resetConversation() {
    conversationMessages = [];
    sessionStorage.removeItem(SESSION_KEY);
  }

  global.SkyPixelAtlasAI = Object.freeze({ ask, getConfig, resetConversation });
})(window);
