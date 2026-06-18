import { useState, useMemo } from 'react';
import Button from '../components/Button';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const TYPES = ['boda', 'retrato', 'evento', 'reunion', 'entrega'];
const TYPE_LABELS = { boda: 'Boda', retrato: 'Retrato', evento: 'Evento', reunion: 'Reunión', entrega: 'Entrega' };
const TYPE_COLORS = { boda: 'bg-[#735c00]', retrato: 'bg-blue-500', evento: 'bg-purple-500', reunion: 'bg-green-500', entrega: 'bg-orange-500' };

const DEMO_EVENTS = [
  { id: 1, date: 2, title: 'Boda María & Carlos', type: 'boda', time: '10:00', location: 'Playa Bonita', notes: '' },
  { id: 2, date: 5, title: 'Sesión Retratos — Vance', type: 'retrato', time: '15:00', location: 'Estudio', notes: '' },
  { id: 3, date: 10, title: 'Graduación UASD', type: 'evento', time: '09:00', location: 'Campus UASD', notes: '' },
  { id: 4, date: 10, title: 'Revisión de cartera', type: 'reunion', time: '14:00', location: 'Oficina', notes: '' },
  { id: 5, date: 15, title: 'Entrega de álbum — Gómez', type: 'entrega', time: '16:00', location: 'Estudio', notes: '' },
  { id: 6, date: 18, title: 'Llamada con cliente nuevo', type: 'reunion', time: '10:00', location: 'Virtual', notes: '' },
  { id: 7, date: 20, title: 'Sesión Family — Torres', type: 'retrato', time: '14:30', location: 'Parque Central', notes: '' },
  { id: 8, date: 22, title: 'TechConf — Cobertura', type: 'evento', time: '08:00', location: 'Centro de Convenciones', notes: '' },
  { id: 9, date: 28, title: 'Shoot Publicitario — Marca X', type: 'evento', time: '07:00', location: 'Locación externa', notes: '' },
];

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

