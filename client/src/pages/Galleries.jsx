import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import galleryService from '../services/galleryService';

// ---------- Helpers de UI ----------

const STATUS_CONFIG = {
  active: { label: 'Activa', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  draft: { label: 'Borrador', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  archived: { label: 'Archivada', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

const STATUS_TABS = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'draft', label: 'Borradores' },
  { value: 'archived', label: 'Archivadas' },
];

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPhotoCount(n) {
  if (n === 0) return 'Sin fotos';
  if (n === 1) return '1 foto';
  return `${n} fotos`;
}

// ---------- Componente principal ----------

export default function Galleries() {
  const navigate = useNavigate();

  // Estado de datos
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estado de filtros
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Estado de modales
  const [galleryModal, setGalleryModal] = useState({ open: false, mode: 'add', data: null });
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name } o null

  // ---------- Carga de datos ----------

  const loadGalleries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await galleryService.getAll({
        status: statusFilter,
        search: searchQuery,
      });
      setGalleries(data);
    } catch (e) {
      console.error('Error loading galleries', e);
      setError('No se pudieron cargar las galerías.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadGalleries();
  }, [loadGalleries]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      loadGalleries();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // ---------- Handlers de CRUD ----------

  const handleOpenCreate = () => {
    setGalleryModal({
      open: true,
      mode: 'add',
      data: {
        name: '',
        clientName: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        status: 'draft',
        tags: [],
      },
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
    const name = fd.get('name');
    const clientName = fd.get('clientName');
    const description = fd.get('description');
    const date = fd.get('date');
    const status = fd.get('status');
    const tagsRaw = fd.get('tags');

    if (!name || !clientName) return;

    const tags = tagsRaw
      ? tagsRaw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    try {
      if (galleryModal.mode === 'add') {
        await galleryService.create({ name, clientName, description, date, status, tags });
      } else {
        await galleryService.update(galleryModal.data.id, {
          name, clientName, description, date, status, tags,
        });
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

  // ---------- Render ----------

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
            placeholder="Buscar por nombre, cliente o etiqueta..."
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
            return (
              <Card
                key={gallery.id}
                interactive
                className="group flex flex-col"
              >
                {/* Cover / Placeholder */}
                <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden bg-surface-container-highest mb-3">
                  {gallery.coverPhoto ? (
                    <img
                      src={gallery.coverPhoto}
                      alt={gallery.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">
                        photo_library
                      </span>
                    </div>
                  )}

                  {/* Status badge */}
                  <div
                    className={`absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusCfg.bg} ${statusCfg.text} border border-white/50 shadow-xs`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </div>

                  {/* Hover overlay: Edit button */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
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
                    {gallery.name}
                  </h3>
                  <p className="text-body-md text-on-surface-variant truncate">
                    {gallery.clientName}
                  </p>

                  <div className="mt-auto pt-3 flex items-center justify-between text-[12px] text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      {formatDate(gallery.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">photo</span>
                      {formatPhotoCount(gallery.photoCount)}
                    </span>
                  </div>

                  {/* Tags */}
                  {gallery.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {gallery.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-surface-container-low text-on-surface-variant px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {gallery.tags.length > 3 && (
                        <span className="text-[10px] text-on-surface-variant">
                          +{gallery.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
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
                      setDeleteConfirm({ id: gallery.id, name: gallery.name });
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
              {/* Nombre */}
              <div>
                <label className="text-label-md text-primary font-semibold block mb-1">
                  Nombre de la galería <span className="text-red-400">*</span>
                </label>
                <input
                  name="name"
                  required
                  placeholder="Ej: Boda María & Carlos"
                  defaultValue={galleryModal.data?.name || ''}
                  className="w-full h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md"
                />
              </div>

              {/* Cliente */}
              <div>
                <label className="text-label-md text-primary font-semibold block mb-1">
                  Cliente <span className="text-red-400">*</span>
                </label>
                <input
                  name="clientName"
                  required
                  placeholder="Nombre del cliente"
                  defaultValue={galleryModal.data?.clientName || ''}
                  className="w-full h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="text-label-md text-primary font-semibold block mb-1">
                  Descripción
                </label>
                <textarea
                  name="description"
                  placeholder="Describe el evento o sesión…"
                  defaultValue={galleryModal.data?.description || ''}
                  rows={3}
                  className="w-full p-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md resize-none"
                />
              </div>

              {/* Fecha y Estado en grid */}
              <div className="grid grid-cols-2 gap-ds-md">
                <div>
                  <label className="text-label-md text-primary font-semibold block mb-1">
                    Fecha del evento
                  </label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={galleryModal.data?.date || ''}
                    className="w-full h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md"
                  />
                </div>
                <div>
                  <label className="text-label-md text-primary font-semibold block mb-1">
                    Estado
                  </label>
                  <select
                    name="status"
                    defaultValue={galleryModal.data?.status || 'draft'}
                    className="w-full h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md bg-white"
                  >
                    <option value="draft">Borrador</option>
                    <option value="active">Activa</option>
                    <option value="archived">Archivada</option>
                  </select>
                </div>
              </div>

              {/* Etiquetas */}
              <div>
                <label className="text-label-md text-primary font-semibold block mb-1">
                  Etiquetas
                </label>
                <input
                  name="tags"
                  placeholder="boda, playa, outdoor (separadas por coma)"
                  defaultValue={(galleryModal.data?.tags || []).join(', ')}
                  className="w-full h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md"
                />
                <p className="text-[11px] text-on-surface-variant mt-1">
                  Separa las etiquetas con coma.
                </p>
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
                  ¿Estás seguro de eliminar <strong>{deleteConfirm.name}</strong>?
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
