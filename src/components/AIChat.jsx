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
  return lines.map((line, idx) => {
    let content = line;
    
    if (content.startsWith('### ')) {
      return <h4 key={idx} style={{ marginTop: '1.2rem', marginBottom: '0.6rem', fontWeight: 600, color: 'var(--text-main)' }}>{parseBoldAndCode(content.slice(4))}</h4>;
    }
    if (content.startsWith('## ')) {
      return <h3 key={idx} style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 700, color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>{parseBoldAndCode(content.slice(3))}</h3>;
    }
    if (content.startsWith('# ')) {
      return <h2 key={idx} style={{ marginTop: '1.8rem', marginBottom: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>{parseBoldAndCode(content.slice(2))}</h2>;
    }
    if (content.startsWith('- ') || content.startsWith('* ')) {
      return <li key={idx} style={{ marginLeft: '1.5rem', marginBottom: '0.35rem', color: 'var(--text-main)' }}>{parseBoldAndCode(content.slice(2))}</li>;
    }
    if (/^\d+\.\s/.test(content)) {
      const match = content.match(/^\d+\.\s/);
      return <li key={idx} style={{ marginLeft: '1.5rem', marginBottom: '0.35rem', listStyleType: 'decimal', color: 'var(--text-main)' }}>{parseBoldAndCode(content.slice(match[0].length))}</li>;
    }
    if (content.trim() === '---') {
      return <hr key={idx} style={{ margin: '1.2rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />;
    }
    if (content.trim() === '') {
      return <div key={idx} style={{ height: '0.5rem' }} />;
    }
    return <p key={idx} style={{ marginBottom: '0.75rem', lineHeight: '1.6', color: 'var(--text-main)' }}>{parseBoldAndCode(content)}</p>;
  });
}

const getStoredApiKey = () => {
  return localStorage.getItem('groq_api_key') || import.meta.env.VITE_GROQ_API_KEY || '';
};

export default function AIChat() {
  const { exportAllData } = useStore();
  const [apiKey, setApiKey] = useState(getStoredApiKey);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [inputKey, setInputKey] = useState('');
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
      
      // We map and group information to make it super digestible for the model
      const monthsMap = {};
      (data.months || []).forEach(m => {
        monthsMap[m.id] = m;
      });

      const formattedExpenses = (data.expenses || []).map(e => {
        const monthName = monthsMap[e.month_id]?.name || 'Desconocido';
        return {
          mes: monthName,
          dia: e.dia,
          concepto: e.concepto,
          importe: `${e.importe} €`,
          entidad: e.entidad,
          estado: e.estado === 'P' ? 'Pagado' : e.estado === 'X' ? 'Pendiente' : 'No aplica'
        };
      });

      const formattedBalances = (data.balances || []).map(b => {
        const monthName = monthsMap[b.month_id]?.name || 'Desconocido';
        return {
          mes: monthName,
          saldos: {
            caixabank: `${b.caixabank} €`,
            hucha: `${b.hucha} €`,
            ing_nomina: `${b.ing_nomina} €`,
            ing_naranja: `${b.ing_naranja} €`
          }
        };
      });

      const formattedLoans = (data.loans || []).map(l => ({
        entidad: l.entidad,
        capital_inicial: `${l.capital_inicial} €`,
        total_a_pagar: `${l.total_a_pagar} €`,
        interes: `${l.interes}%`,
        cuota_mensual: `${l.cuota} €`,
        cuotas_restantes: l.faltan,
        pendiente: `${l.pendiente} €`,
        fecha_inicial: l.fecha_inicial,
        fecha_final: l.fecha_final
      }));

      const formattedCards = (data.cards || []).map(c => ({
        tarjeta: c.tarjeta,
        credito: `${c.credito} €`,
        proximo_recibo: `${c.cuota} €`,
        pendiente: `${c.pendiente} €`,
        disponible: `${c.disponible} €`
      }));

      return {
        meses: (data.months || []).map(m => ({ nombre: m.name, estado: m.status })),
        entidades: (data.entities || []).map(e => e.name),
        balances_mensuales: formattedBalances,
        prestamos: formattedLoans,
        tarjetas: formattedCards,
        gastos: formattedExpenses
      };
    } catch (err) {
      console.error('Error al generar contexto financiero:', err);
      return null;
    }
  };

  const handleSaveKey = (e) => {
    e.preventDefault();
    const trimmed = inputKey.trim();
    if (trimmed) {
      localStorage.setItem('groq_api_key', trimmed);
      setApiKey(trimmed);
      toast.success('Clave API de Groq guardada correctamente');
      setIsKeyModalOpen(false);
      setInputKey('');
    } else {
      localStorage.removeItem('groq_api_key');
      setApiKey(import.meta.env.VITE_GROQ_API_KEY || '');
      toast.info('Se restableció la configuración predeterminada');
      setIsKeyModalOpen(false);
      setInputKey('');
    }
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
      setIsKeyModalOpen(true);
      setLoading(false);
      return;
    }

    try {
      const financeData = await getFinanceContext();
      setStatusMessage('Analizando finanzas con Groq...');

      const systemPrompt = `Eres un asistente de finanzas personales inteligente, analítico y servicial. Tienes acceso completo a la base de datos de finanzas de la familia en formato JSON.
Tus respuestas deben ser claras, concisas, profesionales y usar formato Markdown (como negritas, listas y tablas si es conveniente) para facilitar la lectura.

A continuación, tienes la información financiera actualizada de la familia:
\`\`\`json
${JSON.stringify(financeData, null, 2)}
\`\`\`

Instrucciones importantes:
1. Responde en español de forma natural y clara.
2. Si te preguntan sobre totales, sumas o cálculos, hazlos con precisión matemática basándote en los datos recibidos.
3. Si el usuario te pregunta por gastos, analiza el campo "gastos" que tiene el "mes", "dia", "concepto", "importe", "entidad" y "estado".
4. "Pendiente" significa que el gasto está planificado pero no se ha cobrado todavía de la cuenta bancaria. "Pagado" significa que ya se ha deducido.
5. Puedes recomendar consejos de ahorro, optimización de presupuesto, alertar sobre deudas o dar respuestas a consultas históricas.
6. Sé muy educado, servicial e inteligente.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeApiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.filter(msg => msg.role !== 'system').map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: userMessage }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        const serverMsg = errData?.error?.message || response.statusText || `Error HTTP ${response.status}`;

        if (response.status === 401) {
          throw new Error('Clave API no válida o expirada. Pulsa en "Configurar Clave" para revisarla o actualizarla.');
        }
        if (serverMsg.includes('network settings') || serverMsg.includes('Access denied')) {
          throw new Error('Groq ha denegado la conexión (bloqueo de red o Cloudflare). Si tienes una VPN activa (como Surfshark), desactívala temporalmente.');
        }
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

  return (
    <div className="ai-chat-container fade-in">
      <div className="card chat-card">
        <div className="chat-header">
          <div className="chat-header-title">
            <Bot size={24} className="sparkle-icon" />
            <div>
              <h3>Asistente Financiero IA</h3>
              <span className="subtitle">Groq Llama 3.3 70B</span>
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
              onClick={() => {
                setInputKey(localStorage.getItem('groq_api_key') || '');
                setIsKeyModalOpen(true);
              }}
              title="Configurar clave API de Groq"
            >
              <Key size={14} style={{ color: apiKey ? 'var(--primary)' : '#f59e0b' }} />
              <span>{apiKey ? 'API Key activa' : 'Configurar Clave'}</span>
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
              onClick={() => {
                setInputKey(localStorage.getItem('groq_api_key') || '');
                setIsKeyModalOpen(true);
              }}
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
        title="Configurar API Key de Groq"
      >
        <form onSubmit={handleSaveKey}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
            Para interactuar con el asistente financiero, necesitas una clave de API de Groq (gratuita en <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>console.groq.com/keys</a>).
          </p>

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
                disabled={!inputKey.trim() && !localStorage.getItem('groq_api_key')}
              >
                Guardar clave
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
