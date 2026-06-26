import { useState, useEffect, useMemo, useCallback } from 'react';
import Button from '../components/Button';
import appointmentService from '../services/appointmentService';
import clientService from '../services/clientService';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Mapeo de session_type a colores/labels de UI
const TYPE_COLORS = {
  boda: 'bg-[#735c00]',
  retrato: 'bg-blue-500',
  evento: 'bg-purple-500',
  reunion: 'bg-green-500',
  entrega: 'bg-orange-500',
  quinceañera: 'bg-pink-500',
  familia: 'bg-teal-500',
  other: 'bg-gray-400',
};

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  confirmada: { label: 'Confirmada', bg: 'bg-green-50', text: 'text-green-700' },
  en_proceso: { label: 'En proceso', bg: 'bg-blue-50', text: 'text-blue-700' },
  completada: { label: 'Completada', bg: 'bg-gray-100', text: 'text-gray-600' },
  cancelada: { label: 'Cancelada', bg: 'bg-red-50', text: 'text-red-600' },
  perdida: { label: 'Perdida', bg: 'bg-orange-50', text: 'text-orange-700' },
};

function getTypeColor(sessionType) {
  if (!sessionType) return 'bg-gray-400';
  const lc = sessionType.toLowerCase();
  for (const key of Object.keys(TYPE_COLORS)) {
    if (lc.includes(key)) return TYPE_COLORS[key];
  }
  return TYPE_COLORS.other;
}

function buildDays(year, month) {
  const first = new Date(year, month, 1).getDay();
  const daysIn = new Date(year, month + 1, 0).getDate();
  const prev = new Date(year, month, 0).getDate();
  const r = [];
  for (let i = first - 1; i >= 0; i--) r.push({ d: prev - i, cur: false });
  for (let i = 1; i <= daysIn; i++) r.push({ d: i, cur: true });
  const left = 7 - (r.length % 7);
  if (left < 7) for (let i = 1; i <= left; i++) r.push({ d: i, cur: false });
  return r;
}

// ─── Modal de Cita ────────────────────────────────────────────────────────────

