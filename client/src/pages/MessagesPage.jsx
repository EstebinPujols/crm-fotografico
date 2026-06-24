import { useState, useEffect, useRef, useCallback } from 'react';
import Button from '../components/Button';
import messageService from '../services/messageService';
import { loadConversationsCache, saveConversationsCache, loadMessagesCache, saveMessagesCache, isCacheStale } from '../utils/cache';

// ─── Formateo de teléfonos ───────────────────────────────────────────────────
function formatPhone(raw) {
  if (!raw) return 'Sin número';
  const cleaned = raw.replace(/[^0-9]/g, '');
  if (cleaned.length >= 13) {
    return `ID: ${cleaned.slice(0, 4)}…${cleaned.slice(-4)}`;
  }
  if (cleaned.length === 12) {
    return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 11) {
    return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return `+${cleaned}`;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
}

// ─── Media renderer ──────────────────────────────────────────────────────────
function MediaBlock({ media }) {
  if (!media?.url) return null;
  const fullUrl = media.url?.startsWith('http') ? media.url : media.url;

  if (media.type === 'image') {
    return (
      <div className="mt-1.5 max-w-[280px] rounded-lg overflow-hidden border border-[#E5E5E5]">
        <img src={fullUrl} alt="" className="w-full h-auto max-h-[280px] object-cover" loading="lazy"
          onError={(e) => { e.target.style.display = 'none'; }} />
      </div>
    );
  }
  if (media.type === 'audio') {
    return <audio controls src={fullUrl} className="mt-1.5 w-full max-w-[220px] h-9" preload="none" />;
  }
  if (media.type === 'video') {
    return (
      <div className="mt-1.5 max-w-[280px] rounded-lg overflow-hidden border border-[#E5E5E5]">
        <video controls src={fullUrl} className="w-full max-h-[280px]" preload="metadata" />
      </div>
    );
  }
  if (media.type === 'document') {
    return (
      <a href={fullUrl} target="_blank" rel="noopener noreferrer"
        className="mt-1.5 flex items-center gap-2 px-3 py-2 bg-[#f5f5f5] rounded-lg hover:bg-[#eee] transition-colors text-sm max-w-[280px] border border-[#E5E5E5]">
        <span className="text-blue-500 text-lg">📄</span>
        <span className="truncate text-on-surface-variant">{media.filename || 'Documento'}</span>
        <span className="text-gray-400 text-xs ml-auto">↓</span>
      </a>
    );
  }
  return <div className="mt-1 text-xs text-on-surface-variant">[Archivo]</div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Página principal
// ═══════════════════════════════════════════════════════════════════════════════
export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [search, setSearch] = useState('');
  const [sendText, setSendText] = useState('');
  const [sending, setSending] = useState(false);
  const [linkClientOpen, setLinkClientOpen] = useState(false);
  const [linkClientSearch, setLinkClientSearch] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [resolving, setResolving] = useState(null); // phone being resolved
  const [resolveInput, setResolveInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const messagesEnd = useRef(null);
  const fileRef = useRef(null);
  const resolveRef = useRef(null);

  // ─── Cargar conversaciones ───────────────────────────────────────────────
  const loadConvs = useCallback(async (showLoad) => {
    try {
      if (showLoad) setLoading(true);
      const cached = loadConversationsCache();
      if (cached && !isCacheStale() && showLoad) setConversations(cached);

      const res = await messageService.getConversations({ limit: 100 });
      const convs = res.data || [];
      setConversations(convs);
      saveConversationsCache(convs);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoad) setLoading(false);
    }
  }, []);

  useEffect(() => { loadConvs(true); }, [loadConvs]);

  // ─── Cargar mensajes ────────────────────────────────────────────────────
  const loadMsgs = useCallback(async (phone) => {
    if (!phone) return;
    try {
      const cached = loadMessagesCache(phone);
      if (cached && !isCacheStale()) setMessages(cached);

      const msgs = await messageService.getByPhone(phone);
      setMessages(msgs);
      saveMessagesCache(phone, msgs);
    } catch (e) { console.error(e); }
  }, []);

  // ─── Seleccionar conversación ────────────────────────────────────────────
  const handleSelect = (conv) => {
    setSelectedPhone(conv.phone);
    setMessages([]);
    setResolving(null);
    setResolveInput('');
    setLinkClientOpen(false);
    try { messageService.markAsRead(conv.phone); } catch (_) {}
    loadMsgs(conv.phone);
  };

  // ─── Polling ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPhone) return;
    const id = setInterval(() => {
      loadMsgs(selectedPhone);
      loadConvs(false);
    }, 5000);
    return () => clearInterval(id);
  }, [selectedPhone, loadMsgs, loadConvs]);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (resolving && resolveRef.current) resolveRef.current.focus(); }, [resolving]);

  // ─── Enviar texto ───────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    if (!sendText.trim() || !selectedPhone || sending) return;
    setSending(true);
    try {
      await messageService.send({ phone: selectedPhone, message: sendText.trim() });
      setSendText('');
      await loadMsgs(selectedPhone);
      await loadConvs(false);
    } catch (e) { console.error(e); } finally { setSending(false); }
  };

  // ─── Buscar clientes para vincular ───────────────────────────────────────
  const searchClients = async (q) => {
    setLinkClientSearch(q);
    if (q.length < 2) { setClientResults([]); return; }
    try {
      const { default: cs } = await import('../services/clientService');
      const res = await cs.getClients({ search: q, limit: 10 });
      setClientResults(res.data || []);
    } catch (_) { setClientResults([]); }
  };

  const handleLink = async (clientId) => {
    try {
      await messageService.linkClient(selectedPhone, clientId);
      setLinkClientOpen(false);
      setLinkClientSearch('');
      setClientResults([]);
      await loadConvs(false);
    } catch (e) { console.error(e); }
  };

  // ─── Resolver LID ───────────────────────────────────────────────────────
  const handleResolve = async () => {
    const digits = resolveInput.replace(/[^0-9]/g, '');
    if (digits.length < 10) return;
    try {
      await messageService.resolveLid(resolving, digits);
      setResolving(null);
      setResolveInput('');
      await loadConvs(true);
      if (selectedPhone) await loadMsgs(selectedPhone);
    } catch (e) { console.error(e); }
  };

  // ─── Eliminar conversación ──────────────────────────────────────────────
  const handleDeleteConv = async () => {
    if (!confirmDelete) return;
    try {
      await messageService.deleteConversation(confirmDelete);
      setConfirmDelete(null);
      if (selectedPhone === confirmDelete) setSelectedPhone(null);
      await loadConvs(true);
    } catch (e) { console.error(e); }
  };

  // ─── Crear cliente desde número ─────────────────────────────────────────
  const handleCreateClient = async () => {
    if (!selectedPhone) return;
    try {
      await messageService.createClient({ phone: selectedPhone });
      await loadConvs(true);
    } catch (e) { console.error(e); }
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  Render
  // ══════════════════════════════════════════════════════════════════════════

  // ─── Sidebar: lista de conversaciones ────────────────────────────────────
  function ConvSidebar() {
    const filtered = search
      ? conversations.filter(c => (c.client_name && c.client_name.toLowerCase().includes(search.toLowerCase())) || c.phone.includes(search))
      : conversations;

    return (
      <div className="w-80 shrink-0 border-r border-[#E5E5E5] flex flex-col bg-white">
        <div className="p-3 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-secondary text-xl">chat</span>
            <h3 className="text-headline-md font-bold text-primary tracking-tight">Mensajes</h3>
            <span className="text-body-md text-on-surface-variant ml-1">· {conversations.length}</span>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversación…"
              className="w-full h-9 pl-10 pr-3 rounded-xl border border-[#E5E5E5] bg-[#f5f5f5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b] focus:bg-white"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {filtered.map(conv => {
            const sel = conv.phone === selectedPhone;
            const name = conv.client_name || formatPhone(conv.phone);
            const isLid = conv.phone?.replace(/[^0-9]/g, '').length >= 13 && !conv.client_name;
            const unread = conv.unread_count || 0;
            return (
              <button key={conv.phone} onClick={() => handleSelect(conv)}
                className={`w-full text-left px-3 py-3 border-b border-[#E5E5E5] transition-colors ${sel ? 'bg-[#fed65b]/10 border-l-2 border-l-[#735c00]' : 'hover:bg-[#f5f5f5]'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isLid ? 'bg-amber-100 text-amber-700' : 'bg-[#fed65b]/30 text-[#735c00]'}`}>
                    {isLid ? '⚠' : (conv.client_name ? conv.client_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${unread > 0 ? 'font-semibold text-primary' : 'text-primary'}`}>{name}</span>
                      <span className="text-[11px] text-on-surface-variant shrink-0">{formatTime(conv.last_at)}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant truncate mt-0.5">
                      {conv.last_message || (conv.has_media ? '[Medio]' : '')}
                    </p>
                    {unread > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#735c00] text-white text-[10px] font-bold mt-1">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && !loading && (
            <div className="p-6 text-center text-on-surface-variant text-sm">{search ? 'Sin resultados' : 'No hay conversaciones'}</div>
          )}
        </div>
      </div>
    );
  }

  // ─── Panel de mensajes ──────────────────────────────────────────────────
  function MsgPanel() {
    if (!selectedPhone) {
      return (
        <div className="flex-1 flex items-center justify-center bg-surface">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl text-[#E5E5E5] block mb-4">chat</span>
            <p className="text-lg font-medium text-on-surface-variant">Selecciona una conversación</p>
          </div>
        </div>
      );
    }

    const isLid = selectedPhone.replace(/[^0-9]/g, '').length >= 13;
    const conv = conversations.find(c => c.phone === selectedPhone);
    const headerName = conv?.client_name || formatPhone(selectedPhone);

    return (
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#E5E5E5] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isLid ? 'bg-amber-100 text-amber-700' : 'bg-[#fed65b]/30 text-[#735c00]'}`}>
              {isLid && !conv?.client_name ? '⚠' : (conv?.client_name ? conv.client_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?')}
            </div>
            <div className="min-w-0">
              {resolving === selectedPhone ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={resolveRef}
                    type="text"
                    placeholder="Ej: 8099815190"
                    value={resolveInput}
                    onChange={e => setResolveInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleResolve(); if (e.key === 'Escape') { setResolving(null); setResolveInput(''); } }}
                    className="w-36 h-8 px-2 rounded-lg border border-[#fed65b] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]"
                  />
                  <button onClick={handleResolve} disabled={resolveInput.replace(/[^0-9]/g, '').length < 10}
                    className="w-7 h-7 flex items-center justify-center bg-[#735c00] text-white rounded-lg text-xs hover:brightness-110 disabled:opacity-40 transition-all">✓</button>
                  <button onClick={() => { setResolving(null); setResolveInput(''); }}
                    className="text-on-surface-variant hover:text-primary text-sm">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary text-sm truncate">{headerName}</span>
                  {isLid && !conv?.client_name && (
                    <button onClick={() => { setResolving(selectedPhone); setResolveInput(''); }}
                      className="px-2 py-0.5 text-[10px] font-bold bg-[#fed65b]/40 text-[#735c00] rounded hover:bg-[#fed65b]/60 transition-colors shrink-0">
                      ✏️ Resolver
                    </button>
                  )}
                </div>
              )}
              <div className="text-[11px] text-on-surface-variant">{selectedPhone}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setConfirmDelete(selectedPhone)}
              className="px-2 py-1.5 text-xs text-on-surface-variant hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">delete</span>
            </button>
            {!conv?.client_name && (
              <button onClick={handleCreateClient}
                className="px-2 py-1.5 text-xs text-on-surface-variant hover:text-[#735c00] hover:bg-[#fed65b]/20 rounded-lg transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">person_add</span>
              </button>
            )}
            <button onClick={() => setLinkClientOpen(!linkClientOpen)}
              className="px-3 py-1.5 text-xs bg-[#f5f5f5] border border-[#E5E5E5] text-on-surface-variant rounded-xl hover:bg-[#eee] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">link</span>
              Cliente
            </button>
          </div>
        </div>

        {/* Link client */}
        {linkClientOpen && (
          <div className="px-4 py-2 border-b border-[#E5E5E5] bg-[#fafafa]">
            <input value={linkClientSearch} onChange={e => searchClients(e.target.value)}
              placeholder="Buscar cliente…"
              className="w-full h-9 px-3 rounded-xl border border-[#E5E5E5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b]" />
            {clientResults.length > 0 && (
              <div className="mt-1 max-h-36 overflow-y-auto border border-[#E5E5E5] rounded-lg bg-white">
                {clientResults.map(c => (
                  <button key={c.id} onClick={() => handleLink(c.id)}
                    className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-[#f5f5f5] transition-colors">
                    {c.first_name} {c.last_name}
                    {c.phone && <span className="text-on-surface-variant ml-2 text-xs">{c.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0 bg-[#f5f5f5]">
          {messages.map(msg => {
            const out = msg.direction === 'saliente';
            return (
              <div key={msg.id} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] sm:max-w-[65%] rounded-2xl px-3.5 py-2 shadow-sm ${out ? 'bg-[#D4AF37]/15 text-primary rounded-br-md' : 'bg-white text-primary rounded-bl-md border border-[#E5E5E5]'}`}>
                  {msg.message && <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>}
                  <MediaBlock media={msg.media} />
                  <div className={`flex items-center justify-end gap-1 mt-1 ${out ? 'text-[#735c00]/60' : 'text-on-surface-variant'}`}>
                    <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                    {out && <span className="text-[10px]">✓✓</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEnd} />
          {messages.length === 0 && <p className="text-center text-on-surface-variant text-sm py-8">No hay mensajes</p>}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-[#E5E5E5] bg-white shrink-0">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="p-2 text-on-surface-variant hover:text-primary transition-colors shrink-0">
              <span className="material-symbols-outlined text-xl">attach_file</span>
            </button>
            <input type="file" ref={fileRef} className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  // Send via modal
                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('phone', selectedPhone);
                  setSending(true);
                  messageService.sendMedia(formData).then(() => {
                    loadMsgs(selectedPhone);
                    loadConvs(false);
                  }).catch(console.error).finally(() => setSending(false));
                  e.target.value = '';
                }
              }} />
            <input value={sendText} onChange={e => setSendText(e.target.value)}
              placeholder="Escribe un mensaje…"
              className="flex-1 h-10 px-4 rounded-xl border border-[#E5E5E5] bg-[#f5f5f5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b] focus:bg-white placeholder:text-on-surface-variant"
              disabled={sending} />
            <button type="submit" disabled={!sendText.trim() || sending}
              className="w-10 h-10 flex items-center justify-center bg-[#D4AF37] hover:brightness-110 disabled:opacity-40 text-black rounded-xl transition-all shrink-0 active:scale-95">
              <span className="material-symbols-outlined text-xl">send</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ─── Loading / Error ────────────────────────────────────────────────────
  if (loading && conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="material-symbols-outlined animate-spin text-3xl text-on-surface-variant mb-3">sync</span>
        <p className="text-sm text-on-surface-variant">Cargando conversaciones…</p>
      </div>
    );
  }

  // ─── Confirmación de borrado ────────────────────────────────────────────
  function DeleteConfirm() {
    if (!confirmDelete) return null;
    const name = conversations.find(c => c.phone === confirmDelete)?.client_name || formatPhone(confirmDelete);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setConfirmDelete(null)}>
        <div className="bg-white rounded-xl shadow-xl border border-[#E5E5E5] p-5 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-red-500 text-2xl">warning</span>
            <h4 className="font-bold text-primary text-lg">Eliminar conversación</h4>
          </div>
          <p className="text-sm text-on-surface-variant mb-4">
            ¿Eliminar todos los mensajes con <strong className="text-primary">{name}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 text-sm bg-[#f5f5f5] border border-[#E5E5E5] rounded-xl hover:bg-[#eee] transition-colors">
              Cancelar
            </button>
            <button onClick={handleDeleteConv}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DeleteConfirm />
      <div className="flex h-[calc(100vh-5rem)] overflow-hidden bg-surface rounded-xl border border-[#E5E5E5]">
      <ConvSidebar />
      <MsgPanel />
    </div>
    </>
  );
}
