import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

const DEMO_CLIENTS = [
  { id: 1, name: 'María Gómez', email: 'maria.gomez@gmail.com', phone: '+1 (809) 555-0101', company: 'Gómez Eventos', projects: 4, spent: 2400, lastProject: 'Boda 2026', lastDate: '12 Jun 2026', status: 'active', tags: ['boda', 'recurrente'] },
  { id: 2, name: 'Carlos Méndez', email: 'cmendez@outlook.com', phone: '+1 (809) 555-0202', company: 'Méndez Corp', projects: 2, spent: 880, lastProject: 'Graduación', lastDate: '28 May 2026', status: 'active', tags: ['graduación'] },
  { id: 3, name: 'Ana Rodríguez', email: 'ana.rodriguez@icloud.com', phone: '+1 (829) 555-0303', company: 'Rodríguez Family', projects: 1, spent: 1200, lastProject: 'Boda', lastDate: '15 May 2026', status: 'active', tags: ['boda'] },
  { id: 4, name: 'David K. Peña', email: 'dkpena@hotmail.com', phone: '+1 (849) 555-0404', company: 'DK Studios', projects: 3, spent: 1750, lastProject: 'Retratos Corporativos', lastDate: '02 Jun 2026', status: 'inactive', tags: ['corporativo', 'retrato'] },
  { id: 5, name: 'Laura Castillo', email: 'lcastillo@gmail.com', phone: '+1 (809) 555-0505', company: 'Castillo Designs', projects: 6, spent: 5200, lastProject: 'Campaña Producto', lastDate: '20 Jun 2026', status: 'active', tags: ['publicidad', 'recurrente'] },
  { id: 6, name: 'TechConf RD', email: 'info@techconf.do', phone: '+1 (809) 555-0606', company: 'TechConf RD', projects: 1, spent: 3500, lastProject: 'Conferencia Anual', lastDate: '10 Jun 2026', status: 'active', tags: ['evento', 'corporativo'] },
  { id: 7, name: 'Sofía Martínez', email: 'sofi.martinez@yahoo.com', phone: '+1 (829) 555-0707', company: 'Sra. Martínez', projects: 2, spent: 980, lastProject: 'Sesión Familiar', lastDate: '05 Apr 2026', status: 'inactive', tags: ['retrato', 'familia'] },
  { id: 8, name: 'Fernando Vargas', email: 'fvargas@outlook.com', phone: '+1 (809) 555-0808', company: 'Vargas Abogados', projects: 5, spent: 4100, lastProject: 'Evento Corporativo', lastDate: '18 Jun 2026', status: 'active', tags: ['corporativo', 'recurrente'] },
];

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const navigate = useNavigate();
  const loadDemo = () => setClients(DEMO_CLIENTS);
  const clear = () => { setClients([]); setSelected(null); };

  const filtered = clients
    .filter((c) => filter === 'all' || c.status === filter)
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  // --- Empty state ---
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-full overflow-y-auto">
        <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-4 border border-[#E5E5E5]">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant">groups</span>
        </div>
        <h3 className="text-headline-md font-semibold text-primary mb-1">Sin clientes registrados</h3>
        <p className="text-body-md text-on-surface-variant max-w-sm mb-6">
          Aún no has agregado clientes. Aquí aparecerán todos tus contactos con su historial
          de proyectos, para que tengas todo en un solo lugar.
        </p>
        <Button onClick={loadDemo}>
          <span className="material-symbols-outlined text-[18px]">preview</span>
          Cargar datos de demostración
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Encabezado */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">groups</span>
          <h2 className="text-headline-md font-bold text-primary tracking-tight">Clientes</h2>
          <span className="text-body-md text-on-surface-variant ml-1">· {clients.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente…" className="w-56 h-9 pl-10 pr-3 rounded-xl border border-[#E5E5E5] bg-[#f5f5f5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b] focus:bg-white" />
          </div>
          <Button variant="secondary" onClick={clear}>
            <span className="material-symbols-outlined text-[16px]">person_remove</span>
            Mostrar vacío
          </Button>
        </div>
      </div>

      {/* Búsqueda mobile */}
      <div className="sm:hidden mb-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente…" className="w-full h-10 pl-10 pr-3 rounded-xl border border-[#E5E5E5] bg-[#f5f5f5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b] focus:bg-white" />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1 mb-3 bg-[#f5f5f5] rounded-xl p-1 w-fit border border-[#E5E5E5]">
        {[
          { key: 'all', label: 'Todos', count: clients.length },
          { key: 'active', label: 'Activos', count: clients.filter((c) => c.status === 'active').length },
          { key: 'inactive', label: 'Inactivos', count: clients.filter((c) => c.status === 'inactive').length },
        ].map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer
              ${filter === t.key ? 'bg-white text-primary shadow-sm border border-[#E5E5E5]' : 'text-on-surface-variant hover:text-primary'}`}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Tabla */}
      {filtered.length > 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[1fr_1.2fr_0.8fr_0.6fr_0.7fr_0.5fr_48px] gap-4 px-4 py-2.5 bg-[#f9f9f9] border-b border-[#E5E5E5] text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
            <span>Cliente</span>
            <span>Contacto</span>
            <span>Proyectos</span>
            <span>Gastado</span>
            <span>Último proyecto</span>
            <span>Estado</span>
            <span></span>
          </div>
          {/* Filas */}
          <div className="divide-y divide-[#E5E5E5]">
            {filtered.map((c) => (
              <button key={c.id} onClick={() => setSelected(selected === c.id ? null : c.id)}
                className={`w-full text-left p-3 md:px-4 md:py-3 transition-all hover:bg-[#f9f9f9] cursor-pointer ${selected === c.id ? 'bg-[#fed65b]/10 ring-1 ring-inset ring-[#735c00]/20' : ''}`}>
                {/* Mobile card */}
                <div className="md:hidden">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${c.status === 'active' ? 'bg-[#735c00]/10 text-[#735c00]' : 'bg-gray-100 text-gray-400'}`}>
                      {c.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{c.name}</p>
                      <p className="text-[11px] text-on-surface-variant truncate">{c.email}</p>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.status === 'active' ? 'Activo' : 'Inactivo'}
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 pl-[52px]">
                    <span className="text-[11px] text-on-surface-variant">{c.projects} proyectos</span>
                    <span className="text-[11px] text-on-surface-variant">${c.spent.toLocaleString()}</span>
                    <span className="text-[11px] text-on-surface-variant">{c.lastDate}</span>
                  </div>
                  {/* Expanded */}
                  {selected === c.id && (
                    <div className="mt-3 pl-[52px] pt-3 border-t border-[#E5E5E5] space-y-2">
                      <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px]">phone</span>
                        {c.phone}
                      </div>
                      <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px]">business</span>
                        {c.company}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded-full bg-[#fed65b]/20 text-[#735c00] text-[10px] font-medium">{t}</span>
                        ))}
                      </div>
                      <div className="pt-1">
                        <button onClick={(e) => { e.stopPropagation(); navigate('/messages', { state: { contactName: c.name } }); }}
                          className="flex items-center gap-1.5 text-xs font-semibold text-[#735c00] bg-[#fed65b]/20 hover:bg-[#fed65b]/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer">
                          <span className="material-symbols-outlined text-[14px]">chat</span>
                          Enviar mensaje
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-[1fr_1.2fr_0.8fr_0.6fr_0.7fr_0.5fr_48px] gap-4 items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${c.status === 'active' ? 'bg-[#735c00]/10 text-[#735c00]' : 'bg-gray-100 text-gray-400'}`}>
                      {c.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <span className="text-sm font-semibold text-primary truncate">{c.name}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] text-primary truncate">{c.email}</p>
                    <p className="text-[11px] text-on-surface-variant">{c.phone}</p>
                  </div>
                  <span className="text-sm text-primary font-medium">{c.projects}</span>
                  <span className="text-sm text-primary font-medium">${c.spent.toLocaleString()}</span>
                  <div className="min-w-0">
                    <p className="text-[13px] text-primary truncate">{c.lastProject}</p>
                    <p className="text-[11px] text-on-surface-variant">{c.lastDate}</p>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.status === 'active' ? 'Activo' : 'Inactivo'}
                  </div>
                  <div className="flex justify-center">
                    <button onClick={(e) => { e.stopPropagation(); navigate('/messages', { state: { contactName: c.name } }); }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-[#735c00] hover:bg-[#fed65b]/20 transition-all cursor-pointer">
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                    </button>
                  </div>
                </div>
                {/* Desktop expanded details */}
                {selected === c.id && (
                  <div className="hidden md:block mt-3 pt-3 border-t border-[#E5E5E5] pl-11">
                    <div className="flex items-center gap-6 text-[12px] text-on-surface-variant">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">business</span>{c.company}</span>
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded-full bg-[#fed65b]/20 text-[#735c00] text-[10px] font-medium">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-16 bg-white rounded-xl border border-[#E5E5E5]">
          <span className="material-symbols-outlined text-3xl text-on-surface-variant/50 mb-2">search_off</span>
          <p className="text-sm text-on-surface-variant">No hay clientes que coincidan con tu búsqueda</p>
          <button onClick={() => setSearch('')} className="text-xs text-[#735c00] font-semibold mt-2 hover:underline cursor-pointer">Limpiar filtros</button>
        </div>
      )}
    </div>
  );
}
