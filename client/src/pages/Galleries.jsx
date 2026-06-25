import { useState, useEffect, useCallback, useRef } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import galleryService from '../services/galleryService';
import clientService from '../services/clientService';

// ─── Helpers de UI ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  borrador: { label: 'Borrador', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  editando: { label: 'Editando', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  completado: { label: 'Completado', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
};

const STATUS_TABS = [
  { value: 'all', label: 'Todas' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'editando', label: 'Editando' },
  { value: 'completado', label: 'Completado' },
];

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Galleries() {
  // Estado de datos
  const [galleries, setGalleries] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estado de filtros
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Estado de modales
  const [galleryModal, setGalleryModal] = useState({ open: false, mode: 'add', data: null });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const searchRef = useRef(searchQuery);
  useEffect(() => {
    searchRef.current = searchQuery;
  }, [searchQuery]);

  // ─── Carga de datos ──────────────────────────────────────────────────────────

  const loadGalleries = useCallback(async (query) => {
    setLoading(true);
    setError('');
    try {
      const result = await galleryService.getAll({
        status: statusFilter,
        search: query !== undefined ? query : searchRef.current,
      });
      setGalleries(result.data || []);
    } catch (e) {
      console.error('Error loading galleries', e);
      setError('No se pudieron cargar las galerías.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadClients = useCallback(async () => {
    try {
      const result = await clientService.getAll({ limit: 200 });
      setClients(result.data || []);
    } catch (e) {
      console.error('Error loading clients', e);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadGalleries(searchQuery);
    }, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadGalleries, searchQuery]);

  // ─── Handlers de CRUD ────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setGalleryModal({
      open: true,
      mode: 'add',
      data: null,
    });
  };

  const handleOpenEdit = (gallery) => {
    setGalleryModal({
      open: true,
      mode: 'edit',
      data: { ...gallery },
    });
  };

  const handleSaveGallery = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const title = fd.get('title')?.trim();
    const client_id = fd.get('client_id');
    const status = fd.get('status');
    const external_url = fd.get('external_url')?.trim() || '';

    if (!title) return;
    if (galleryModal.mode === 'add' && !client_id) return;

    try {
      if (galleryModal.mode === 'add') {
        await galleryService.create({ client_id, title, status, external_url });
      } else {
        await galleryService.update(galleryModal.data.id, { title, status, external_url });
      }
      setGalleryModal({ open: false, mode: 'add', data: null });
      await loadGalleries();
    } catch (e) {
      console.error('Error saving gallery', e);
      setError('Error al guardar la galería.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await galleryService.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      await loadGalleries();
    } catch (e) {
      console.error('Error deleting gallery', e);
      setError('Error al eliminar la galería.');
    }
  };

  // Encuentra el nombre del cliente por su id
  const getClientName = (clientId) => {
    if (!clientId) return null;
    const c = clients.find((cl) => cl.id === clientId);
    return c ? `${c.first_name} ${c.last_name}`.trim() : null;
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-ds-lg max-w-4xl mx-auto pb-40 overflow-y-auto h-full">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-ds-md">
        <div>
          <h2 className="text-display-lg-mobile md:text-headline-lg font-bold text-primary tracking-tight mb-1">
            Galerías
          </h2>
          <p className="text-body-md text-on-surface-variant">
            Administra las galerías de tus clientes.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva Galería
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-ds-md">
        {/* Tabs de estado */}
        <div className="flex gap-1 bg-surface-container-low rounded-xl p-1 w-full md:w-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                statusFilter === tab.value
                  ? 'bg-white text-primary shadow-sm border border-[#E5E5E5]'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Búsqueda */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título o cliente…"
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#E5E5E5] bg-white text-sm text-primary placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-[#fed65b] focus:border-[#735c00] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
          <button onClick={() => setError('')} className="ml-auto cursor-pointer text-red-400 hover:text-red-600">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Estado de carga */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-3xl mb-3">sync</span>
          <p className="text-sm">Cargando galerías…</p>
        </div>
      )}

      {/* Estado vacío */}
      {!loading && galleries.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 border border-[#E5E5E5]">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant">photo_library</span>
          </div>
          <h3 className="text-headline-md font-semibold text-primary mb-1">
            {searchQuery || statusFilter !== 'all'
              ? 'Sin resultados'
              : 'No hay galerías aún'}
          </h3>
          <p className="text-body-md text-on-surface-variant max-w-xs mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'Intenta con otros filtros o crea una nueva galería.'
              : 'Crea tu primera galería para empezar a organizar tus shoots.'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Button onClick={handleOpenCreate}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              Crear Galería
            </Button>
          )}
          {(searchQuery || statusFilter !== 'all') && (
            <Button variant="secondary" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
              Limpiar filtros
            </Button>
          )}
        </div>
      )}

      {/* Grid de galerías */}
      {!loading && galleries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-ds-md">
          {galleries.map((gallery) => {
            const statusCfg = STATUS_CONFIG[gallery.status] || STATUS_CONFIG.draft;
            const clientName = gallery.client_name || getClientName(gallery.client_id) || 'Cliente';
            return (
              <Card
                key={gallery.id}
                interactive
                className="group flex flex-col"
              >
                {/* Header visual: fotos */}
                <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden bg-surface-container-highest mb-3">
                  {/* Placeholder con número de fotos */}
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-secondary/10 to-secondary/5">
                    <span className="material-symbols-outlined text-5xl text-secondary/40">
                      photos
                    </span>
                    <span className="text-xs font-medium text-secondary/60">
                      {gallery.photo_count || 0} foto{gallery.photo_count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Status badge */}
                  <div
                    className={`absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusCfg.bg} ${statusCfg.text} border border-white/50 shadow-xs`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </div>

                  {/* Hover overlay: Edit button */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all flex items-start justify-end p-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(gallery);
                      }}
                      className="bg-white/90 hover:bg-white text-primary p-2 rounded-full shadow-sm border border-[#E5E5E5] cursor-pointer transition-all"
                      title="Editar galería"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col">
                  <h3 className="text-label-md font-semibold text-primary mb-0.5 truncate">
                    {gallery.title}
                  </h3>
                  <p className="text-body-md text-on-surface-variant truncate">
                    {clientName}
                  </p>

                  <div className="mt-auto pt-3 flex items-center justify-between text-[12px] text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      {formatDate(gallery.created_at) || '—'}
                    </span>
                    {gallery.share_token && (
                      <span className="flex items-center gap-1" title="Compartida">
                        <span className="material-symbols-outlined text-[14px]">share</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones rápidas en hover */}
                <div className="pt-3 mt-3 border-t border-[#E5E5E5] flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(gallery);
                    }}
                    className="text-xs font-medium text-secondary hover:underline cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm({ id: gallery.id, title: gallery.title });
                    }}
                    className="text-xs font-medium text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    Eliminar
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========== MODAL: Crear / Editar Galería ========== */}
      {galleryModal.open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-ds-lg max-w-lg w-full shadow-lg space-y-ds-md animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h4 className="text-headline-md font-semibold text-primary">
                {galleryModal.mode === 'add' ? 'Nueva Galería' : 'Editar Galería'}
              </h4>
              <button
                type="button"
                onClick={() => setGalleryModal({ open: false, mode: 'add', data: null })}
                className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer"
              >
                close
              </button>
            </div>

            <form onSubmit={handleSaveGallery} className="space-y-ds-md">
              {/* Título */}
              <div>
                <label className="text-label-md text-primary font-semibold block mb-1">
                  Título de la galería <span className="text-red-400">*</span>
                </label>
                <input
                  name="title"
                  required
                  placeholder="Ej: Boda María & Carlos"
                  defaultValue={galleryModal.data?.title || ''}
                  className="w-full h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md"
                />
              </div>

              {/* Link externo */}
              <div>
                <label className="text-label-md text-primary font-semibold block mb-1">
                  Link externo
                </label>
                <input
                  name="external_url"
                  placeholder="Ej: https://migalería.com/album/abc123"
                  defaultValue={galleryModal.data?.external_url || ''}
                  className="w-full h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md"
                />
                <p className="text-xs text-on-surface-variant mt-1">Link a la app externa donde están las fotos</p>
              </div>

              {/* Cliente (solo dropdown en creación) */}
              {galleryModal.mode === 'add' ? (
                <div>
                  <label className="text-label-md text-primary font-semibold block mb-1">
                    Cliente <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="client_id"
                    required
                    defaultValue={galleryModal.data?.client_id || ''}
                    className="w-full h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md bg-white"
                  >
                    <option value="">Selecciona un cliente…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                // En edición mostrar el nombre del cliente (no se puede cambiar)
                <div>
                  <label className="text-label-md text-primary font-semibold block mb-1">
                    Cliente
                  </label>
                  <p className="h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md flex items-center bg-gray-50 text-on-surface-variant">
                    {galleryModal.data?.client_name || getClientName(galleryModal.data?.client_id) || '—'}
                  </p>
                </div>
              )}

              {/* Estado */}
              <div>
                <label className="text-label-md text-primary font-semibold block mb-1">
                  Estado
                </label>
                <select
                  name="status"
                  defaultValue={galleryModal.data?.status || 'draft'}
                  className="w-full h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md bg-white"
                >
                  <option value="borrador">Borrador</option>
                  <option value="editando">Editando</option>
                  <option value="completado">Completado</option>
                </select>
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                <Button
                  variant="secondary"
                  onClick={() => setGalleryModal({ open: false, mode: 'add', data: null })}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {galleryModal.mode === 'add' ? 'Crear Galería' : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== MODAL: Confirmar eliminación ========== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-ds-lg max-w-sm w-full shadow-lg space-y-ds-md animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-red-500">delete</span>
              </div>
              <div>
                <h4 className="text-headline-md font-semibold text-primary">Eliminar galería</h4>
                <p className="text-body-md text-on-surface-variant">
                  ¿Estás seguro de eliminar <strong>{deleteConfirm.title}</strong>?
                </p>
                <p className="text-body-md text-red-600 text-sm mt-1">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
              <button
                onClick={handleDeleteConfirm}
                className="h-10 px-ds-lg rounded-xl font-label-md transition-all active:scale-[0.98] duration-150 flex items-center justify-center gap-ds-xs cursor-pointer bg-error text-white hover:bg-error/90"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
