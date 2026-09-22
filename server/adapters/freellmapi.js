/**
 * FreeLLMAPI Adapter for OmniSEO-OS
 * Integration based on https://github.com/tashfeenahmed/freellmapi
 * 
 * Provides unified, keyless, zero-setup access to free open-source LLM inference
 * engines including Pollinations AI, AI Horde, and local FreeLLMAPI instances.
 */

const FREELLM_ENDPOINTS = {
  pollinations: 'https://text.pollinations.ai/openai',
  pollinationsModels: 'https://text.pollinations.ai/models',
  aihorde: 'https://oai.aihorde.net/v1/chat/completions',
  aihordeModels: 'https://oai.aihorde.net/v1/models',
  defaultLocalUrl: 'http://127.0.0.1:3001/v1'
};

const AIHORDE_ANON_KEY = '0000000000';

const HELPFUL_CONTENT_GUARDRAIL_SYSTEM_PROMPT = `You are an elite AI Search Architect and Technical Strategist for OmniSEO OS.
MANDATORY GUARDRAIL (Google Helpful Content System & E-E-A-T):
You must strictly comply with Google's official standard: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
1. PEOPLE-FIRST INTENT: Recommend strategies that solve real human user problems. Strictly prohibit search-engine-first anti-patterns (keyword quotas/stuffing, manufactured filler padding, and superficial aggregation).
2. "WHO, HOW, WHY" TRANSPARENCY:
   - "Who": Demand clear author attribution, credentials, and editorial transparency.
   - "How": Advocate transparent methodologies, testing data, original benchmark tables, and clear disclosures.
   - "Why": Ensure content is created solely to benefit human readers.
3. GROUNDING IN E-E-A-T: Base all tactical recommendations on Experience, Expertise, Authoritativeness, and foundational Trustworthiness.
Include precise HTML/code snippets where relevant (Schema.org Person/Article, canonicals, semantic tags). Be concise, actionable, and mathematically grounded.`;

/**
 * Execute chat completion via Pollinations.ai (Keyless, fast reasoning)
 */
