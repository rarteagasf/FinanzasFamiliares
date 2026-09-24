import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Send, Bot, User, Sparkles, Loader2, Copy, Check, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';

// Helper to parse inline markdown (code, bold, italic, links, strikethrough)
function parseInlineMarkdown(text) {
  if (!text) return '';

  // Tokenize inline markdown elements by priority order
  const tokenRegex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Inline code: `...`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={idx}
          style={{
            background: 'var(--bg-main)',
            padding: '0.15rem 0.35rem',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '0.85em',
            border: '1px solid var(--border)',
            color: 'var(--text-main)'
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold + Italic: ***...***
    if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
      return (
        <strong key={idx}>
          <em>{parseInlineMarkdown(part.slice(3, -3))}</em>
        </strong>
      );
    }

    // Bold: **...** or __...__
    if ((part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
        (part.startsWith('__') && part.endsWith('__') && part.length >= 4)) {
      return (
        <strong key={idx}>
          {parseInlineMarkdown(part.slice(2, -2))}
        </strong>
      );
    }

    // Italic: *...* or _..._
    if ((part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
        (part.startsWith('_') && part.endsWith('_') && part.length >= 2)) {
      return (
        <em key={idx}>
          {parseInlineMarkdown(part.slice(1, -1))}
        </em>
      );
    }

    // Strikethrough: ~~...~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return <del key={idx}>{parseInlineMarkdown(part.slice(2, -2))}</del>;
    }

    // Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          style={{
            color: 'var(--primary)',
            textDecoration: 'underline',
            fontWeight: 500
          }}
        >
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
}