function AppointmentModal({ mode, data, clients, defaultDate, defaultTime, onClose, onSaved, onPastDateSuggestion }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.target);
    const payload = {
      client_id: fd.get('client_id'),
      date: fd.get('date'),
      time: fd.get('time'),
      location: fd.get('location')?.trim() || null,
      session_type: fd.get('session_type')?.trim() || null,
      notes: fd.get('notes')?.trim() || null,
    };
    if (mode !== 'create') {
      payload.status = fd.get('status');
    }
    try {
      if (mode === 'create') {
        await appointmentService.create(payload);
      } else {
        await appointmentService.update(data.id, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || '';
      // Si el error es por fecha/hora pasada, activar flujo de sugerencia
      if (errMsg.includes('pasado') || errMsg.includes('ya pasó')) {
        if (onPastDateSuggestion) {
          onPastDateSuggestion(payload);
        }
        // No llamamos onClose() — el padre cierra el modal en handlePastDateSuggestion
        // sin borrar pendingFormData
      } else {
        setError(errMsg || 'Error al guardar la cita');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await appointmentService.delete(data.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar la cita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 max-w-lg w-full shadow-lg animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-headline-md font-semibold text-primary">
            {mode === 'create' ? 'Nueva Cita' : 'Editar Cita'}
          </h4>
          <button type="button" onClick={onClose} className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer">
            close
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente */}
          <div>
            <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">
              Cliente <span className="text-red-400">*</span>
            </label>
            <select
              name="client_id"
              required
              defaultValue={data?.client_id || ''}
              className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b] bg-white"
            >
              <option value="">Selecciona un cliente…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">
                Fecha <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                name="date"
                required
                defaultValue={data?.date || defaultDate || ''}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">
                Hora <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                name="time"
                required
                defaultValue={data?.time?.slice(0, 5) || defaultTime || '09:00'}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]"
              />
            </div>
          </div>

          {/* Tipo y ubicación */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Tipo de sesión</label>
              <input
                name="session_type"
                placeholder="Boda, Retrato, Evento…"
                defaultValue={data?.session_type || ''}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Ubicación</label>
              <input
                name="location"
                placeholder="Estudio, playa…"
                defaultValue={data?.location || ''}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]"
              />
            </div>
          </div>

          {/* Estado (solo en edición) */}
          {mode === 'edit' && (
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Estado</label>
              <select
                name="status"
                defaultValue={data?.status || 'pendiente'}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b] bg-white"
              >
                {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                  <option key={val} value={val}>{cfg.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Notas</label>
            <textarea
              name="notes"
              defaultValue={data?.notes || ''}
              placeholder="Detalles adicionales…"
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b] resize-none"
            />
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E5E5E5]">
            <div>
              {mode === 'edit' && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="h-10 px-4 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Eliminar
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <><span className="material-symbols-outlined animate-spin text-[16px]">sync</span> Guardando…</>
                ) : (
                  <>{mode === 'create' ? 'Crear Cita' : 'Guardar Cambios'}</>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date();
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(null);
  const [searchingSlot, setSearchingSlot] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null, defaultDate: null, defaultTime: null });
  const [suggestions, setSuggestions] = useState(null); // [{ date, time, day }] cuando se busca espacio
  const [pendingFormData, setPendingFormData] = useState(null); // datos parciales de un intento fallido

  const days = buildDays(year, month);
  const isToday = (d, cur) => cur && d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isPast = (d, cur) => {
    if (!cur) return true;
    const date = new Date(year, month, d);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayStart;
  };

  // ─── Carga de datos ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Traer citas del mes actual + clientes (en paralelo)
      const monthStr = String(month + 1).padStart(2, '0');
      const dateFrom = `${year}-${monthStr}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const dateTo = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

      const [apptResult, clientResult] = await Promise.all([
        appointmentService.getAll({ date_from: dateFrom, date_to: dateTo, limit: 200 }),
        clientService.getAll({ limit: 200 }),
      ]);

      setAppointments(apptResult.data || []);
      setClients(clientResult.data || []);
    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError('No se pudo cargar el calendario. Verifica que el servidor esté corriendo.');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  // Convertir fecha de la API a número de día del mes
  const getDay = (dateStr) => {
    if (!dateStr) return null;
    return parseInt(dateStr.split('-')[2]);
  };

  // Citas del día seleccionado
  const selectedAppointments = useMemo(() => {
    if (!selected) return [];
    return appointments.filter((a) => getDay(a.date) === selected);
  }, [appointments, selected]);

  // Citas por día (para el calendario)
  const appointmentsByDay = useMemo(() => {
    const map = {};
    for (const a of appointments) {
      const d = getDay(a.date);
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(a);
      }
    }
    return map;
  }, [appointments]);

  // ─── Navigation ──────────────────────────────────────────────────────────

  const nav = (dir) => {
    const m = month + dir;
    if (m < 0) { setMonth(11); setYear((y) => y - 1); }
    else if (m > 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth(m);
    setSelected(null);
  };

  // ─── Modal helpers ────────────────────────────────────────────────────────

  const openCreate = (day) => {
    const d = day || selected || today.getDate();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (isPast(d, true)) return;
    setModal({ open: true, mode: 'create', data: null, defaultDate: dateStr, defaultTime: null });
  };

  // Buscar espacios disponibles
  const handleSearchSlot = async () => {
    setSearchingSlot(true);
    try {
      const res = await appointmentService.getNextAvailable();
      setSuggestions(res.slots || []);
    } catch (err) {
      alert(err.response?.data?.error || 'No se encontró espacio disponible');
    } finally {
      setSearchingSlot(false);
    }
  };

  // Usar una sugerencia: abre el modal con la fecha/hora seleccionada
  const acceptSuggestion = (slot) => {
    if (!slot) return;
    const preserved = pendingFormData ? { ...pendingFormData } : null;
    if (preserved) {
      delete preserved.date;
      delete preserved.time;
    }
    setModal({
      open: true,
      mode: 'create',
      data: preserved,
      defaultDate: slot.date,
      defaultTime: slot.time,
    });
    setSuggestions(null);
    setPendingFormData(null);
  };

  // Cuando el modal detecta fecha pasada, guarda los datos y muestra sugerencias
  const handlePastDateSuggestion = async (formData) => {
    setPendingFormData(formData);
    setModal({ open: false, mode: 'create', data: null, defaultDate: null, defaultTime: null });
    try {
      const res = await appointmentService.getNextAvailable(formData.date || undefined);
      setSuggestions(res.slots || []);
    } catch (err) {
      alert('No se encontró espacio disponible');
    }
  };

  const openEdit = (appt) => {
    setModal({ open: true, mode: 'edit', data: appt, defaultDate: null });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">calendar_today</span>
          <h2 className="text-headline-md font-bold text-primary tracking-tight">Calendario</h2>
          <span className="text-body-md text-on-surface-variant ml-1">· {appointments.length} citas</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSearchSlot} disabled={searchingSlot}>
            <span className="material-symbols-outlined text-[16px]">
              {searchingSlot ? 'sync' : 'find_in_page'}
            </span>
            {searchingSlot ? 'Buscando…' : 'Buscar espacio'}
          </Button>
          <Button onClick={() => openCreate(selected || today.getDate())}>
            <span className="material-symbols-outlined text-[16px]">add</span>
            Nueva cita
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
          <button onClick={() => setError('')} className="ml-auto cursor-pointer text-red-400 hover:text-red-600">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Loading inline (siempre ocupa espacio, no desplaza) */}
      <div className={`flex items-center gap-2 py-2 mb-1 text-xs text-on-surface-variant transition-opacity ${loading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <span className={`material-symbols-outlined text-[14px] ${loading ? 'animate-spin' : ''}`}>sync</span>
        Cargando citas…
      </div>

      {/* Grid */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Calendar grid */}
        <div className="flex-1 bg-white rounded-xl border border-[#E5E5E5] overflow-hidden flex flex-col min-h-0">
          {/* Navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5] shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => nav(-1)} className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer p-1">chevron_left</button>
              <h3 className="text-headline-md font-semibold text-primary min-w-[180px] text-center">{MONTHS[month]} {year}</h3>
              <button onClick={() => nav(1)} className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer p-1">chevron_right</button>
            </div>
            <button
              onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); setSelected(null); }}
              className="text-xs font-semibold text-[#735c00] bg-[#fed65b]/20 hover:bg-[#fed65b]/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Hoy
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[#E5E5E5] shrink-0">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-on-surface-variant py-2 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 flex-1 auto-rows-fr">
            {days.map((cell, i) => {
              const dayAppts = cell.cur ? (appointmentsByDay[cell.d] || []) : [];
              const isSelected = cell.cur && selected === cell.d;
              return (
                <div
                  key={i}
                  onClick={() => cell.cur && setSelected(cell.d)}
                  className={`relative border-b border-r border-[#E5E5E5] p-1.5 text-left transition-all cursor-pointer
                    ${!cell.cur ? 'text-on-surface-variant/30 bg-[#fafafa]' : 'hover:bg-[#f9f9f9]'}
                    ${isSelected ? 'bg-[#fed65b]/10 ring-2 ring-inset ring-[#735c00]' : ''}`}
                >
                  <div className="flex items-center justify-between mb-0.5" onClick={(e) => e.stopPropagation()}>
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                      ${isToday(cell.d, cell.cur) ? 'bg-[#735c00] text-white font-bold' : ''}
                      ${!cell.cur ? 'text-on-surface-variant/30' : 'text-primary'}
                      ${isSelected && !isToday(cell.d, cell.cur) ? 'bg-[#735c00]/10' : ''}`}
                    >
                      {cell.d}
                    </span>
                    {cell.cur && !isPast(cell.d, true) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openCreate(cell.d); }}
                        className="material-symbols-outlined text-[12px] text-on-surface-variant/40 hover:text-[#735c00] hover:opacity-100 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        add_circle
                      </button>
                    )}
                  </div>
                  {dayAppts.length > 0 && (
                    <div className="mt-0.5 space-y-0.5">
                      {dayAppts.slice(0, 2).map((appt) => (
                        <button
                          key={appt.id}
                          onClick={(e) => { e.stopPropagation(); openEdit(appt); }}
                          className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${getTypeColor(appt.session_type)} text-white hover:opacity-80 transition-opacity cursor-pointer block`}
                        >
                          {(appt.title || appt.client_name || appt.session_type || 'Cita').slice(0, 14)}
                        </button>
                      ))}
                      {dayAppts.length > 2 && (
                        <div className="text-[10px] text-on-surface-variant pl-1">+{dayAppts.length - 2}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="lg:w-72 xl:w-80 bg-white rounded-xl border border-[#E5E5E5] flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-[#E5E5E5] shrink-0 flex items-center justify-between">
            <div>
              <h4 className="text-label-md font-semibold text-primary">
                {selected ? `${selected} de ${MONTHS[month]}` : 'Selecciona un día'}
              </h4>
              <p className="text-body-md text-on-surface-variant">
                {selectedAppointments.length > 0
                  ? `${selectedAppointments.length} cita${selectedAppointments.length !== 1 ? 's' : ''}`
                  : selected ? 'Sin citas' : 'Haz clic en una fecha'}
              </p>
            </div>
            {selected && !isPast(selected, true) && (
              <button
                onClick={() => openCreate(selected)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-[#735c00] hover:bg-[#fed65b]/20 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {selectedAppointments.length > 0 ? (
              selectedAppointments.map((appt) => {
                const statusCfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pendiente;
                return (
                  <button
                    key={appt.id}
                    onClick={() => openEdit(appt)}
                    className="group w-full text-left p-3 rounded-xl border border-[#E5E5E5] bg-white hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${getTypeColor(appt.session_type)}`} />
                        <span className="text-xs font-semibold text-primary truncate">
                          {appt.client_name || 'Cliente'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusCfg.bg} ${statusCfg.text}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="space-y-0.5 mt-1.5 text-[11px] text-on-surface-variant">
                      {appt.time && (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          {appt.time?.slice(0, 5)}
                        </div>
                      )}
                      {appt.session_type && (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">camera_alt</span>
                          {appt.session_type}
                        </div>
                      )}
                      {appt.location && (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">location_on</span>
                          {appt.location}
                        </div>
                      )}
                      {appt.notes && (
                        <div className="flex items-start gap-1 mt-1">
                          <span className="material-symbols-outlined text-[12px] mt-0.5">notes</span>
                          <span className="text-on-surface-variant/70 line-clamp-2">{appt.notes}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-10">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/50 mb-2">event_busy</span>
                <p className="text-sm text-on-surface-variant">
                  {selected ? 'No hay citas este día' : 'Selecciona una fecha'}
                </p>
                {selected && !isPast(selected, true) && (
                  <button
                    onClick={() => openCreate(selected)}
                    className="mt-3 text-xs font-semibold text-[#735c00] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    Agregar cita
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Estado vacío total */}
          {!loading && appointments.length === 0 && (
            <div className="px-4 py-3 border-t border-[#E5E5E5] text-center">
              <p className="text-[11px] text-on-surface-variant mb-2">No hay citas este mes</p>
              <Button onClick={() => openCreate(today.getDate())}>
                <span className="material-symbols-outlined text-[14px]">add</span>
                Crear primera cita
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Selector de espacios disponibles */}
      {suggestions && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 max-w-lg w-full shadow-lg animate-in zoom-in-95 duration-150 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-600">event</span>
                </div>
                <div>
                  <h4 className="font-semibold text-primary text-lg">Espacios disponibles</h4>
                  <p className="text-body-md text-on-surface-variant text-xs">
                    {pendingFormData ? 'La fecha elegida ya pasó. ' : ''}Selecciona un horario:
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setSuggestions(null); setPendingFormData(null); }}
                className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer"
              >close</button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
              {suggestions.map((slot, i) => {
                const dateObj = new Date(slot.date + 'T00:00:00');
                const formattedDate = dateObj.toLocaleDateString('es', { day: 'numeric', month: 'long' });
                return (
                  <button
                    key={i}
                    onClick={() => acceptSuggestion(slot)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl border border-[#E5E5E5] hover:border-[#D4AF37] hover:bg-[#fed65b]/5 transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#fed65b]/20 text-[#735c00] shrink-0">
                      <span className="text-lg font-bold text-center leading-tight">
                        {slot.time?.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">{slot.day}</span>
                        <span className="text-xs text-on-surface-variant">{formattedDate}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant/70 mt-0.5">{slot.date}</p>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-[#735c00] transition-colors text-[18px]">add_circle</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[#E5E5E5] shrink-0">
              <button
                onClick={() => { setSuggestions(null); setPendingFormData(null); }}
                className="h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm font-medium text-on-surface-variant hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.open && (
        <AppointmentModal
          mode={modal.mode}
          data={modal.data}
          clients={clients}
          defaultDate={modal.defaultDate}
          defaultTime={modal.defaultTime}
          onClose={() => { setModal({ open: false, mode: 'create', data: null, defaultDate: null, defaultTime: null }); setPendingFormData(null); }}
          onSaved={loadData}
          onPastDateSuggestion={handlePastDateSuggestion}
        />
      )}
    </div>
  );
}
