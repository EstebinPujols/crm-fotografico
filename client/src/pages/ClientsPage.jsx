import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import clientService from '../services/clientService';

// ─── Modal de crear/editar cliente ───────────────────────────────────────────

function ClientModal({ mode, data, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.target);
    const payload = {
      first_name: fd.get('first_name')?.trim(),
      last_name: fd.get('last_name')?.trim(),
      phone: fd.get('phone')?.trim() || null,
      email: fd.get('email')?.trim() || null,
      address: fd.get('address')?.trim() || null,
      notes: fd.get('notes')?.trim() || null,
    };
    try {
      if (mode === 'create') {
        await clientService.create(payload);
      } else {
        await clientService.update(data.id, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 max-w-lg w-full shadow-lg animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-headline-md font-semibold text-primary">
            {mode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente'}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer"
          >
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">
                Nombre <span className="text-red-400">*</span>
              </label>
              <input
                name="first_name"
                required
                defaultValue={data?.first_name || ''}
                placeholder="María"
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">
                Apellido <span className="text-red-400">*</span>
              </label>
              <input
                name="last_name"
                required
                defaultValue={data?.last_name || ''}
                placeholder="Gómez"
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">
                Teléfono
              </label>
              <input
                name="phone"
                defaultValue={data?.phone || ''}
                placeholder="809-555-0101"
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">
                Email
              </label>
              <input
                name="email"
                type="email"
                defaultValue={data?.email || ''}
                placeholder="cliente@email.com"
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">
              Dirección
            </label>
            <input
              name="address"
              defaultValue={data?.address || ''}
              placeholder="Av. 27 de Febrero #123, Santo Domingo"
              className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">
              Notas
            </label>
            <textarea
              name="notes"
              defaultValue={data?.notes || ''}
              placeholder="Notas internas sobre el cliente…"
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                  Guardando…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">
                    {mode === 'create' ? 'add' : 'save'}
                  </span>
                  {mode === 'create' ? 'Crear Cliente' : 'Guardar Cambios'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  // Modal state
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const navigate = useNavigate();

  // ─── Carga de datos ───────────────────────────────────────────────────────

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await clientService.getAll({
        search: search || undefined,
        page: pagination.page,
        limit: 50,
      });
      setClients(result.data || []);
      setPagination({
        total: result.pagination?.total || 0,
        page: result.pagination?.page || 1,
        totalPages: result.pagination?.totalPages || 1,
      });
    } catch (err) {
      console.error('Error loading clients:', err);
      setError('No se pudieron cargar los clientes. Verifica que el servidor esté corriendo.');
    } finally {
      setLoading(false);
    }
  }, [search, pagination.page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadClients();
    }, search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [loadClients, search]);

  // ─── Filtro local por status ──────────────────────────────────────────────
  const filtered = clients.filter(
    (c) => filter === 'all' || (filter === 'active' ? (c.project_count || 0) > 0 : (c.project_count || 0) === 0)
  );

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await clientService.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      setSelected(null);
      await loadClients();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar el cliente');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading && clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-full">
        <span className="material-symbols-outlined animate-spin text-3xl text-on-surface-variant mb-3">sync</span>
        <p className="text-sm text-on-surface-variant">Cargando clientes…</p>
      </div>
    );
  }

  if (!loading && clients.length === 0 && !search) {
    return (
      <>
        <div className="flex flex-col items-center justify-center text-center h-full overflow-y-auto">
          <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-4 border border-[#E5E5E5]">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">groups</span>
          </div>
          <h3 className="text-headline-md font-semibold text-primary mb-1">Sin clientes registrados</h3>
          <p className="text-body-md text-on-surface-variant max-w-sm mb-6">
            {error || 'Aún no has agregado clientes. Aquí aparecerán todos tus contactos con su historial de proyectos.'}
          </p>
          <Button onClick={() => setModal({ open: true, mode: 'create', data: null })}>
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Agregar primer cliente
          </Button>
        </div>
        {modal.open && (
          <ClientModal
            mode={modal.mode}
            data={modal.data}
            onClose={() => setModal({ open: false, mode: 'create', data: null })}
            onSaved={loadClients}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Encabezado */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">groups</span>
          <h2 className="text-headline-md font-bold text-primary tracking-tight">Clientes</h2>
          <span className="text-body-md text-on-surface-variant ml-1">· {pagination.total}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente…"
              className="w-56 h-9 pl-10 pr-3 rounded-xl border border-[#E5E5E5] bg-[#f5f5f5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b] focus:bg-white"
            />
          </div>
          <Button onClick={() => setModal({ open: true, mode: 'create', data: null })}>
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Nuevo
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

      {/* Búsqueda mobile */}
      <div className="sm:hidden mb-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente…"
            className="w-full h-10 pl-10 pr-3 rounded-xl border border-[#E5E5E5] bg-[#f5f5f5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b] focus:bg-white"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1 mb-3 bg-[#f5f5f5] rounded-xl p-1 w-fit border border-[#E5E5E5]">
        {[
          { key: 'all', label: 'Todos', count: clients.length },
          { key: 'active', label: 'Con proyectos', count: clients.filter((c) => (c.project_count || 0) > 0).length },
          { key: 'inactive', label: 'Sin proyectos', count: clients.filter((c) => (c.project_count || 0) === 0).length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer
              ${filter === t.key ? 'bg-white text-primary shadow-sm border border-[#E5E5E5]' : 'text-on-surface-variant hover:text-primary'}`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Tabla */}
      {filtered.length > 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[1fr_1.2fr_0.8fr_0.6fr_0.6fr_80px] gap-4 px-4 py-2.5 bg-[#f9f9f9] border-b border-[#E5E5E5] text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
            <span>Cliente</span>
            <span>Contacto</span>
            <span>Proyectos</span>
            <span>Invertido</span>
            <span>Notas</span>
            <span></span>
          </div>
          {/* Filas */}
          <div className="divide-y divide-[#E5E5E5]">
            {filtered.map((c) => {
              const initials = `${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`.toUpperCase();
              const hasProjects = (c.project_count || 0) > 0;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(selected === c.id ? null : c.id)}
                  className={`w-full text-left p-3 md:px-4 md:py-3 transition-all hover:bg-[#f9f9f9] cursor-pointer ${selected === c.id ? 'bg-[#fed65b]/10 ring-1 ring-inset ring-[#735c00]/20' : ''}`}
                >
                  {/* Mobile card */}
                  <div className="md:hidden">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${hasProjects ? 'bg-[#735c00]/10 text-[#735c00]' : 'bg-gray-100 text-gray-400'}`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary truncate">{c.first_name} {c.last_name}</p>
                        <p className="text-[11px] text-on-surface-variant truncate">{c.email || c.phone || '—'}</p>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${hasProjects ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {hasProjects ? 'Activo' : 'Sin proyectos'}
                      </div>
                    </div>
                    {selected === c.id && (
                      <div className="mt-3 pl-[52px] pt-3 border-t border-[#E5E5E5] space-y-2">
                        {c.phone && (
                          <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px]">phone</span>
                            {c.phone}
                          </div>
                        )}
                        {c.address && (
                          <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                            {c.address}
                          </div>
                        )}
                        {c.notes && (
                          <div className="flex items-start gap-2 text-[12px] text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px] mt-0.5">notes</span>
                            <span>{c.notes}</span>
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate('/messages', { state: { contactName: `${c.first_name} ${c.last_name}` } }); }}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#735c00] bg-[#fed65b]/20 hover:bg-[#fed65b]/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">chat</span>
                            Mensaje
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setModal({ open: true, mode: 'edit', data: c }); }}
                            className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-[#f5f5f5] hover:bg-[#e5e5e5] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            Editar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[1fr_1.2fr_0.8fr_0.6fr_0.6fr_80px] gap-4 items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${hasProjects ? 'bg-[#735c00]/10 text-[#735c00]' : 'bg-gray-100 text-gray-400'}`}>
                        {initials}
                      </div>
                      <span className="text-sm font-semibold text-primary truncate">{c.first_name} {c.last_name}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] text-primary truncate">{c.email || '—'}</p>
                      <p className="text-[11px] text-on-surface-variant">{c.phone || ''}</p>
                    </div>
                    <span className="text-sm text-primary font-medium">{c.project_count || 0}</span>
                    <span className="text-sm text-primary font-medium">
                      {c.total_spent ? `$${Number(c.total_spent).toLocaleString()}` : '—'}
                    </span>
                    <span className="text-[12px] text-on-surface-variant truncate">{c.notes || '—'}</span>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setModal({ open: true, mode: 'edit', data: c }); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-[#735c00] hover:bg-[#fed65b]/20 transition-all cursor-pointer"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: c.id, name: `${c.first_name} ${c.last_name}` }); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-16 bg-white rounded-xl border border-[#E5E5E5]">
          <span className="material-symbols-outlined text-3xl text-on-surface-variant/50 mb-2">search_off</span>
          <p className="text-sm text-on-surface-variant">No hay clientes que coincidan con tu búsqueda</p>
          <button onClick={() => setSearch('')} className="text-xs text-[#735c00] font-semibold mt-2 hover:underline cursor-pointer">
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Loading indicator (reloading) */}
      {loading && clients.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
          Actualizando…
        </div>
      )}

      {/* Modal crear/editar */}
      {modal.open && (
        <ClientModal
          mode={modal.mode}
          data={modal.data}
          onClose={() => setModal({ open: false, mode: 'create', data: null })}
          onSaved={loadClients}
        />
      )}

      {/* Modal confirmar eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 max-w-sm w-full shadow-lg animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-red-500">delete</span>
              </div>
              <div>
                <h4 className="text-headline-md font-semibold text-primary">Eliminar cliente</h4>
                <p className="text-body-md text-on-surface-variant">
                  ¿Estás seguro de eliminar a <strong>{deleteConfirm.name}</strong>?
                </p>
                <p className="text-[12px] text-red-600 mt-1">Esta acción eliminará también sus citas, proyectos y pagos.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="h-10 px-5 rounded-xl font-semibold text-sm transition-all bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {deleteLoading ? (
                  <><span className="material-symbols-outlined animate-spin text-[14px]">sync</span> Eliminando…</>
                ) : (
                  'Eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
