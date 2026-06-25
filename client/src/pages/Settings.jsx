import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import settingsService from '../services/settingsService';
import whatsappService from '../services/whatsappService';

// Default initial settings
const DEFAULT_SETTINGS = {
  publicPortalAccess: true,
  brandedDomain: 'portal.yourbrand.com',
  templates: [
    {
      id: 1,
      name: 'Booking Confirmation',
      description: 'Sent after deposit payment',
      icon: 'schedule',
      bgClass: 'bg-secondary-container/20 text-secondary',
      content: 'Hello {{client_name}}, your booking for {{event_date}} is confirmed! We have received your deposit. See you soon!',
    },
    {
      id: 2,
      name: 'Gallery Delivery',
      description: 'Sent when photos are ready',
      icon: 'photo_library',
      bgClass: 'bg-surface-container text-on-surface-variant',
      content: 'Hi {{client_name}}! Exciting news: your gallery is ready to view. Click the link to view and download your photos: {{gallery_link}}',
    },
  ],
  users: [
    { id: 1, name: 'James Smith', role: 'Lead Photographer (Admin)', initials: 'JS', isAdmin: true },
    { id: 2, name: 'Anna Reed', role: 'Editor (Standard Access)', initials: 'AR', isAdmin: false },
  ],
};

export default function Settings() {
  // ─── Settings state ──────────────────────────────────────────────────
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('photocrm_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [loadingSettings, setLoadingSettings] = useState(true);

  // ─── WhatsApp real state ────────────────────────────────────────────
  const [waState, setWaState] = useState({
    status: 'disconnected',
    qr: null,
    phone: null,
    loading: true,
  });

  // ─── Modals state ──────────────────────────────────────────────────
  const [templateModal, setTemplateModal] = useState({ open: false, mode: 'add', data: null });
  const [userModal, setUserModal] = useState({ open: false, mode: 'add', data: null });

  // ─── Cargar settings desde API ──────────────────────────────────────
  useEffect(() => {
    async function loadSettings() {
      try {
        const apiSettings = await settingsService.get();
        if (apiSettings && Object.keys(apiSettings).length > 0) {
          setSettings((prev) => {
            const merged = { ...prev, ...apiSettings };
            if (typeof merged.minTimeframe === 'string') {
              merged.minTimeframe = parseInt(merged.minTimeframe, 10);
            }
            localStorage.setItem('photocrm_settings', JSON.stringify(merged));
            return merged;
          });
        }
      } catch (e) {
        console.warn('No se pudieron cargar settings desde la API:', e.message);
      } finally {
        setLoadingSettings(false);
      }
    }
    loadSettings();
  }, []);

  // ─── Polling de WhatsApp cada 3s ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const st = await whatsappService.getStatus();
        if (cancelled) return;

        if (st.status === 'qr') {
          try {
            const qr = await whatsappService.getQR();
            if (!cancelled) setWaState({ status: 'qr', qr, phone: null, loading: false });
          } catch {
            if (!cancelled) setWaState({ status: 'qr', qr: null, phone: null, loading: false });
          }
        } else {
          if (!cancelled) setWaState({ status: st.status, qr: null, phone: st.phone || null, loading: false });
        }
      } catch {
        if (!cancelled) setWaState(prev => ({ ...prev, loading: false }));
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // ─── Handlers de WhatsApp ──────────────────────────────────────────
  const handleWaStart = async () => {
    setWaState(prev => ({ ...prev, status: 'connecting', loading: true }));
    try {
      await whatsappService.start();
    } catch (e) {
      console.error(e);
      setWaState(prev => ({ ...prev, status: 'error', loading: false }));
    }
  };

  const handleWaLogout = async () => {
    try {
      await whatsappService.logout();
      setWaState({ status: 'disconnected', qr: null, phone: null, loading: false });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleGroupMessages = async () => {
    const next = settings.showGroupMessages === false ? true : false;
    setSettings(prev => ({ ...prev, showGroupMessages: next }));
    setHasChanges(true);
    try {
      await settingsService.update({ showGroupMessages: next });
    } catch (e) {
      console.warn('No se pudo guardar showGroupMessages:', e.message);
    }
  };

  // ─── Handlers de Templates ─────────────────────────────────────────
  const handleOpenTemplateModal = (mode, data = null) => {
    setTemplateModal({
      open: true,
      mode,
      data: data ? { ...data } : { name: '', description: '', content: '', icon: 'chat_bubble' },
    });
  };

  const handleSaveTemplate = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name') || '';
    const description = fd.get('description') || '';
    const content = fd.get('content') || '';
    const icon = fd.get('icon') || 'chat_bubble';

    if (!name || !description) return;

    let updatedTemplates = [...settings.templates];
    if (templateModal.mode === 'add') {
      updatedTemplates.push({
        id: Date.now(),
        name,
        description,
        content,
        icon,
        bgClass: icon === 'schedule' ? 'bg-secondary-container/20 text-secondary' : 'bg-surface-container text-on-surface-variant',
      });
    } else {
      updatedTemplates = updatedTemplates.map((t) =>
        t.id === templateModal.data.id ? { ...t, name, description, content, icon } : t
      );
    }

    const updated = { ...settings, templates: updatedTemplates };
    setSettings(updated);
    setHasChanges(true);
    setTemplateModal({ open: false, mode: 'add', data: null });
  };

  const handleDeleteTemplate = (id) => {
    const updatedTemplates = settings.templates.filter((t) => t.id !== id);
    const updated = { ...settings, templates: updatedTemplates };
    setSettings(updated);
    setHasChanges(true);
  };

  // ─── Handlers de Usuarios ──────────────────────────────────────────
  const handleOpenUserModal = (mode, data = null) => {
    setUserModal({
      open: true,
      mode,
      data: data ? { ...data } : { name: '', role: 'Editor (Standard Access)', isAdmin: false },
    });
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name') || '';
    const roleSelect = fd.get('role');
    const isAdmin = roleSelect === 'admin';
    const role = isAdmin ? 'Lead Photographer (Admin)' : 'Editor (Standard Access)';

    if (!name) return;

    const words = name.trim().split(' ');
    const initials = words.length > 1
      ? (words[0][0] + words[1][0]).toUpperCase()
      : words[0].substring(0, 2).toUpperCase();

    let updatedUsers = [...settings.users];
    if (userModal.mode === 'add') {
      updatedUsers.push({
        id: Date.now(),
        name,
        role,
        initials,
        isAdmin,
      });
    } else {
      updatedUsers = updatedUsers.map((u) =>
        u.id === userModal.data.id ? { ...u, name, role, initials, isAdmin } : u
      );
    }

    const updated = { ...settings, users: updatedUsers };
    setSettings(updated);
    setHasChanges(true);
    setUserModal({ open: false, mode: 'add', data: null });
  };

  const handleDeleteUser = (id) => {
    const updatedUsers = settings.users.filter((u) => u.id !== id);
    const updated = { ...settings, users: updatedUsers };
    setSettings(updated);
    setHasChanges(true);
  };

  // ─── Handlers de Portal ────────────────────────────────────────────
  const handleTogglePortal = () => {
    const updated = { ...settings, publicPortalAccess: !settings.publicPortalAccess };
    setSettings(updated);
    setHasChanges(true);
  };

  // ─── Guardar en API + localStorage ──────────────────────────────────
  const handleSaveChanges = async () => {
    setSaveStatus('saving');
    localStorage.setItem('photocrm_settings', JSON.stringify(settings));

    try {
      const apiPayload = {
        studio_name: settings.studio_name,
        studio_email: settings.studio_email,
        studio_phone: settings.studio_phone,
        studio_address: settings.studio_address,
        currency: settings.currency,
      };
      if (settings.minTimeframe !== undefined) {
        apiPayload.minTimeframe = String(settings.minTimeframe);
      }
      await settingsService.update(apiPayload);
    } catch (e) {
      console.warn('No se pudieron guardar settings en la API:', e.message);
    }

    setSaveStatus('saved');
    setHasChanges(false);
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  // ─── helpers de UI ─────────────────────────────────────────────────
  // Normalizar estado: Baileys usa 'open', nosotros mostramos 'connected'
  const waNormalized = waState.status === 'open' ? 'connected' : waState.status;

  const waStatusText = {
    connected: waState.phone ? `Conectado como ${waState.phone}` : 'Conectado',
    qr: 'Esperando escaneo del código QR',
    connecting: 'Conectando…',
    error: 'Error de conexión',
    disconnected: 'Desconectado',
  }[waNormalized] || 'Desconectado';

  const waStatusColor = waNormalized === 'connected' ? 'bg-green-500'
    : waNormalized === 'qr' || waNormalized === 'connecting' ? 'bg-yellow-400'
    : 'bg-gray-400';

  const waStatusLabel = waNormalized === 'connected' ? 'Conectado'
    : waNormalized === 'qr' ? 'Esperando QR'
    : waNormalized === 'connecting' ? 'Conectando'
    : 'Desconectado';

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-ds-lg max-w-2xl mx-auto pb-40 overflow-y-auto h-full">
      {/* Page Title */}
      <div>
        <h2 className="text-display-lg-mobile md:text-headline-lg font-bold text-primary tracking-tight mb-1">
          Settings
        </h2>
        <p className="text-body-md text-on-surface-variant">
          Configura tu estudio fotográfico e integraciones.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════
          WhatsApp — Conexión real con Baileys
          ═══════════════════════════════════════════════ */}
      <section className="space-y-ds-sm">
        <div className="flex items-center gap-2 px-1">
          <span className="material-symbols-outlined text-secondary text-[20px]">chat</span>
          <h3 className="text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
            WhatsApp
          </h3>
        </div>

        <Card className="space-y-ds-lg">
          {waState.loading && waState.status === 'disconnected' ? (
            <div className="flex items-center gap-3 text-sm text-on-surface-variant py-4">
              <span className="material-symbols-outlined animate-spin">sync</span>
              Conectando con el servidor WhatsApp…
            </div>
          ) : (
            <>
              {/* ─── Estado ──────────────────────────────── */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-label-md text-primary font-semibold">Estado</p>
                  <p className="text-body-md text-on-surface-variant mt-0.5">{waStatusText}</p>
                </div>
                <div className="flex items-center gap-2 bg-[#F5F5F5] px-3 py-1 rounded-full border border-[#E5E5E5]">
                  <div className={`w-2 h-2 rounded-full ${waStatusColor}`} />
                  <span className="text-label-sm text-primary font-medium">{waStatusLabel}</span>
                </div>
              </div>

              {/* ─── QR pendiente ────────────────────────── */}
              {waState.status === 'qr' && (
                <div className="border-t border-[#E5E5E5] pt-ds-lg">
                  <p className="text-body-md text-on-surface-variant mb-3">
                    Escanea este código QR con WhatsApp en tu teléfono:
                  </p>
                  <p className="text-xs text-on-surface-variant mb-3">
                    Abre WhatsApp → Menú (⋮) → Dispositivos vinculados → Vincular un dispositivo
                  </p>
                  {waState.qr ? (
                    <div className="bg-white rounded-lg p-3 border border-[#E5E5E5] inline-block mb-4">
                      <img src={waState.qr} alt="WhatsApp QR" className="w-48 h-48" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
                      <span className="material-symbols-outlined animate-spin">sync</span>
                      Generando código QR…
                    </div>
                  )}
                  <div>
                    <Button onClick={handleWaStart} variant="secondary">
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                      Regenerar QR
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── Desconectado / Error ────────────────── */}
              {(waState.status === 'disconnected' || waState.status === 'error') && (
                <div className="border-t border-[#E5E5E5] pt-ds-lg">
                  <Button onClick={handleWaStart}>
                    <span className="material-symbols-outlined text-[16px]">power</span>
                    Conectar WhatsApp
                  </Button>
                </div>
              )}

              {/* ─── Conectado ───────────────────────────── */}
              {waNormalized === 'connected' && (
                <div className="border-t border-[#E5E5E5] pt-ds-lg flex justify-between items-center">
                  <p className="text-body-md text-on-surface-variant">
                    ✅ Los mensajes entrantes se sincronizarán automáticamente con el CRM.
                  </p>
                  <button
                    onClick={handleWaLogout}
                    className="text-label-md font-medium text-red-500 hover:text-red-700 cursor-pointer whitespace-nowrap"
                  >
                    Desconectar
                  </button>
                </div>
              )}

              {/* ─── Mostrar mensajes de grupos ──────────── */}
              <div className="border-t border-[#E5E5E5] pt-ds-lg flex justify-between items-center">
                <div>
                  <p className="text-label-md text-primary font-semibold">Mensajes de grupos</p>
                  <p className="text-body-md text-on-surface-variant">Mostrar mensajes de grupos de WhatsApp en el CRM</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer"
                    checked={settings.showGroupMessages !== false}
                    onChange={handleToggleGroupMessages} />
                  <div className="w-11 h-6 bg-[#e2e2e2] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#fed65b] rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#735c00]" />
                </label>
              </div>
            </>
          )}
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════
          Calendar Configuration
          ═══════════════════════════════════════════════ */}
      <section className="space-y-ds-sm">
        <div className="flex items-center gap-2 px-1">
          <span className="material-symbols-outlined text-secondary text-[20px]">schedule</span>
          <h3 className="text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
            Calendar Configuration
          </h3>
        </div>

        <Card className="space-y-ds-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-label-md text-primary font-semibold">Calendar Timeframe Limit</p>
              <p className="text-body-md text-on-surface-variant mt-1">
                Define el intervalo mínimo obligatorio entre citas consecutivas.
                Esta validación se aplica <strong>del lado del servidor</strong>.
              </p>
            </div>
          </div>

          <div className="border-t border-[#E5E5E5] pt-ds-lg">
            <label className="text-label-md text-primary font-semibold block mb-2">
              Intervalo mínimo entre citas
            </label>
            <select
              value={settings.minTimeframe ?? 30}
              onChange={(e) => {
                setSettings({ ...settings, minTimeframe: parseInt(e.target.value, 10) });
                setHasChanges(true);
              }}
              className="w-full h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md bg-white focus:ring-1 focus:ring-black"
            >
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos</option>
              <option value={90}>90 minutos</option>
              <option value={120}>120 minutos</option>
            </select>
            <p className="text-body-md text-on-surface-variant mt-2">
              El buscador de espacios disponibles usará este valor como tamaño de paso.
            </p>
          </div>
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════
          Client Portal
          ═══════════════════════════════════════════════ */}
      <section className="space-y-ds-sm">
        <div className="flex items-center gap-2 px-1">
          <span className="material-symbols-outlined text-secondary text-[20px]">grid_view</span>
          <h3 className="text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
            Client Portal
          </h3>
        </div>

        <Card padding={false} className="overflow-hidden">
          <div className="p-ds-md md:p-ds-lg flex justify-between items-center border-b border-[#E5E5E5]">
            <div>
              <p className="text-label-md text-primary font-semibold">Public Portal Access</p>
              <p className="text-body-md text-on-surface-variant">Allow clients to view their galleries</p>
            </div>
            <div
              className="relative inline-block w-11 h-6 transition duration-200 ease-in-out cursor-pointer"
              onClick={handleTogglePortal}
            >
              <div
                className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                  settings.publicPortalAccess ? 'bg-[#735c00]' : 'bg-[#e2e2e2]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-[2px] transition-transform duration-200 shadow-sm ${
                    settings.publicPortalAccess ? 'left-[22px]' : 'left-[2px]'
                  }`}
                />
              </div>
            </div>
          </div>

          <div
            className={`p-ds-md md:p-ds-lg flex flex-col md:flex-row md:justify-between md:items-center bg-[#F5F5F5]/50 transition-opacity duration-200 ${
              settings.publicPortalAccess ? 'opacity-100' : 'opacity-50 pointer-events-none'
            }`}
          >
            <div>
              <p className="text-label-md text-primary font-semibold">Branded Domain</p>
              <p className="text-body-md text-on-surface-variant mb-2 md:mb-0">Configure custom URL access</p>
            </div>
            <input
              className="h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md bg-white w-full md:w-64 focus:ring-1 focus:ring-black"
              type="text"
              disabled={!settings.publicPortalAccess}
              value={settings.brandedDomain || ''}
              onChange={(e) => {
                setSettings({ ...settings, brandedDomain: e.target.value });
                setHasChanges(true);
              }}
            />
          </div>
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════
          Message Templates
          ═══════════════════════════════════════════════ */}
      <section className="space-y-ds-sm">
        <div className="flex items-center gap-2 px-1">
          <span className="material-symbols-outlined text-secondary text-[20px]">chat_bubble</span>
          <h3 className="text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
            Message Templates
          </h3>
        </div>

        <div className="space-y-ds-sm">
          {settings.templates.map((template) => (
            <Card key={template.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${template.bgClass}`}>
                  <span className="material-symbols-outlined">{template.icon}</span>
                </div>
                <div>
                  <p className="text-label-md text-primary font-semibold">{template.name}</p>
                  <p className="text-body-md text-on-surface-variant">{template.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleOpenTemplateModal('edit', template)}
                  className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant hover:text-primary cursor-pointer"
                  title="Edit Template"
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700 cursor-pointer"
                  title="Delete Template"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </Card>
          ))}

          <button
            onClick={() => handleOpenTemplateModal('add')}
            className="w-full border border-dashed border-[#cfc4c5] py-ds-md rounded-xl flex items-center justify-center gap-2 text-on-surface-variant hover:bg-surface-container-low transition-all cursor-pointer h-12"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span className="font-label-md">Create New Template</span>
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          User Permissions
          ═══════════════════════════════════════════════ */}
      <section className="space-y-ds-sm">
        <div className="flex items-center gap-2 px-1">
          <span className="material-symbols-outlined text-secondary text-[20px]">admin_panel_settings</span>
          <h3 className="text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
            User Permissions
          </h3>
        </div>

        <Card padding={false} className="overflow-hidden">
          <div className="divide-y divide-[#E5E5E5]">
            {settings.users.map((user) => (
              <div key={user.id} className="p-ds-md flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      user.isAdmin ? 'bg-[#ffe088] text-[#241a00]' : 'bg-[#e2e2e2] text-on-surface-variant'
                    }`}
                  >
                    {user.initials}
                  </div>
                  <div>
                    <p className="text-label-md text-primary font-semibold">{user.name}</p>
                    <p className="text-body-md text-on-surface-variant">{user.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleOpenUserModal('edit', user)}
                    className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant hover:text-primary cursor-pointer"
                    title="Edit User"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700 cursor-pointer"
                    title="Remove User"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-ds-md border-t border-[#E5E5E5] bg-[#F5F5F5]/30">
            <button
              onClick={() => handleOpenUserModal('add')}
              className="text-label-md font-medium text-secondary hover:underline cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              Add Team Member
            </button>
          </div>
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════
          Floating Save Button
          ═══════════════════════════════════════════════ */}
      {(hasChanges || saveStatus !== 'idle') && (
        <div className="fixed bottom-20 md:bottom-8 left-0 md:left-auto md:right-8 w-full md:w-64 px-ds-margin-mobile md:px-0 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={handleSaveChanges}
            disabled={saveStatus === 'saving'}
            className="w-full bg-[#D4AF37] hover:brightness-105 active:brightness-95 text-black h-[48px] rounded-xl font-headline-md text-headline-md flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            {saveStatus === 'saving' ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                Saving Changes...
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                Changes Saved!
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  save
                </span>
                Save Changes
              </>
            )}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          Template Modal
          ═══════════════════════════════════════════════ */}
      {templateModal.open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-ds-lg max-w-md w-full shadow-lg space-y-ds-md animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <h4 className="text-headline-md font-semibold text-primary">
                {templateModal.mode === 'add' ? 'Create Template' : 'Edit Template'}
              </h4>
              <button
                type="button"
                onClick={() => setTemplateModal({ open: false, mode: 'add', data: null })}
                className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer"
              >
                close
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-ds-md">
              <div className="space-y-ds-base">
                <label className="text-label-md text-primary font-semibold block">Template Name</label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Booking Confirmation"
                  defaultValue={templateModal.data?.name || ''}
                  className="w-full h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md"
                  type="text"
                />
              </div>

              <div className="space-y-ds-base">
                <label className="text-label-md text-primary font-semibold block">Description</label>
                <input
                  name="description"
                  required
                  placeholder="e.g. Sent after booking confirmed"
                  defaultValue={templateModal.data?.description || ''}
                  className="w-full h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md"
                  type="text"
                />
              </div>

              <div className="space-y-ds-base">
                <label className="text-label-md text-primary font-semibold block">Message Content</label>
                <textarea
                  name="content"
                  required
                  rows={4}
                  placeholder="Write your template message with variables like {{client_name}}"
                  defaultValue={templateModal.data?.content || ''}
                  className="w-full p-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-black resize-none"
                />
              </div>

              <div className="space-y-ds-base">
                <label className="text-label-md text-primary font-semibold block">Icon</label>
                <select
                  name="icon"
                  defaultValue={templateModal.data?.icon || 'chat_bubble'}
                  className="w-full h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md bg-white"
                >
                  <option value="chat_bubble">Chat Bubble</option>
                  <option value="schedule">Clock (Schedule)</option>
                  <option value="photo_library">Gallery (Photo Library)</option>
                  <option value="mail">Mail</option>
                  <option value="campaign">Announcement (Campaign)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setTemplateModal({ open: false, mode: 'add', data: null })}
                  type="button"
                >
                  Cancel
                </Button>
                <Button type="submit">Save Template</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          User Modal
          ═══════════════════════════════════════════════ */}
      {userModal.open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-ds-lg max-w-sm w-full shadow-lg space-y-ds-md animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <h4 className="text-headline-md font-semibold text-primary">
                {userModal.mode === 'add' ? 'Add Team Member' : 'Edit Access'}
              </h4>
              <button
                type="button"
                onClick={() => setUserModal({ open: false, mode: 'add', data: null })}
                className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer"
              >
                close
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-ds-md">
              <div className="space-y-ds-base">
                <label className="text-label-md text-primary font-semibold block">Full Name</label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Sophia Carter"
                  defaultValue={userModal.data?.name || ''}
                  className="w-full h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md"
                  type="text"
                />
              </div>

              <div className="space-y-ds-base">
                <label className="text-label-md text-primary font-semibold block">Access Role</label>
                <select
                  name="role"
                  defaultValue={userModal.data?.isAdmin ? 'admin' : 'editor'}
                  className="w-full h-10 px-ds-md rounded-xl border border-[#E5E5E5] font-body-md text-body-md bg-white"
                >
                  <option value="editor">Editor (Standard Access)</option>
                  <option value="admin">Lead Photographer (Admin)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setUserModal({ open: false, mode: 'add', data: null })}
                  type="button"
                >
                  Cancel
                </Button>
                <Button type="submit">Grant Access</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
