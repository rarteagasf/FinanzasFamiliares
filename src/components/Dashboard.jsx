import { useState } from 'react';
import { useStore } from '../store/useStore';
import { ArrowDownCircle, Pencil } from 'lucide-react';
import { parseNum, normalizeDecimalInput, formatCurrency, formatInputDecimal } from '../utils';
import CurrencyValue from './ui/CurrencyValue';

export default function Dashboard() {
  const { balances, expenses, prevPendingExpenses = [], cards, entities, updateBalance } = useStore();
  const [editingAccount, setEditingAccount] = useState(null);
  const [editValue, setEditValue] = useState('');

  const totalSaldos = (balances.caixabank || 0) + (balances.hucha || 0) + (balances.ing_nomina || 0) + (balances.ing_naranja || 0);
  
  // Calcular gastos pendientes totales
  const totalPendienteCaixa = expenses
    .filter(e => e.estado === 'X' && e.entidad === 'CAIXABANK')
    .reduce((acc, curr) => acc + curr.importe, 0)
    + prevPendingExpenses
    .filter(e => e.estado === 'X' && e.entidad === 'CAIXABANK')
    .reduce((acc, curr) => acc + curr.importe, 0);
    
  const totalPendienteING = expenses
    .filter(e => e.estado === 'X' && e.entidad === 'ING')
    .reduce((acc, curr) => acc + curr.importe, 0)
    + prevPendingExpenses
    .filter(e => e.estado === 'X' && e.entidad === 'ING')
    .reduce((acc, curr) => acc + curr.importe, 0);

  const totalGastosPendientes = totalPendienteCaixa + totalPendienteING;
  
  // Disponible
  const dispCaixa = balances.caixabank - totalPendienteCaixa;
  const dispING = balances.ing_nomina - totalPendienteING;
  const totalDisponible = dispCaixa + dispING + balances.ing_naranja + balances.hucha;

  // Gastos Pendientes para desglose
  const pendingExpenses = [
    ...expenses.filter(e => e.estado === 'X'),
    ...prevPendingExpenses
  ].sort((a, b) => {
    if (a.isFromPreviousMonth && !b.isFromPreviousMonth) return -1;
    if (!a.isFromPreviousMonth && b.isFromPreviousMonth) return 1;
    return a.dia - b.dia;
  });
  const groupedPendientes = {};
  
  // Initialize with known entities to maintain order
  entities.forEach(ent => { groupedPendientes[ent.name] = []; });
  
  pendingExpenses.forEach(exp => {
    if (!groupedPendientes[exp.entidad]) groupedPendientes[exp.entidad] = [];
    groupedPendientes[exp.entidad].push(exp);
  });

  const activeGroups = Object.entries(groupedPendientes).filter(([_, list]) => list.length > 0);

  return (
    <div className="dashboard">
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <h2 className="card-title">Saldos Totales</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Actual</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem' }}>
            <CurrencyValue value={totalSaldos} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { key: 'caixabank', label: 'CaixaBank' },
              { key: 'ing_nomina', label: 'ING Nómina' },
              { key: 'ing_naranja', label: 'ING Naranja' },
              { key: 'hucha', label: 'Hucha' },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                {editingAccount === key ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input"
                    style={{ width: '120px', padding: '0.15rem 0.5rem', textAlign: 'right' }}
                    value={editValue}
                    autoFocus
                    onChange={e => setEditValue(normalizeDecimalInput(e.target.value))}
                    onBlur={() => { updateBalance(key, parseNum(editValue)); setEditingAccount(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { updateBalance(key, parseNum(editValue)); setEditingAccount(null); } if (e.key === 'Escape') setEditingAccount(null); }}
                  />
                ) : (
                  <span
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    onClick={() => { setEditingAccount(key); setEditValue(formatInputDecimal(balances[key] || 0)); }}
                    title="Editar saldo"
                  >
                    <CurrencyValue value={balances[key] || 0} />
                    <Pencil size={12} style={{ opacity: 0.4 }} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title"><ArrowDownCircle size={24} color="var(--danger)" /> Gastos Pendientes</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Total Pendiente</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--danger)', marginBottom: '1.5rem' }}>
            <CurrencyValue value={totalGastosPendientes} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--info)' }}>CaixaBank Pendiente</span>
              <CurrencyValue value={totalPendienteCaixa} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--warning)' }}>ING Pendiente</span>
              <CurrencyValue value={totalPendienteING} />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Saldo Disponible</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Libre de cargas</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)', marginBottom: '1.5rem' }}>
            <CurrencyValue value={totalDisponible} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Disponible Caixa</span>
              <CurrencyValue value={dispCaixa} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Disponible ING</span>
              <CurrencyValue value={dispING} />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 className="card-title">Próximos Recibos Tarjetas</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tarjeta</th>
                <th>Próx. Recibo</th>
                <th>Pendiente</th>
                <th>Disponible</th>
              </tr>
            </thead>
            <tbody>
              {cards.map(card => (
                <tr key={card.id}>
                  <td style={{ fontWeight: 600 }}>{card.tarjeta}</td>
                  <td><CurrencyValue value={card.cuota} /></td>
                  <td style={{ color: 'var(--danger)' }}><CurrencyValue value={Math.abs(card.pendiente)} /></td>
                  <td><CurrencyValue value={card.disponible} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title"><ArrowDownCircle size={24} color="var(--danger)" /> Desglose Pendientes</h2>
        
        {activeGroups.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No hay gastos pendientes.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`, gap: '2rem' }}>
            {activeGroups.map(([entidadName, lista]) => {
              const entidadColor = entities.find(e => e.name === entidadName)?.color || 'var(--text-main)';
              const totalEntidad = lista.reduce((sum, item) => sum + item.importe, 0);

              return (
                <div key={entidadName} style={{ background: 'var(--bg-main)', borderRadius: '8px', padding: '1rem', border: `1px solid ${entidadColor}30` }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: entidadColor, fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between' }}>
                    {entidadName}
                    <CurrencyValue value={totalEntidad} />
                  </h3>
                  <div className="table-container" style={{ margin: 0 }}>
                    <table style={{ fontSize: '0.875rem' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '40px', padding: '0.5rem' }}>Día</th>
                          <th style={{ padding: '0.5rem' }}>Concepto</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem' }}>Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lista.map(expense => (
                          <tr key={expense.id}>
                            <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                              {expense.isFromPreviousMonth ? `${expense.dia} (Mes Ant.)` : expense.dia}
                            </td>
                            <td style={{ padding: '0.5rem' }}>{expense.concepto}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--danger)', fontWeight: 600 }}>
                              <CurrencyValue value={expense.importe} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
