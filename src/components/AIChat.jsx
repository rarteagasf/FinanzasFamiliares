import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Send, Bot, User, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

export default function AIChat() {
  const { exportAllData } = useStore();
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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ **Error de configuración**: No se ha encontrado la clave API de Groq en las variables de entorno (`VITE_GROQ_API_KEY`). Por favor, configúrala en tu archivo `.env.local` y reinicia el servidor de desarrollo.'
      }]);
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
          'Authorization': `Bearer ${apiKey}`
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
        const errData = await response.json();
        throw new Error(errData?.error?.message || 'Error al conectar con Groq');
      }

      const resData = await response.json();
      const assistantMessage = resData?.choices?.[0]?.message?.content || 'No he recibido respuesta del modelo.';

      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (err) {
      console.error(err);
      toast.error('Error al consultar el asistente de IA');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ **Error de comunicación**: Hubo un problema al procesar tu solicitud.\nDetalle: \`${err.message}\``
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
          <div className="chat-badge">
            <Sparkles size={14} />
            <span>Inteligente</span>
          </div>
        </div>

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
    </div>
  );
}
