import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Send, Bot, User, Sparkles, Loader2, Key, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import Modal from './ui/Modal';

// Helper to parse simple markdown to JSX safely
function parseBoldAndCode(text) {
  const parts = text.split('**');
  return parts.map((part, i) => {
    const isBold = i % 2 === 1;
    const codeParts = part.split('`');
    const rendered = codeParts.map((subPart, j) => {
      const isCode = j % 2 === 1;
      if (isCode) {
        return (
          <code key={j} style={{
            background: 'var(--bg-main)',
            padding: '0.15rem 0.35rem',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '0.85em',
            border: '1px solid var(--border)'
          }}>
            {subPart}
          </code>
        );
      }
      return subPart;
    });

    if (isBold) {
      return <strong key={i}>{rendered}</strong>;
    }
    return <span key={i}>{rendered}</span>;
  });
}

function renderMarkdown(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Markdown Table detection (starts and ends with '|')
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const headerCells = tableLines[0].slice(1, -1).split('|').map(c => c.trim());
        const dataRows = [];
        for (let r = 1; r < tableLines.length; r++) {
          if (/^\|[\s\-:|]+\|$/.test(tableLines[r])) continue; // separator row |---|---|
          dataRows.push(tableLines[r].slice(1, -1).split('|').map(c => c.trim()));
        }

        elements.push(
          <div key={`table-${i}`} className="chat-table-container">
            <table className="chat-table">
              <thead>
                <tr>
                  {headerCells.map((h, hIdx) => (
                    <th key={hIdx}>{parseBoldAndCode(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx}>{parseBoldAndCode(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Unordered list (* or -)
    if (/^[\*\-]\s/.test(line.trim())) {
      const items = [];
      const startIdx = i;
      while (i < lines.length && /^[\*\-]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[\*\-]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${startIdx}`} className="chat-list">
          {items.map((item, idx) => (
            <li key={idx}>{parseBoldAndCode(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list (1. 2.)
    if (/^\d+\.\s/.test(line.trim())) {
      const items = [];
      const startIdx = i;
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${startIdx}`} className="chat-list" style={{ listStyleType: 'decimal' }}>
          {items.map((item, idx) => (
            <li key={idx}>{parseBoldAndCode(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h4-${i}`} style={{ marginTop: '1.1rem', marginBottom: '0.45rem', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
          {parseBoldAndCode(line.slice(4))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h3-${i}`} style={{ marginTop: '1.25rem', marginBottom: '0.6rem', fontWeight: 700, color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '0.3rem', fontSize: '1.05rem' }}>
          {parseBoldAndCode(line.slice(3))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h2-${i}`} style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 800, color: 'var(--text-main)', fontSize: '1.15rem' }}>
          {parseBoldAndCode(line.slice(2))}
        </h2>
      );
      i++;
      continue;
    }

    // Horizontal line
    if (line.trim() === '---') {
      elements.push(<hr key={`hr-${i}`} style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />);
      i++;
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      elements.push(<div key={`empty-${i}`} style={{ height: '0.35rem' }} />);
      i++;
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${i}`} style={{ marginBottom: '0.65rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
        {parseBoldAndCode(line)}
      </p>
    );
    i++;
  }

  return elements;
}

const DEFAULT_MODEL = 'openai/gpt-oss-120b';

const AVAILABLE_MODELS = [
  { id: 'openai/gpt-oss-120b', name: 'OpenAI GPT-OSS 120B (Recomendado, inteligente)', desc: '120B parámetros, 131k de contexto, razonamiento avanzado.' },
  { id: 'openai/gpt-oss-20b', name: 'OpenAI GPT-OSS 20B (Ultrarrápido)', desc: '1.000 tokens/segundo, 131k de contexto, ultra veloz.' },
  { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B (Alibaba Cloud)', desc: 'Alta capacidad matemática y lógica.' }
];

const getStoredApiKey = () => {
  return localStorage.getItem('groq_api_key') || import.meta.env.VITE_GROQ_API_KEY || '';
};

export default function AIChat() {
  const { exportAllData } = useStore();
  const [apiKey, setApiKey] = useState(getStoredApiKey);
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem('groq_model');
    // If the saved model was an old Llama model that Groq no longer supports, reset to DEFAULT_MODEL
    if (!saved || saved.includes('llama') || !AVAILABLE_MODELS.some(m => m.id === saved)) {
      localStorage.setItem('groq_model', DEFAULT_MODEL);
      return DEFAULT_MODEL;
    }
    return saved;
  });
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [tempModel, setTempModel] = useState(selectedModel);
  const [showKeyText, setShowKeyText] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de finanzas familiares basado en Groq. Tengo acceso a todos tus datos financieros históricos: meses, gastos, entidades, tarjetas, préstamos y saldos de cuentas.\n\n¿En qué puedo ayudarte hoy? Puedes preguntarme resúmenes de meses anteriores, comparar gastos, ver deudas pendientes o pedir consejos de ahorro.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const getFinanceContext = async () => {
    try {
      setStatusMessage('Recopilando datos financieros...');
      const data = await exportAllData();

      const monthsMap = {};
      (data.months || []).forEach(m => {
        monthsMap[m.id] = m;
      });

      // 1. Months list
      const monthsList = (data.months || [])
        .map(m => `${m.name} (${m.status === 'open' ? 'Actual' : 'Cerrado'})`)
        .join(', ');

      // 2. Balances summary
      const balancesList = (data.balances || []).map(b => {
        const mName = monthsMap[b.month_id]?.name || 'Mes';
        return `- ${mName}: CaixaBank ${b.caixabank}€ | ING Nómina ${b.ing_nomina}€ | ING Naranja ${b.ing_naranja}€ | Hucha ${b.hucha}€`;
      }).join('\n');

      // 3. Loans summary
      const loansList = (data.loans || []).map(l => {
        return `- ${l.entidad}: Pendiente ${l.pendiente}€ | Cuota ${l.cuota}€/mes | Faltan ${l.faltan} cuotas | Total ${l.total_a_pagar}€ | Interés ${l.interes}%`;
      }).join('\n');

      // 4. Cards summary
      const cardsList = (data.cards || []).map(c => {
        return `- ${c.tarjeta}: Crédito ${c.credito}€ | Próx. Recibo ${c.cuota}€ | Pendiente ${c.pendiente}€ | Disponible ${c.disponible}€`;
      }).join('\n');

      // 5. Expenses summary (compact pipe-delimited format, capped at 120 items to stay strictly under rate limits)
      const allExpenses = [...(data.expenses || [])].reverse();
      const cappedExpenses = allExpenses.slice(0, 120);
      const expensesList = cappedExpenses.map(e => {
        const mName = monthsMap[e.month_id]?.name || '-';
        const st = e.estado === 'P' ? 'Pagado' : e.estado === 'X' ? 'Pendiente' : 'N/A';
        return `${mName} | Día ${e.dia} | ${e.concepto} | ${e.importe}€ | ${e.entidad} | ${st}`;
      }).join('\n');

      const truncatedNotice = allExpenses.length > 120
        ? `\n*(Mostrando los últimos 120 gastos de ${allExpenses.length} para optimización de tokens)*`
        : '';

      return `## DATOS FINANCIEROS ACTUALIZADOS:

### MESES:
${monthsList || 'Sin meses registrados'}

### SALDOS POR MES:
${balancesList || 'Sin saldos registrados'}

### PRÉSTAMOS ACTIVOS:
${loansList || 'Sin préstamos'}

### TARJETAS DE CRÉDITO:
${cardsList || 'Sin tarjetas'}

### GASTOS REGISTRADOS (Mes | Día | Concepto | Importe | Entidad | Estado):
${expensesList || 'Sin gastos'}${truncatedNotice}`;
    } catch (err) {
      console.error('Error al generar contexto financiero:', err);
      return '';
    }
  };

  const handleSaveKey = (e) => {
    e.preventDefault();
    const trimmed = inputKey.trim();
    if (trimmed) {
      localStorage.setItem('groq_api_key', trimmed);
      setApiKey(trimmed);
    }
    if (tempModel) {
      localStorage.setItem('groq_model', tempModel);
      setSelectedModel(tempModel);
    }
    toast.success('Configuración guardada correctamente');
    setIsKeyModalOpen(false);
    setInputKey('');
  };

  const openConfigModal = () => {
    setInputKey(localStorage.getItem('groq_api_key') || '');
    setTempModel(selectedModel);
    setIsKeyModalOpen(true);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    const activeApiKey = (apiKey || getStoredApiKey() || '').trim();
    if (!activeApiKey) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ **Falta la clave API de Groq**: Para consultar al asistente, introduce tu clave API pulsando en el botón **Configurar Clave** arriba o agrégala a las variables de entorno de tu proyecto en Vercel (`VITE_GROQ_API_KEY`).'
      }]);
      openConfigModal();
      setLoading(false);
      return;
    }

    try {
      const financeText = await getFinanceContext();
      setStatusMessage('Analizando finanzas con Groq...');

      const systemPrompt = `Eres un asistente de finanzas personales inteligente, analítico y servicial. Tienes acceso completo a la base de datos de finanzas familiares.

DIRECTRICES DE PRESENTACIÓN Y LEGIBILIDAD (MUY IMPORTANTE):
1. Estructura tu respuesta con encabezados claros '### ' para cada área temática (ej.: ### 💰 Resumen General, ### 🏦 Cuentas y Saldos, ### 💳 Préstamos y Deudas, ### 💡 Diagnóstico).
2. Usa viñetas limpias (- ) destacando siempre en negrita el concepto y la cifra (ej.: - **Saldo Total**: 17.797,65 €).
3. Si utilizas tablas Markdown, hazlas sencillas y directas (| Concepto | Importe | Estado |). No introduzcas párrafos largos dentro de las celdas; utiliza viñetas explicativas debajo.
4. Deja espacios limpios entre apartados para que el análisis sea claro, estético y fácil de escanear a primera vista.

${financeText}

Instrucciones de análisis y cálculo:
1. Responde siempre en español con precisión profesional.
2. Si te preguntan sobre totales, sumas o cálculos, hazlos con exactitud matemática basándote en los datos recibidos.
3. En el detalle de gastos: "Pendiente" significa que el gasto está planificado pero no se ha cobrado todavía de la cuenta. "Pagado" significa que ya se ha deducido.
4. Recomienda consejos útiles de ahorro, optimización de presupuesto o alertas sobre endeudamiento según los datos.`;

      // Keep only last 4 messages, discarding errors, to stay well below Groq TPM limits
      const cleanHistory = messages
        .filter(msg => msg.role !== 'system' && !msg.content.startsWith('❌') && !msg.content.startsWith('⚠️'))
        .slice(-4)
        .map(msg => ({ role: msg.role, content: msg.content }));

      const makeGroqRequest = async (modelToUse) => {
        return await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeApiKey}`
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              { role: 'system', content: systemPrompt },
              ...cleanHistory,
              { role: 'user', content: userMessage }
            ],
            temperature: 0.3,
            max_tokens: 1500
          })
        });
      };

      let activeModel = selectedModel;
      if (activeModel.includes('llama') || !AVAILABLE_MODELS.some(m => m.id === activeModel)) {
        activeModel = DEFAULT_MODEL;
        setSelectedModel(DEFAULT_MODEL);
        localStorage.setItem('groq_model', DEFAULT_MODEL);
      }
      let response = await makeGroqRequest(activeModel);

      // Auto-fallback if the model is retired or not accessible on this key
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        const serverMsg = errData?.error?.message || response.statusText || `Error HTTP ${response.status}`;

        if (response.status === 404 || serverMsg.includes('does not exist') || serverMsg.includes('do not have access')) {
          const fallbackModel = activeModel !== DEFAULT_MODEL ? DEFAULT_MODEL : 'openai/gpt-oss-20b';
          toast.info(`El modelo ${activeModel} no está disponible. Reintentando con ${fallbackModel}...`);
          activeModel = fallbackModel;
          setSelectedModel(fallbackModel);
          localStorage.setItem('groq_model', fallbackModel);
          response = await makeGroqRequest(fallbackModel);
        } else if (response.status === 429 || serverMsg.includes('TPM') || serverMsg.includes('Tokens Per Minute') || serverMsg.includes('Request too large')) {
          throw new Error('Límite de tokens por minuto (TPM) alcanzado en el plan gratuito de Groq. Espera unos segundos y vuelve a intentarlo.');
        } else {
          if (response.status === 401) {
            throw new Error('Clave API no válida o expirada. Pulsa en "Configurar Clave" para revisarla o actualizarla.');
          }
          if (serverMsg.includes('network settings') || serverMsg.includes('Access denied')) {
            throw new Error('Groq ha denegado la conexión (bloqueo de red o Cloudflare). Si tienes una VPN activa (como Surfshark), desactívala temporalmente.');
          }
          throw new Error(serverMsg);
        }
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        const serverMsg = errData?.error?.message || response.statusText || `Error HTTP ${response.status}`;
        throw new Error(serverMsg);
      }

      const resData = await response.json();
      const assistantMessage = resData?.choices?.[0]?.message?.content || 'No he recibido respuesta del modelo.';

      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (err) {
      console.error(err);
      toast.error('Error al consultar el asistente de IA');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ **Error al consultar el asistente**: ${err.message}`
      }]);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleQuickQuestion = (question) => {
    setInput(question);
  };

  const currentModelDisplayName = AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name.split(' (')[0] || selectedModel;

  return (
    <div className="ai-chat-container fade-in">
      <div className="card chat-card">
        <div className="chat-header">
          <div className="chat-header-title">
            <Bot size={24} className="sparkle-icon" />
            <div>
              <h3>Asistente Financiero IA</h3>
              <span className="subtitle">Groq {currentModelDisplayName}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '8px',
                border: apiKey ? '1px solid var(--border)' : '1px solid #f59e0b',
                color: apiKey ? 'var(--text-main)' : '#f59e0b'
              }}
              onClick={openConfigModal}
              title="Configurar clave API y modelo de Groq"
            >
              <Key size={14} style={{ color: apiKey ? 'var(--primary)' : '#f59e0b' }} />
              <span>{apiKey ? 'Configurar' : 'Configurar Clave'}</span>
            </button>
            <div className="chat-badge">
              <Sparkles size={14} />
              <span>Inteligente</span>
            </div>
          </div>
        </div>

        {!apiKey && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
            padding: '0.65rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.825rem',
            color: 'var(--text-main)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <span>No se ha detectado una clave API de Groq en este dispositivo.</span>
            </div>
            <button
              className="btn btn-primary"
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              onClick={openConfigModal}
            >
              Configurar clave
            </button>
          </div>
        )}

        <div className="chat-history">
          {messages.map((msg, index) => (
            <div key={index} className={`message-row ${msg.role}`}>
              <div className="avatar">
                {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className="message-bubble">
                <div className="message-content">
                  {renderMarkdown(msg.content)}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row assistant loading-row">
              <div className="avatar">
                <Bot size={18} />
              </div>
              <div className="message-bubble loading-bubble">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 size={16} className="spinner" />
                  <span>{statusMessage}</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {messages.length === 1 && (
          <div className="quick-questions">
            <h4>Preguntas sugeridas:</h4>
            <div className="quick-grid">
              <button className="quick-btn" onClick={() => handleQuickQuestion('¿Cuál es mi situación financiera actual? Hazme un resumen.')}>
                📊 Situación actual
              </button>
              <button className="quick-btn" onClick={() => handleQuickQuestion('¿Cuáles son mis gastos más altos este mes?')}>
                💸 Gastos más altos
              </button>
              <button className="quick-btn" onClick={() => handleQuickQuestion('¿Cuánto debo en préstamos y cuánto pago al mes?')}>
                🏦 Detalle de préstamos
              </button>
              <button className="quick-btn" onClick={() => handleQuickQuestion('Dame 3 consejos de ahorro basados en mis datos.')}>
                💡 Consejos de ahorro
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="chat-input-area">
          <input
            type="text"
            className="input chat-input"
            placeholder="Haz una pregunta sobre tus finanzas..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary send-btn" disabled={loading || !input.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>

      <Modal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        title="Configuración de Asistente IA (Groq)"
      >
        <form onSubmit={handleSaveKey}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
            Para interactuar con el asistente financiero, necesitas una clave de API de Groq (gratuita en <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>console.groq.com/keys</a>).
          </p>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>
              Modelo de IA
            </label>
            <select
              className="input"
              value={tempModel}
              onChange={e => setTempModel(e.target.value)}
            >
              {AVAILABLE_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
              {AVAILABLE_MODELS.find(m => m.id === tempModel)?.desc}
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>Clave API (gsk_...)</span>
              {apiKey && (
                <span style={{ color: 'var(--success)', fontWeight: 500, fontSize: '0.75rem' }}>
                  ✓ Clave configurada
                </span>
              )}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showKeyText ? 'text' : 'password'}
                className="input"
                placeholder={apiKey ? '••••••••••••••••••••••••••••••••' : 'gsk_...'}
                value={inputKey}
                onChange={e => setInputKey(e.target.value)}
                style={{ paddingRight: '2.5rem', fontFamily: showKeyText ? 'monospace' : 'inherit' }}
                autoFocus
              />
              <button
                type="button"
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
                onClick={() => setShowKeyText(!showKeyText)}
                title={showKeyText ? 'Ocultar' : 'Mostrar'}
              >
                {showKeyText ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
              {localStorage.getItem('groq_api_key')
                ? 'Actualmente usando una clave guardada en este navegador.'
                : import.meta.env.VITE_GROQ_API_KEY
                ? 'Actualmente usando la clave de variables de entorno del sistema.'
                : 'Introduce tu clave personal para usar el chat en este navegador.'}
            </span>
          </div>

          <div style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            lineHeight: '1.4'
          }}>
            <p style={{ margin: 0 }}>
              💡 <strong>Configuración en Vercel</strong>: Si deseas que esté disponible automáticamente en todos tus dispositivos sin tener que escribirla aquí, añade la variable <code>VITE_GROQ_API_KEY</code> en la configuración de Vercel y haz un Redeploy.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
            {localStorage.getItem('groq_api_key') ? (
              <button
                type="button"
                className="btn btn-danger"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                onClick={() => {
                  localStorage.removeItem('groq_api_key');
                  setApiKey(import.meta.env.VITE_GROQ_API_KEY || '');
                  setInputKey('');
                  toast.info('Clave de navegador eliminada');
                  setIsKeyModalOpen(false);
                }}
              >
                Eliminar clave
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsKeyModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!inputKey.trim() && !localStorage.getItem('groq_api_key') && tempModel === selectedModel}
              >
                Guardar
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
