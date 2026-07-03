import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, Calendar, CheckSquare, Square, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import Modal from './ui/Modal';


export default function RemindersView() {
  const { reminders, addReminder, updateReminder, deleteReminder } = useStore();
  
  // Form states
  const [texto, setTexto] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Confirmation State
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  
  // Filter state
  const [filter, setFilter] = useState('pending'); // 'pending' | 'completed' | 'all'

  const todayStr = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!texto.trim()) return;

    setSubmitting(true);
    const { error } = await addReminder({
      texto: texto.trim(),
      fecha_limite: fechaLimite ? fechaLimite : null,
      completado: false
    });
    setSubmitting(false);

    if (!error) {
      toast.success('Recordatorio añadido');
      setTexto('');
      setFechaLimite('');
    } else {
      toast.error('Error al añadir: ' + error.message);
    }
  };

  const handleToggleComplete = async (reminder) => {
    const nextStatus = !reminder.completado;
    const { error } = await updateReminder(reminder.id, { completado: nextStatus });
    if (!error) {
      if (nextStatus) {
        toast.success('¡Recordatorio completado!');
      }
    } else {
      toast.error('Error al actualizar: ' + error.message);
    }
  };

  const handleDelete = (id) => {
    const reminder = reminders.find(r => r.id === id);
    setConfirmState({
      isOpen: true,
      title: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar el recordatorio "${reminder?.texto || ''}"?`,
      onConfirm: async () => {
        const { error } = await deleteReminder(id);
        if (!error) {
          toast.success('Recordatorio eliminado');
        } else {
          toast.error('Error al eliminar: ' + error.message);
        }
      }
    });
  };


  // Filter reminders
  const filteredReminders = reminders.filter(r => {
    if (filter === 'pending') return !r.completado;
    if (filter === 'completed') return r.completado;
    return true;
  });

  const getDueDateStatus = (reminder) => {
    if (reminder.completado || !reminder.fecha_limite) return 'none';
    if (reminder.fecha_limite < todayStr) return 'overdue';
    if (reminder.fecha_limite === todayStr) return 'today';
    return 'future';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="reminders-view" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <div className="grid-2">
        {/* Left Side: Create Reminder */}
        <div className="card">
          <h2 className="card-title">
            <CheckCircle size={20} color="var(--primary)" />
            <span>Nuevo Recordatorio</span>
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>¿Qué quieres recordar?</label>
              <textarea
                className="input"
                style={{ width: '100%', minHeight: '80px', resize: 'vertical', padding: '0.75rem' }}
                placeholder="Ej. Hacer transferencia a Ricardo por el alquiler..."
                value={texto}
                onChange={e => setTexto(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Fecha límite (Opcional)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  className="input"
                  value={fechaLimite}
                  onChange={e => setFechaLimite(e.target.value)}
                  disabled={submitting}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} disabled={submitting}>
              <Plus size={18} />
              <span>{submitting ? 'Añadiendo...' : 'Añadir Recordatorio'}</span>
            </button>
          </form>
        </div>

        {/* Right Side: List and Filters */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Mis Recordatorios</h2>
            <div className="nav-tabs" style={{ padding: '0.25rem', borderRadius: '8px' }}>
              <button 
                className={filter === 'pending' ? 'active' : ''} 
                onClick={() => setFilter('pending')}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Pendientes ({reminders.filter(r => !r.completado).length})
              </button>
              <button 
                className={filter === 'completed' ? 'active' : ''} 
                onClick={() => setFilter('completed')}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Completados ({reminders.filter(r => r.completado).length})
              </button>
              <button 
                className={filter === 'all' ? 'active' : ''} 
                onClick={() => setFilter('all')}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Todos
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '450px', paddingRight: '0.25rem' }}>
            {filteredReminders.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                <CheckSquare size={36} style={{ strokeWidth: 1.5, marginBottom: '0.75rem', opacity: 0.5 }} />
                <p style={{ fontSize: '0.9rem' }}>No hay recordatorios en esta lista.</p>
              </div>
            ) : (
              filteredReminders.map(reminder => {
                const status = getDueDateStatus(reminder);
                const isOverdue = status === 'overdue';
                const isDueToday = status === 'today';

                let borderStyle = '1px solid var(--border)';
                let backgroundStyle = 'var(--bg-main)';
                let dateBadgeBg = 'var(--bg-card)';
                let dateBadgeColor = 'var(--text-muted)';
                let dateIcon = <Calendar size={13} />;

                if (isOverdue) {
                  borderStyle = '1px solid rgba(239, 68, 68, 0.3)';
                  backgroundStyle = 'rgba(239, 68, 68, 0.03)';
                  dateBadgeBg = 'rgba(239, 68, 68, 0.1)';
                  dateBadgeColor = 'var(--danger)';
                  dateIcon = <AlertCircle size={13} />;
                } else if (isDueToday) {
                  borderStyle = '1px solid rgba(245, 158, 11, 0.3)';
                  backgroundStyle = 'rgba(245, 158, 11, 0.03)';
                  dateBadgeBg = 'rgba(245, 158, 11, 0.1)';
                  dateBadgeColor = 'var(--warning)';
                  dateIcon = <Clock size={13} />;
                } else if (reminder.completado) {
                  backgroundStyle = 'rgba(16, 185, 129, 0.01)';
                }

                return (
                  <div
                    key={reminder.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      background: backgroundStyle,
                      border: borderStyle,
                      transition: 'all 0.2s ease',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {/* Completion Checkbox */}
                    <button
                      onClick={() => handleToggleComplete(reminder)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: reminder.completado ? 'var(--success)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.1s ease',
                      }}
                      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
                      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                      title={reminder.completado ? 'Marcar como pendiente' : 'Marcar como completado'}
                    >
                      {reminder.completado ? (
                        <CheckSquare size={20} style={{ fill: 'rgba(16, 185, 129, 0.1)' }} />
                      ) : (
                        <Square size={20} />
                      )}
                    </button>

                    {/* Task Content */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
                      <span style={{
                        fontSize: '0.925rem',
                        color: reminder.completado ? 'var(--text-muted)' : 'var(--text-main)',
                        textDecoration: reminder.completado ? 'line-through' : 'none',
                        wordBreak: 'break-word',
                        fontWeight: reminder.completado ? 'normal' : '500',
                        lineHeight: 1.3
                      }}>
                        {reminder.texto}
                      </span>

                      {/* Due Date Indicator */}
                      {reminder.fecha_limite && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: dateBadgeBg,
                            color: dateBadgeColor,
                            transition: 'all 0.2s'
                          }}>
                            {dateIcon}
                            <span>
                              {isOverdue ? 'Vencido: ' : isDueToday ? 'Vence hoy: ' : 'Vence: '}
                              {formatDate(reminder.fecha_limite)}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Delete Action */}
                    <button
                      className="btn"
                      onClick={() => handleDelete(reminder.id)}
                      style={{
                        padding: '0.35rem',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      title="Eliminar recordatorio"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {/* Modal Confirmación Genérico */}
      <Modal 
        isOpen={confirmState.isOpen} 
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} 
        title={confirmState.title || 'Confirmar Acción'}
      >
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>{confirmState.message}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={() => {
            confirmState.onConfirm();
            setConfirmState(prev => ({ ...prev, isOpen: false }));
          }}>
            Confirmar
          </button>
        </div>
      </Modal>

    </div>
  );
}

