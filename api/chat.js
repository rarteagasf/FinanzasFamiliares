// Serverless function proxy para Vercel (/api/chat)
// Proporciona acceso universal y seguro a los motores de IA sin exponer claves en el cliente.

export default async function handler(req, res) {
  // Manejo de cabeceras CORS para desarrollo y producción
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Solo se acepta POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (parseErr) {
        return res.status(400).json({ error: 'Cuerpo de petición no es JSON válido.' });
      }
    }

    const { messages = [], systemPrompt = '' } = body || {};

    if (!messages.length) {
      return res.status(400).json({ error: 'No se han proporcionado mensajes para el asistente.' });
    }

    // Admite tanto variables seguras del servidor como variables públicas heredadas
    const groqKey = (process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '').trim();
    const geminiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();

    if (!groqKey && !geminiKey) {
      return res.status(500).json({
        error: 'No hay ninguna clave API configurada en el servidor (GROQ_API_KEY o GEMINI_API_KEY). Añádela en las variables de entorno de Vercel.'
      });
    }

    let lastError = null;

    // === 1. INTENTO CON GROQ (Motor recomendado: ultrarrápido y estable) ===
    if (groqKey) {
      try {
        const groqResult = await callGroq(groqKey, systemPrompt, messages);
        return res.status(200).json({
          content: groqResult.content,
          provider: 'groq',
          model: groqResult.model,
          fallbackUsed: false
        });
      } catch (err) {
        console.warn('Groq falló, intentando conmutación a Gemini:', err.message);
        lastError = err;
      }
    }

    // === 2. FALLBACK O INTENTO DIRECTO CON GOOGLE GEMINI ===
    if (geminiKey) {
      try {
        const geminiResult = await callGemini(geminiKey, systemPrompt, messages);
        return res.status(200).json({
          content: geminiResult.content,
          provider: 'gemini',
          model: geminiResult.model,
          fallbackUsed: Boolean(groqKey && lastError)
        });
      } catch (err) {
        console.error('Gemini también falló:', err.message);
        lastError = err;
      }
    }

    return res.status(502).json({
      error: `Error al consultar los motores de IA: ${lastError?.message || 'Servidores no disponibles temporalmente'}.`
    });

  } catch (globalErr) {
    console.error('Error no controlado en /api/chat:', globalErr);
    return res.status(500).json({
      error: `Error interno en el servidor proxy de IA: ${globalErr.message}`
    });
  }
}

// Llamada a Groq API
async function callGroq(apiKey, systemPrompt, messages) {
  const formattedMessages = [];
  if (systemPrompt) {
    formattedMessages.push({ role: 'system', content: systemPrompt });
  }

  // Filtrar y formatear historial limpio
  messages.forEach(msg => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      formattedMessages.push({ role: msg.role, content: msg.content });
    }
  });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: formattedMessages,
      temperature: 0.3,
      max_tokens: 2500
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Groq devolvió HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Respuesta vacía recibida del motor Groq');
  }

  return {
    content: text,
    model: 'openai/gpt-oss-120b'
  };
}

// Llamada a Google Gemini API
async function callGemini(apiKey, systemPrompt, messages) {
  const contents = messages
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

  const payload = {
    contents,
    generationConfig: {
      maxOutputTokens: 8192,
      thinkingConfig: {
        thinkingLevel: 'low'
      }
    }
  };

  if (systemPrompt) {
    payload.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error?.message || `Google Gemini devolvió HTTP ${response.status}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const textParts = candidate?.content?.parts
    ?.filter(p => !p.thought && p.text)
    ?.map(p => p.text) || [];

  const text = textParts.join('').trim() || candidate?.content?.parts?.[0]?.text || '';
  if (!text) {
    throw new Error('Respuesta vacía recibida de Google Gemini');
  }

  return {
    content: text,
    model: 'gemini-3.6-flash'
  };
}