async function callPollinations({ messages, model = 'openai-fast', timeoutMs = 35000 }) {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(FREELLM_ENDPOINTS.pollinations, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OmniSEO-OS-FreeLLMAPI/1.0'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 1024
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Pollinations API HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Pollinations returned an empty response body.');

    return {
      success: true,
      response: content,
      model: data.model || model,
      provider: 'pollinations',
      latencyMs: Date.now() - startTime,
      dataStatus: 'measured',
      isSimulated: false,
      provenance: `FreeLLMAPI / Pollinations AI (${data.model || model}) - 100% Free Keyless Inference`
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Execute chat completion via AI Horde (Decentralized community volunteer GPUs)
 */
async function callAiHorde({ messages, model = 'aphrodite/TheDrummer/Skyfall-31B-v4.2', apiKey = AIHORDE_ANON_KEY, timeoutMs = 45000 }) {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(FREELLM_ENDPOINTS.aihorde, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey || AIHORDE_ANON_KEY}`,
        'User-Agent': 'OmniSEO-OS-FreeLLMAPI/1.0'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: Math.max(16, 512)
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`AI Horde API HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI Horde returned an empty response body.');

    return {
      success: true,
      response: content,
      model: data.model || model,
      provider: 'aihorde',
      latencyMs: Date.now() - startTime,
      dataStatus: 'measured',
      isSimulated: false,
      provenance: `FreeLLMAPI / AI Horde (${data.model || model}) - Decentralized Volunteer Compute`
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Execute chat completion via Custom / Local FreeLLMAPI Gateway
 */
async function callCustomGateway({ customUrl, messages, model = 'auto', apiKey = '', timeoutMs = 30000 }) {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const cleanUrl = (customUrl || FREELLM_ENDPOINTS.defaultLocalUrl).replace(/\/+$/, '');
  const targetUrl = cleanUrl.endsWith('/chat/completions') ? cleanUrl : `${cleanUrl}/chat/completions`;

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'OmniSEO-OS-FreeLLMAPI/1.0'
  };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 1024
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`FreeLLMAPI Gateway HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('FreeLLMAPI gateway returned an empty response body.');

    return {
      success: true,
      response: content,
      model: data.model || model,
      provider: 'freellmapi_custom',
      latencyMs: Date.now() - startTime,
      dataStatus: 'measured',
      isSimulated: false,
      provenance: `FreeLLMAPI Gateway (${cleanUrl})`
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Universal Free LLM Query Dispatcher with Multi-Tier Automatic Fallback
 */
export async function queryFreeLlm({
  prompt,
  systemPrompt = null,
  context = '',
  provider = 'auto',
  customUrl = null,
  model = null,
  apiKey = null,
  timeoutMs = 40000
} = {}) {
  if (!prompt) throw new Error('Prompt is required for queryFreeLlm');

  const messages = [
    {
      role: 'system',
      content: systemPrompt || HELPFUL_CONTENT_GUARDRAIL_SYSTEM_PROMPT
    },
    {
      role: 'user',
      content: context ? `PAGE CONTEXT:\n${context}\n\nUSER PROMPT / TASK:\n${prompt}` : prompt
    }
  ];

  // 1. If explicit custom URL or provider is specified
  if (provider === 'local' || provider === 'custom' || customUrl) {
    return await callCustomGateway({ customUrl, messages, model: model || 'auto', apiKey, timeoutMs });
  }

  if (provider === 'pollinations') {
    try {
      return await callPollinations({ messages, model: model || 'openai-fast', timeoutMs });
    } catch (err) {
      console.warn(`[FreeLLMAPI] Pollinations direct call error (${err.message}). Attempting fallback to AI Horde...`);
      try {
        return await callAiHorde({ messages, timeoutMs: Math.max(timeoutMs, 40000) });
      } catch (hordeErr) {
        throw new Error(`Pollinations failed (${err.message}) and AI Horde fallback failed (${hordeErr.message})`);
      }
    }
  }

  if (provider === 'aihorde') {
    return await callAiHorde({ messages, model: model || 'aphrodite/TheDrummer/Skyfall-31B-v4.2', apiKey, timeoutMs: Math.max(timeoutMs, 45000) });
  }

  // 2. Auto Routing (Fast Pollinations -> Resilient AI Horde)
  const errors = [];

  // Try Pollinations first (Fastest, zero-auth, ~4-5s)
  try {
    return await callPollinations({ messages, model: model || 'openai-fast', timeoutMs: Math.min(timeoutMs, 30000) });
  } catch (pErr) {
    errors.push(`Pollinations: ${pErr.message}`);
  }

  // Fall back to AI Horde (Decentralized volunteer compute)
  try {
    return await callAiHorde({ messages, model: 'aphrodite/TheDrummer/Skyfall-31B-v4.2', apiKey, timeoutMs: 40000 });
  } catch (hErr) {
    errors.push(`AI Horde: ${hErr.message}`);
  }

  // If local gateway was provided as fallback
  if (customUrl) {
    try {
      return await callCustomGateway({ customUrl, messages, model: model || 'auto', apiKey, timeoutMs: 20000 });
    } catch (cErr) {
      errors.push(`Local Gateway: ${cErr.message}`);
    }
  }

  throw new Error(`All FreeLLMAPI providers failed: ${errors.join(' | ')}`);
}

/**
 * Health check & verification tester for FreeLLMAPI providers
 */
export async function testFreeLlmConnection({ provider = 'auto', customUrl = null } = {}) {
  const testPrompt = 'Respond with "OK" in 1 word.';
  const t0 = Date.now();

  try {
    const res = await queryFreeLlm({
      prompt: testPrompt,
      provider,
      customUrl,
      timeoutMs: provider === 'aihorde' ? 45000 : 15000
    });

    return {
      success: true,
      provider: res.provider,
      model: res.model,
      latencyMs: res.latencyMs || (Date.now() - t0),
      message: `Connection successful! Answered via ${res.provenance}.`
    };
  } catch (err) {
    return {
      success: false,
      provider,
      latencyMs: Date.now() - t0,
      error: err.message
    };
  }
}

/**
 * Catalog of supported free models across FreeLLMAPI providers
 */
export async function getFreeLlmCatalog() {
  let pollinationsModels = ['openai-fast (GPT-OSS 20B)', 'qwen', 'openai'];
  let aihordeModelsCount = 0;

  try {
    const pRes = await fetch(FREELLM_ENDPOINTS.pollinationsModels, { timeout: 4000 });
    if (pRes.ok) {
      const data = await pRes.json();
      if (Array.isArray(data)) {
        pollinationsModels = data.map(m => m.name || m.id || m);
      }
    }
  } catch {}

  try {
    const hRes = await fetch(FREELLM_ENDPOINTS.aihordeModels, {
      headers: { 'Authorization': `Bearer ${AIHORDE_ANON_KEY}` },
      timeout: 4000
    });
    if (hRes.ok) {
      const hData = await hRes.json();
      aihordeModelsCount = hData.data?.length || 0;
    }
  } catch {}

  return {
    success: true,
    repository: 'https://github.com/tashfeenahmed/freellmapi',
    providers: [
      {
        id: 'pollinations',
        name: 'Pollinations AI',
        auth: 'Keyless (Anonymous)',
        speed: 'Fast (~4s)',
        models: pollinationsModels
      },
      {
        id: 'aihorde',
        name: 'AI Horde',
        auth: 'Anonymous Sentinel Key (0000000000)',
        speed: 'Queued (~12-30s)',
        availableModelsCount: aihordeModelsCount || 28,
        featuredModel: 'aphrodite/TheDrummer/Skyfall-31B-v4.2'
      },
      {
        id: 'local',
        name: 'Local / Self-Hosted FreeLLMAPI',
        defaultUrl: FREELLM_ENDPOINTS.defaultLocalUrl,
        auth: 'OpenAI-Compatible Local Proxy'
      }
    ]
  };
}
