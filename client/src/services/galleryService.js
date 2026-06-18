/**
 * galleryService.js — Capa de datos para galerías.
 *
 * Arquitectura preparada para backend:
 * - Las funciones son async y devuelven Promises.
 * - Los parámetros y tipos de retorno son idénticos a los que usaría una API REST.
 * - Cuando llegue el back, solo cambias la implementación interna de cada función.
 */

const STORAGE_KEY = 'photocrm_galleries';

// ---------- Datos mock iniciales ----------
const SEED_GALLERIES = [
  {
    id: 'g1',
    name: 'Boda Maria & Carlos',
    clientName: 'Maria Gomez',
    description: 'Ceremonia en la playa, recepción en el jardín. 120 invitados.',
    date: '2026-05-15',
    status: 'active',
    coverPhoto: '',
    photoCount: 184,
    clientPortalUrl: 'https://portal.photocrm.com/g/maria-carlos',
    tags: ['boda', 'playa', 'outdoor'],
    createdAt: '2026-04-20T10:00:00Z',
    updatedAt: '2026-05-16T08:30:00Z',
  },
  {
    id: 'g2',
    name: 'Sesión de Retratos — Vance',
    clientName: 'Emma Vance',
    description: 'Retratos corporativos para perfil profesional y redes sociales.',
    date: '2026-06-01',
    status: 'active',
    coverPhoto: '',
    photoCount: 42,
    clientPortalUrl: 'https://portal.photocrm.com/g/emma-vance',
    tags: ['retrato', 'corporativo', 'estudio'],
    createdAt: '2026-05-25T14:00:00Z',
    updatedAt: '2026-06-02T11:00:00Z',
  },
  {
    id: 'g3',
    name: 'Bautizo — Familia Rodríguez',
    clientName: 'Ana Rodríguez',
    description: 'Bautizo en la Iglesia San José. Recepción en casa de la abuela.',
    date: '2026-04-10',
    status: 'archived',
    coverPhoto: '',
    photoCount: 98,
    clientPortalUrl: '',
    tags: ['bautizo', 'iglesia', 'familia'],
    createdAt: '2026-03-28T09:00:00Z',
    updatedAt: '2026-04-12T18:00:00Z',
  },
  {
    id: 'g4',
    name: 'Graduación UASD 2026',
    clientName: 'Carlos Méndez',
    description: 'Sesión de graduación en el campus universitario.',
    date: '2026-07-20',
    status: 'draft',
    coverPhoto: '',
    photoCount: 0,
    clientPortalUrl: '',
    tags: ['graduación', 'universidad', 'outdoor'],
    createdAt: '2026-07-10T16:00:00Z',
    updatedAt: '2026-07-10T16:00:00Z',
  },
  {
    id: 'g5',
    name: 'Evento Corporativo — TechConf',
    clientName: 'TechConf RD',
    description: 'Cobertura fotográfica del evento anual de tecnología.',
    date: '2026-06-28',
    status: 'active',
    coverPhoto: '',
    photoCount: 256,
    clientPortalUrl: 'https://portal.photocrm.com/g/techconf',
    tags: ['evento', 'corporativo', 'conferencia'],
    createdAt: '2026-06-15T11:00:00Z',
    updatedAt: '2026-06-29T09:00:00Z',
  },
];

// ---------- Helpers internos ----------

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('galleryService: error parsing localStorage', e);
  }
  // Primera vez: sembrar datos mock
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_GALLERIES));
  return [...SEED_GALLERIES];
}

function persist(galleries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(galleries));
}

function generateId() {
  return `g_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// ---------- API Pública (async, lista para backend) ----------

const galleryService = {
  /**
   * Obtener todas las galerías, opcionalmente filtradas.
   * @param {Object} filters - { status?: string, search?: string }
   * @returns {Promise<Array>}
   */
  async getAll(filters = {}) {
    // Simula latencia de red
    await new Promise((r) => setTimeout(r, 100));
    let list = loadAll();

    if (filters.status && filters.status !== 'all') {
      list = list.filter((g) => g.status === filters.status);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.clientName.toLowerCase().includes(q) ||
          g.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  /**
   * Obtener una galería por ID.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    await new Promise((r) => setTimeout(r, 50));
    const list = loadAll();
    return list.find((g) => g.id === id) || null;
  },

  /**
   * Crear una nueva galería.
   * @param {Object} data - { name, clientName, description, date?, tags?, status? }
   * @returns {Promise<Object>} La galería creada
   */
  async create(data) {
    await new Promise((r) => setTimeout(r, 200));
    const list = loadAll();
    const now = new Date().toISOString();
    const newGallery = {
      id: generateId(),
      name: data.name,
      clientName: data.clientName || '',
      description: data.description || '',
      date: data.date || now.split('T')[0],
      status: data.status || 'draft',
      coverPhoto: data.coverPhoto || '',
      photoCount: 0,
      clientPortalUrl: '',
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(newGallery);
    persist(list);
    return newGallery;
  },

  /**
   * Actualizar una galería existente.
   * @param {string} id
   * @param {Object} data - Campos a actualizar (parcial)
   * @returns {Promise<Object|null>}
   */
  async update(id, data) {
    await new Promise((r) => setTimeout(r, 200));
    const list = loadAll();
    const idx = list.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
    persist(list);
    return list[idx];
  },

  /**
   * Eliminar una galería.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await new Promise((r) => setTimeout(r, 150));
    let list = loadAll();
    const filtered = list.filter((g) => g.id !== id);
    if (filtered.length === list.length) return false;
    persist(filtered);
    return true;
  },
};

export default galleryService;