export default function CalendarPage() {
  const today = new Date();
  const [events, setEvents] = useState([]);
  const [daysOff, setDaysOff] = useState([]);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDayOffModal, setShowDayOffModal] = useState(false);
  const [showNextSlot, setShowNextSlot] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [removingEvents, setRemovingEvents] = useState(new Set());

  // Form state
  const emptyForm = { title: '', date: '', time: '09:00', location: '', type: 'boda', notes: '' };
  const [form, setForm] = useState({ ...emptyForm });

  const days = buildDays(year, month);
  const isToday = (d, cur) => cur && d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const selectedEvents = selected ? events.filter((e) => e.date === selected) : [];

  // Next available slot
  const nextAvailable = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = today.getDate(); d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (daysOff.includes(dateStr)) continue;
      if (!events.some((e) => e.date === d)) {
        return { day: d, month, year, label: `${d} de ${MONTHS[month]}` };
      }
      // Check if there's a free hour slot
      const takenHours = events.filter((e) => e.date === d).map((e) => parseInt(e.time.split(':')[0]));
      for (let h = 8; h <= 17; h++) {
        if (!takenHours.includes(h)) return { day: d, month, year, label: `${d} de ${MONTHS[month]} a las ${String(h).padStart(2, '0')}:00`, hour: h };
      }
    }
    return null;
  }, [events, daysOff, month, year]);

  const loadDemo = () => { setEvents(DEMO_EVENTS.map((e) => ({ ...e, id: Date.now() + Math.random() }))); };
  const clear = () => { setEvents([]); setDaysOff([]); setSelected(null); };
  const nav = (dir) => {
    const m = month + dir;
    if (m < 0) { setMonth(11); setYear((y) => y - 1); }
    else if (m > 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth(m);
    setSelected(null);
  };

  const openNewEvent = (prefillDate) => {
    const day = prefillDate || selected || today.getDate();
    setForm({ ...emptyForm, date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` });
    setEditingEvent(null);
    setShowNewModal(true);
  };

  const openEditEvent = (evt) => {
    setForm({
      title: evt.title,
      date: `${year}-${String(month + 1).padStart(2, '0')}-${String(evt.date).padStart(2, '0')}`,
      time: evt.time,
      location: evt.location || '',
      type: evt.type,
      notes: evt.notes || '',
    });
    setEditingEvent(evt);
    setShowNewModal(true);
  };

  const saveEvent = () => {
    if (!form.title.trim()) return;
    const dateParts = form.date.split('-');
    const day = parseInt(dateParts[2]);
    if (editingEvent) {
      setEvents((prev) => prev.map((e) => e.id === editingEvent.id ? { ...e, title: form.title, date: day, time: form.time, location: form.location, type: form.type, notes: form.notes } : e));
    } else {
      setEvents((prev) => [...prev, { id: Date.now(), title: form.title, date: day, time: form.time, location: form.location, type: form.type, notes: form.notes }]);
    }
    setShowNewModal(false);
    setEditingEvent(null);
  };

  const deleteEvent = (id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const toggleDayOff = (d) => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    setDaysOff((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]);
  };

  const toggleRemoving = (id) => {
    setRemovingEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ---------- Empty state ----------
  if (events.length === 0 && !showNewModal && !showDayOffModal) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-full overflow-y-auto">
        <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-4 border border-[#E5E5E5]">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant">calendar_today</span>
        </div>
        <h3 className="text-headline-md font-semibold text-primary mb-1">Sin eventos programados</h3>
        <p className="text-body-md text-on-surface-variant max-w-sm mb-6">
          Tu calendario está limpio. Cuando agendes shoots, entregas o reuniones, aparecerán aquí.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => openNewEvent(today.getDate())}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nuevo evento
          </Button>
          <Button variant="secondary" onClick={loadDemo}>
            <span className="material-symbols-outlined text-[18px]">preview</span>
            Cargar demo
          </Button>
        </div>
      </div>
    );
  }

  // ---------- Days off modal ----------
  if (showDayOffModal) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-md font-bold text-primary tracking-tight">Días libres — {MONTHS[month]}</h2>
            <Button variant="secondary" onClick={() => setShowDayOffModal(false)}>
              <span className="material-symbols-outlined text-[16px]">close</span>
              Cerrar
            </Button>
          </div>
          <p className="text-body-md text-on-surface-variant mb-4">
            Marca los días en los que no recibes reservas. Los días libres se mostrarán tachados en el calendario.
          </p>
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-4">
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-on-surface-variant py-1 uppercase">{d}</div>
              ))}
              {buildDays(year, month).filter((d) => d.cur).map((cell, i) => {
                const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(cell.d).padStart(2, '0')}`;
                const isOff = daysOff.includes(key);
                return (
                  <button key={i} onClick={() => toggleDayOff(cell.d)}
                    className={`p-2 rounded-lg text-sm font-medium transition-all cursor-pointer
                      ${isOff ? 'bg-red-100 text-red-600 line-through' : 'hover:bg-[#f5f5f5] text-primary'}
                      ${isToday(cell.d, true) ? 'ring-2 ring-[#735c00]' : ''}`}>
                    {cell.d}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-on-surface-variant">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
              <span>Día sin reservas ({daysOff.length})</span>
            </div>
            <Button onClick={() => setShowDayOffModal(false)}>Listo</Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- New / Edit Event modal ----------
  if (showNewModal) {
    const title = editingEvent ? 'Editar evento' : 'Nuevo evento';
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-md font-bold text-primary tracking-tight">{title}</h2>
            <Button variant="secondary" onClick={() => { setShowNewModal(false); setEditingEvent(null); }}>
              <span className="material-symbols-outlined text-[16px]">close</span>
              Cancelar
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 space-y-4">
            {/* Título */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Título del evento</label>
              <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Boda Pérez & García" className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]" autoFocus />
            </div>
            {/* Fecha y hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Fecha</label>
                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Hora</label>
                <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]" />
              </div>
            </div>
            {/* Tipo y ubicación */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Tipo</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]">
                  {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Ubicación</label>
                <input type="text" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Estudio, playa, etc." className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]" />
              </div>
            </div>
            {/* Notas */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Notas</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Detalles adicionales…" rows={3} className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b] resize-none" />
            </div>
            {/* Acciones */}
            <div className="flex justify-end gap-2 pt-2">
              {editingEvent && (
                <Button variant="danger" onClick={() => { deleteEvent(editingEvent.id); setShowNewModal(false); setEditingEvent(null); }}>
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Eliminar
                </Button>
              )}
              <Button onClick={saveEvent} disabled={!form.title.trim()}>
                <span className="material-symbols-outlined text-[16px]">{editingEvent ? 'save' : 'add'}</span>
                {editingEvent ? 'Guardar cambios' : 'Crear evento'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Next available slot panel ----------
  if (showNextSlot) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-md font-bold text-primary tracking-tight">Buscar espacio disponible</h2>
            <Button variant="secondary" onClick={() => setShowNextSlot(false)}>
              <span className="material-symbols-outlined text-[16px]">close</span>
              Cerrar
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 space-y-4">
            {nextAvailable ? (
              <>
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-green-600">event_available</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">Espacio disponible</p>
                    <p className="text-[13px] text-green-700">{nextAvailable.label}{nextAvailable.hour && ''}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => { openNewEvent(nextAvailable.day); setShowNextSlot(false); }}>
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Agendar aquí
                  </Button>
                  <Button variant="secondary" onClick={() => setShowNextSlot(false)}>Cerrar</Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/50 mb-2">calendar_view_month</span>
                <p className="text-sm text-on-surface-variant">No se encontraron espacios disponibles en lo que resta del mes.</p>
              </div>
            )}
            <div className="text-[11px] text-on-surface-variant pt-2 border-t border-[#E5E5E5]">
              Busca el próximo día sin eventos que no esté marcado como día libre.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Main view ----------
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">calendar_today</span>
          <h2 className="text-headline-md font-bold text-primary tracking-tight">Calendario</h2>
          <span className="text-body-md text-on-surface-variant ml-1">· {events.length} eventos</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => openNewEvent(selected || today.getDate())}>
            <span className="material-symbols-outlined text-[16px]">add</span>
            Nuevo
          </Button>
          <button onClick={() => setShowNextSlot(true)}
            className="h-9 px-3 rounded-xl border border-[#E5E5E5] bg-white text-xs font-semibold text-primary hover:bg-[#f9f9f9] transition-all flex items-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">explore</span>
            Buscar espacio
          </button>
          <button onClick={() => setShowDayOffModal(true)}
            className="h-9 px-3 rounded-xl border border-[#E5E5E5] bg-white text-xs font-semibold text-primary hover:bg-[#f9f9f9] transition-all flex items-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">block</span>
            Días libres
          </button>
          <Button variant="secondary" onClick={clear}>
            <span className="material-symbols-outlined text-[16px]">event_busy</span>
            Vacío
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex flex-col lg:flex-row gap-ds-md flex-1 min-h-0">
        {/* Calendar grid */}
        <div className="flex-1 bg-white rounded-xl border border-[#E5E5E5] overflow-hidden flex flex-col min-h-0">
          {/* Navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5] shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => nav(-1)} className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer p-1">chevron_left</button>
              <h3 className="text-headline-md font-semibold text-primary min-w-[180px] text-center">{MONTHS[month]} {year}</h3>
              <button onClick={() => nav(1)} className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer p-1">chevron_right</button>
            </div>
            <button onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); setSelected(null); }}
              className="text-xs font-semibold text-[#735c00] bg-[#fed65b]/20 hover:bg-[#fed65b]/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer">Hoy</button>
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
              const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(cell.d).padStart(2, '0')}`;
              const isOff = cell.cur && daysOff.includes(key);
              const dayEvents = cell.cur ? events.filter((e) => e.date === cell.d) : [];
              const isSelected = cell.cur && selected === cell.d;
              return (
                <div key={i} onClick={() => cell.cur && setSelected(cell.d)}
                  className={`relative border-b border-r border-[#E5E5E5] p-1.5 text-left transition-all cursor-pointer
                    ${!cell.cur ? 'text-on-surface-variant/30 bg-[#fafafa]' : 'hover:bg-[#f9f9f9]'}
                    ${isSelected ? 'bg-[#fed65b]/10 ring-2 ring-inset ring-[#735c00]' : ''}
                    ${isOff ? 'bg-red-50/70' : ''}`}>
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-0.5" onClick={(e) => e.stopPropagation()}>
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                      ${isToday(cell.d, cell.cur) ? 'bg-[#735c00] text-white font-bold' : ''}
                      ${!cell.cur ? 'text-on-surface-variant/30' : isOff ? 'text-red-400 line-through' : 'text-primary'}
                      ${isSelected && !isToday(cell.d, cell.cur) ? 'bg-[#735c00]/10' : ''}`}>
                      {cell.d}
                    </span>
                    {cell.cur && (
                      <button onClick={(e) => { e.stopPropagation(); openNewEvent(cell.d); }}
                        className="material-symbols-outlined text-[12px] text-on-surface-variant/40 hover:text-[#735c00] opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all cursor-pointer">add_circle</button>
                    )}
                  </div>
                  {isOff && <div className="text-[9px] text-red-400 font-medium mt-0.5">Libre</div>}
                  {dayEvents.length > 0 && (
                    <div className="mt-0.5 space-y-0.5">
                      {dayEvents.slice(0, 2).map((evt) => (
                        <button key={evt.id} onClick={(e) => { e.stopPropagation(); openEditEvent(evt); }}
                          className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${TYPE_COLORS[evt.type] || 'bg-gray-200'} text-white hover:opacity-80 transition-opacity cursor-pointer block border-l-[3px] border-[#00000030] shadow-[0_1px_2px_rgba(0,0,0,0.08)]`}>
                          {evt.title.length > 14 ? evt.title.slice(0, 12) + '…' : evt.title}
                        </button>
                      ))}
                      {dayEvents.length > 2 && <div className="text-[10px] text-on-surface-variant pl-1">+{dayEvents.length - 2}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel - events for selected day */}
        <div className="lg:w-72 xl:w-80 bg-white rounded-xl border border-[#E5E5E5] flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-[#E5E5E5] shrink-0 flex items-center justify-between">
            <div>
              <h4 className="text-label-md font-semibold text-primary">
                {selected ? `${selected} de ${MONTHS[month]}` : 'Selecciona un día'}
              </h4>
              <p className="text-body-md text-on-surface-variant">
                {selectedEvents.length > 0 ? `${selectedEvents.length} evento${selectedEvents.length !== 1 ? 's' : ''}` : selected ? 'Sin eventos' : 'Haz clic en una fecha'}
              </p>
            </div>
            {selected && (
              <button onClick={() => openNewEvent(selected)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-[#735c00] hover:bg-[#fed65b]/20 transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {selectedEvents.length > 0 ? (
              selectedEvents.map((evt) => (
                <div key={evt.id} className="group p-3 rounded-xl border border-[#E5E5E5] bg-white hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${TYPE_COLORS[evt.type] || 'bg-gray-300'}`} />
                      <span className="text-xs font-semibold text-primary truncate">{evt.title}</span>
                    </div>
                    <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditEvent(evt)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-[#735c00] hover:bg-[#fed65b]/20 transition-all cursor-pointer">
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                      <button onClick={() => deleteEvent(evt.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer">
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-0.5 mt-1.5 text-[11px] text-on-surface-variant">
                    {evt.time && <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">schedule</span>{evt.time}</div>}
                    {evt.location && <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">location_on</span>{evt.location}</div>}
                    {evt.notes && <div className="flex items-start gap-1 mt-1"><span className="material-symbols-outlined text-[12px] mt-0.5">notes</span><span className="text-on-surface-variant/70">{evt.notes}</span></div>}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-10">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/50 mb-2">event_busy</span>
                <p className="text-sm text-on-surface-variant">{selected ? 'No hay eventos este día' : 'Selecciona una fecha'}</p>
                {selected && (
                  <button onClick={() => openNewEvent(selected)}
                    className="mt-3 text-xs font-semibold text-[#735c00] hover:underline cursor-pointer flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    Agregar evento
                  </button>
                )}
              </div>
            )}
          </div>
          {/* Legend + bulk actions */}
          <div className="px-4 py-3 border-t border-[#E5E5E5] shrink-0 space-y-2">
            <div>
              <p className="text-[10px] font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Tipos</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${TYPE_COLORS[k]}`} />
                    <span className="text-[10px] text-on-surface-variant">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {daysOff.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-red-500 font-medium">
                <span className="material-symbols-outlined text-[12px]">block</span>
                {daysOff.length} día{daysOff.length !== 1 ? 's' : ''} sin reservas este mes
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
