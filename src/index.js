const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Load current conditions and the complete visible multi-day forecast from a Sky Pixel location panel. Use this for current weather, a named weekday, tomorrow, weekend outlooks, rain, snow, wind, humidity, sunrise, sunset, clothing, exploration, or photography questions.',
      parameters: {
        type: 'object',
        properties: {
          place: { type: 'string', description: 'Exact Sky Pixel place name. Use the active map place when the user omits a location.' },
          day: { type: 'string', description: 'Requested day or period, such as Thursday, tomorrow, today, or weekend. Leave empty for current conditions.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'compare_weather',
      description: 'Load weather for two or more Sky Pixel places and compare temperatures, conditions, precipitation, wind, or suitability.',
      parameters: {
        type: 'object',
        properties: {
          places: { type: 'array', items: { type: 'string' }, description: 'Exact Sky Pixel place names to compare.' },
          day: { type: 'string', description: 'Optional requested day or period.' }
        },
        required: ['places']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_active_place',
      description: 'Get the location currently open in the Sky Pixel map. Use when the user says here, there, this city, or omits the location.',
      parameters: { type: 'object', properties: {} }
    }
  }
];

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function allowedOrigins(env) {
  const configured = String(env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  return new Set([
    ...configured,
    'https://elijah12-12.github.io',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8000',
    'null'
  ]);
}

function cors(origin, env) {
  const normalized = normalizeOrigin(origin);
  const permitted = allowedOrigins(env);
  const allowOrigin = permitted.has(normalized)
    ? normalized
    : 'https://elijah12-12.github.io';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(data, status, origin, env) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...cors(origin, env)
    }
  });
}

function systemPrompt(context) {
  return `You are Atlas, the embedded AI weather assistant for the Sky Pixel Minecraft world map.

Your weather facts MUST come from the custom tools. Never invent current conditions or forecasts. Use get_weather for one place and compare_weather for multiple places. If a location is omitted, use context.activePlace; call get_active_place only when necessary. Interpret natural-language dates using context.currentDateTime and timezone. A weather tool returns the complete weather panel snapshot and forecast cards. Inspect requestedDay and the forecasts object carefully. If the requested day is absent, state that the panel does not expose it rather than guessing.

Answer naturally and directly. Include the place, requested day, condition, temperatures, precipitation chance, wind, and requested details when available. For comparisons, explicitly compare every requested place. You may make practical recommendations, but distinguish recommendations from raw weather data.

Runtime context:
${JSON.stringify(context || {})}`;
}

function safeMessages(input) {
  const messages = Array.isArray(input.messages) ? input.messages : [];
  return messages.filter(item => item && ['user', 'assistant', 'tool'].includes(item.role)).slice(-30);
}

function parseArguments(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string' || !value.trim()) return {};
  try { return JSON.parse(value); } catch { return {}; }
}

async function callOpenRouter(env, body) {
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured on the Worker.');

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.SITE_URL || 'https://elijah12-12.github.io/Sky-Pixel-World-Map/',
      'X-Title': 'Sky Pixel Atlas'
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: { message: text } }; }
  if (!response.ok) throw new Error(data?.error?.message || `OpenRouter API failed (${response.status})`);
  return data;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin, env) });
    }

    if (request.method === 'GET') {
      return json({
        ok: true,
        service: 'Sky Pixel Atlas OpenRouter Worker',
        model: env.OPENROUTER_MODEL || 'openrouter/free',
        message: 'Worker is online. Atlas requests use POST.'
      }, 200, origin, env);
    }

    if (request.method !== 'POST') {
      return json({ error: 'Use POST.' }, 405, origin, env);
    }

    try {
      const input = await request.json();
      const messages = [
        { role: 'system', content: systemPrompt(input.context) },
        ...safeMessages(input)
      ];

      if (!messages.some(message => message.role === 'user')) {
        messages.push({ role: 'user', content: String(input.message || '') });
      }

      const completion = await callOpenRouter(env, {
        model: input.model || env.OPENROUTER_MODEL || 'openrouter/free',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 900
      });

      const choice = completion?.choices?.[0];
      const message = choice?.message || {};
      const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];

      if (toolCalls.length) {
        return json({
          type: 'tool_calls',
          assistantMessage: {
            role: 'assistant',
            content: message.content || null,
            tool_calls: toolCalls
          },
          calls: toolCalls.map(call => ({
            id: call.id,
            name: call.function?.name,
            arguments: parseArguments(call.function?.arguments)
          })),
          model: completion.model || input.model || env.OPENROUTER_MODEL || 'openrouter/free'
        }, 200, origin, env);
      }

      return json({
        type: 'answer',
        answer: typeof message.content === 'string' && message.content.trim()
          ? message.content.trim()
          : 'I could not produce a weather answer.',
        model: completion.model || input.model || env.OPENROUTER_MODEL || 'openrouter/free'
      }, 200, origin, env);
    } catch (error) {
      return json({ error: error?.message || String(error) }, 500, origin, env);
    }
  }
};