function renderMarkdown(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // 1. Fenced Code Blocks (```lang ... ```)
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++;
      }
      elements.push(
        <div key={`code-${i}`} className="chat-code-container">
          {lang && <div className="chat-code-header">{lang}</div>}
          <pre className="chat-code-pre">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 2. Blockquotes (> ... )
    if (line.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote key={`quote-${i}`} className="chat-blockquote">
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx} style={{ margin: qIdx > 0 ? '0.35rem 0 0 0' : 0 }}>
              {parseInlineMarkdown(ql)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 3. Markdown Tables (starts and ends with '|')
    if (line.startsWith('|') && line.endsWith('|')) {
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
                    <th key={hIdx}>{parseInlineMarkdown(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx}>{parseInlineMarkdown(cell)}</td>
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

    // 4. Headings (Levels 1 to 6)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const parsed = parseInlineMarkdown(content);

      if (level === 1) {
        elements.push(
          <h2 key={`h1-${i}`} style={{ marginTop: '1.4rem', marginBottom: '0.65rem', fontWeight: 800, color: 'var(--text-main)', fontSize: '1.2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.35rem' }}>
            {parsed}
          </h2>
        );
      } else if (level === 2) {
        elements.push(
          <h3 key={`h2-${i}`} style={{ marginTop: '1.25rem', marginBottom: '0.55rem', fontWeight: 700, color: 'var(--text-main)', fontSize: '1.08rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
            {parsed}
          </h3>
        );
      } else if (level === 3) {
        elements.push(
          <h4 key={`h3-${i}`} style={{ marginTop: '1.1rem', marginBottom: '0.45rem', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.98rem' }}>
            {parsed}
          </h4>
        );
      } else if (level === 4) {
        elements.push(
          <h5 key={`h4-${i}`} style={{ marginTop: '0.95rem', marginBottom: '0.4rem', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.92rem' }}>
            {parsed}
          </h5>
        );
      } else if (level === 5) {
        elements.push(
          <h6 key={`h5-${i}`} style={{ marginTop: '0.85rem', marginBottom: '0.35rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.86rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {parsed}
          </h6>
        );
      } else {
        elements.push(
          <h6 key={`h6-${i}`} style={{ marginTop: '0.75rem', marginBottom: '0.3rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            {parsed}
          </h6>
        );
      }
      i++;
      continue;
    }

    // 5. Unordered list (*, -, +)
    if (/^[\*\-\+]\s/.test(line)) {
      const items = [];
      const startIdx = i;
      while (i < lines.length && /^[\*\-\+]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[\*\-\+]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${startIdx}`} className="chat-list">
          {items.map((item, idx) => (
            <li key={idx}>{parseInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // 6. Ordered list (1. 2. 3.)
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      const startIdx = i;
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${startIdx}`} className="chat-list" style={{ listStyleType: 'decimal' }}>
          {items.map((item, idx) => (
            <li key={idx}>{parseInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // 7. Horizontal line (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line)) {
      elements.push(<hr key={`hr-${i}`} style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />);
      i++;
      continue;
    }

    // 8. Blank line
    if (line === '') {
      elements.push(<div key={`empty-${i}`} style={{ height: '0.35rem' }} />);
      i++;
      continue;
    }

    // 9. Standard paragraph
    elements.push(
      <p key={`p-${i}`} style={{ marginBottom: '0.65rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
        {parseInlineMarkdown(rawLine)}
      </p>
    );
    i++;
  }

  return elements;
}

export default function AIChat() {
  const { exportAllData } = useStore();

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de finanzas familiares. Tengo acceso a todos tus datos financieros históricos: meses, gastos, entidades, tarjetas, préstamos y saldos de cuentas.\n\n¿En qué puedo ayudarte hoy? Puedes preguntarme resúmenes de meses anteriores, comparar gastos, ver deudas pendientes o pedir consejos de ahorro.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isModifyingPrompt, setIsModifyingPrompt] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

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

      // 5. Expenses summary (compact pipe-delimited format, capped at 120 items to optimize token usage)
      const allExpenses = [...(data.expenses || [])].reverse();
      const cappedExpenses = allExpenses.slice(0, 120);
      const expensesList = cappedExpenses.map(e => {
        const mName = monthsMap[e.month_id]?.name || '-';
        const st = e.estado === 'P' ? 'Pagado' : e.estado === 'X' ? 'Pendiente' : 'N/A';
        return `${mName} | Día ${e.dia} | ${e.concepto} | ${e.importe}€ | ${e.entidad} | ${st}`;
      }).join('\n');

      const truncatedNotice = allExpenses.length > 120
        ? `\n*(Mostrando los últimos 120 gastos de ${allExpenses.length} para optimización de respuesta)*`
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

### GASTOS REGISTRADOS (Mes | Día | Concepto | Importe | Estado):
${expensesList || 'Sin gastos'}${truncatedNotice}`;
    } catch (err) {
      console.error('Error al generar contexto financiero:', err);
      return '';
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setIsModifyingPrompt(false);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const financeText = await getFinanceContext();
      setStatusMessage('Consultando al asistente de IA...');

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

      // Historial limpio (últimos 4 mensajes)
      const cleanHistory = messages
        .filter(msg => msg.role !== 'system' && !msg.content.startsWith('❌') && !msg.content.startsWith('⚠️'))
        .slice(-4);

      // Llamada al endpoint proxy seguro en Vercel
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            ...cleanHistory,
            { role: 'user', content: userMessage }
          ],
          systemPrompt
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Error HTTP ${response.status} del servidor proxy`);
      }

      const data = await response.json();
      let assistantMessage = data?.content || 'No he recibido respuesta del asistente de IA.';

      if (data?.fallbackUsed) {
        assistantMessage = `> ⚡ *Respuesta generada automáticamente a través del motor de respaldo (${data.provider}) para no hacerte esperar.*\n\n` + assistantMessage;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (err) {
      console.error('Error al consultar el asistente:', err);
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

  const handleCopyText = async (text, index, label = 'Prompt') => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedIndex(index);
      toast.success(`${label} copiado al portapapeles`);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo copiar el texto');
    }
  };

  const handleModifyPrompt = (text) => {
    setInput(text);
    setIsModifyingPrompt(true);
    toast.info('Prompt cargado para modificar');
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = text.length;
        inputRef.current.setSelectionRange?.(len, len);
        inputRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      }
    }, 60);
  };

  const handleDiscardModification = () => {
    setIsModifyingPrompt(false);
    setInput('');
  };

  const handleQuickQuestion = (question) => {
    setInput(question);
    setIsModifyingPrompt(false);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = question.length;
        inputRef.current.setSelectionRange?.(len, len);
      }
    }, 60);
  };

  return (
    <div className="ai-chat-container fade-in">
      <div className="card chat-card">
        <div className="chat-header">
          <div className="chat-header-title">
            <Bot size={24} className="sparkle-icon" />
            <div>
              <h3>Asistente Financiero IA</h3>
              <span className="subtitle">
                Análisis inteligente y automático de finanzas familiares
              </span>
            </div>
          </div>
          <div className="chat-badge" title="Servicio de IA activo y centralizado en Vercel">
            <Sparkles size={14} />
            <span>IA Automática</span>
          </div>
        </div>

        <div className="chat-history">
          {messages.map((msg, index) => (
            <div key={index} className={`message-row ${msg.role}`}>
              <div className="avatar">
                {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className="message-bubble-wrapper">
                <div className="message-bubble">
                  <div className="message-content">
                    {renderMarkdown(msg.content)}
                  </div>
                </div>
                <div className={`message-actions ${msg.role}`}>
                  {msg.role === 'user' ? (
                    <>
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={() => handleCopyText(msg.content, index, 'Prompt')}
                        title="Copiar prompt al portapapeles"
                      >
                        {copiedIndex === index ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                        <span>{copiedIndex === index ? 'Copiado' : 'Copiar'}</span>
                      </button>
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={() => handleModifyPrompt(msg.content)}
                        title="Cargar prompt en el cuadro de texto para editarlo"
                      >
                        <Pencil size={12} />
                        <span>Modificar</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="msg-action-btn"
                      onClick={() => handleCopyText(msg.content, index, 'Respuesta')}
                      title="Copiar respuesta completa al portapapeles"
                    >
                      {copiedIndex === index ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                      <span>{copiedIndex === index ? 'Copiada' : 'Copiar'}</span>
                    </button>
                  )}
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

        {isModifyingPrompt && (
          <div className="modifying-prompt-banner">
            <div className="modifying-prompt-banner-text">
              <Pencil size={13} />
              <span>Modificando prompt anterior</span>
            </div>
            <button
              type="button"
              className="modifying-prompt-discard-btn"
              onClick={handleDiscardModification}
              title="Cancelar edición del prompt"
            >
              <X size={13} />
              <span>Descartar</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="chat-input-area">
          <input
            ref={inputRef}
            type="text"
            className="input chat-input"
            placeholder={isModifyingPrompt ? "Modifica tu prompt aquí y pulsa Enviar..." : "Haz una pregunta sobre tus finanzas..."}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="btn btn-primary send-btn"
            disabled={loading || !input.trim()}
            title={isModifyingPrompt ? "Enviar prompt modificado" : "Enviar"}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
