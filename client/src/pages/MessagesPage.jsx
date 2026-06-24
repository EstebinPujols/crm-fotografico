import { useState, useEffect, useRef, useCallback } from 'react';
import messageService from '../services/messageService';
import { loadConversationsCache, saveConversationsCache, loadMessagesCache, saveMessagesCache, isCacheStale, clearMessagesCache } from '../utils/cache';

// ─── Formateo de teléfonos ───────────────────────────────────────────────────
function formatPhone(raw) {
  if (!raw) return 'Sin número';
  const cleaned = raw.replace(/[^0-9]/g, '');
  if (cleaned.length >= 13) {
    // LID sin resolver — mostrar identificador para que el usuario lo resuelva
    return `LID: ${cleaned.slice(0, 4)}…${cleaned.slice(-4)}`;
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
  // Formato genérico
  return `+${cleaned}`;
}

// ─── Icono de canal ──────────────────────────────────────────────────────────
function ChannelIcon({ channel }) {
  if (channel === 'whatsapp') {
    return (
      <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
        W
      </span>
    );
  }
  return (
    <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
      {channel?.[0]?.toUpperCase() || '?'}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendText, setSendText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('text'); // text | media
  const [mediaFile, setMediaFile] = useState(null);
  const [toPhone, setToPhone] = useState('');
  const [linkClientOpen, setLinkClientOpen] = useState(false);
  const [linkClientSearch, setLinkClientSearch] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [resolvingPhone, setResolvingPhone] = useState(null); // phone being resolved via inline input
  const [resolveInput, setResolveInput] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);
  const resolveInputRef = useRef(null);

  // ─── Cargar conversaciones ───────────────────────────────────────────────
  const loadConversations = useCallback(async (showLoading) => {
    try {
      if (showLoading) setLoading(true);
      // Intentar cargar de caché primero
      if (showLoading) {
        const cached = loadConversationsCache();
        if (cached && !isCacheStale()) {
          setConversations(cached);
        }
      }

      const res = await messageService.getConversations({ limit: 100 });
      const convs = res.data || [];
      setConversations(convs);
      saveConversationsCache(convs);
    } catch (err) {
      console.error('[MessagesPage] Error cargando conversaciones:', err);
      if (showLoading) setError('No se pudieron cargar las conversaciones');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // ─── Cargar mensajes de una conversación ──────────────────────────────────
  const loadMessages = useCallback(async (phone, showLoading) => {
    if (!phone) return;
    try {
      if (showLoading) setLoading(true);
      const cached = loadMessagesCache(phone);
      if (cached && !isCacheStale()) {
        setMessages(cached);
      }

      const msgs = await messageService.getByPhone(phone);
      setMessages(msgs);
      saveMessagesCache(phone, msgs);
    } catch (err) {
      console.error('[MessagesPage] Error cargando mensajes:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // ─── Inicializar ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadConversations(true);
  }, [loadConversations]);

  // ─── Seleccionar conversación ─────────────────────────────────────────────
  const handleSelectConversation = (conv) => {
    setSelectedPhone(conv.phone);
    setSelectedClient(conv.client_name ? conv.client_name : null);
    setResolvingPhone(null);
    setResolveInput('');
    setMessages([]);
    // Marcar como leída
    try { messageService.markAsRead(conv.phone); } catch (_) {}
    loadMessages(conv.phone, true);
  };

  // ─── Polling de mensajes cada 5s ─────────────────────────────────────────
  useEffect(() => {
    if (!selectedPhone) return;
    pollRef.current = setInterval(() => {
      loadMessages(selectedPhone, false);
      loadConversations(false);
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [selectedPhone, loadMessages, loadConversations]);

  // ─── Auto-scroll al último mensaje ────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Enfocar input de resolución ──────────────────────────────────────────
  useEffect(() => {
    if (resolvingPhone && resolveInputRef.current) {
      resolveInputRef.current.focus();
    }
  }, [resolvingPhone]);

  // ─── Enviar mensaje de texto ─────────────────────────────────────────────────
  const handleSendText = async (e) => {
    e.preventDefault();
    if (!sendText.trim() || !selectedPhone || sending) return;
    setSending(true);
    try {
      await messageService.send({
        phone: selectedPhone,
        message: sendText.trim(),
      });
      setSendText('');
      // Recargar mensajes inmediatamente
      await loadMessages(selectedPhone, false);
      await loadConversations(false);
    } catch (err) {
      console.error('[MessagesPage] Error enviando:', err);
    } finally {
      setSending(false);
    }
  };

  // ─── Enviar medio ─────────────────────────────────────────────────────────
  const handleSendMedia = async (e) => {
    e.preventDefault();
    if (!mediaFile || !toPhone || sending) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('file', mediaFile);
      formData.append('phone', toPhone);
      await messageService.sendMedia(formData);
      setMediaFile(null);
      setShowModal(false);
      if (toPhone === selectedPhone) {
        await loadMessages(selectedPhone, false);
      }
      await loadConversations(false);
    } catch (err) {
      console.error('[MessagesPage] Error enviando medio:', err);
    } finally {
      setSending(false);
    }
  };

  // ─── Vincular a cliente ───────────────────────────────────────────────────
  const handleLinkClient = async (clientId) => {
    if (!clientId || !selectedPhone) return;
    try {
      await messageService.linkClient(selectedPhone, clientId);
      setLinkClientOpen(false);
      setLinkClientSearch('');
      setClientSearchResults([]);
      await loadConversations(false);
      // Actualizar nombre del cliente en la conversación actual
      const found = clientSearchResults.find(c => c.id === clientId);
      if (found) {
        setSelectedClient(`${found.first_name || ''} ${found.last_name || ''}`.trim());
      }
    } catch (err) {
      console.error('[MessagesPage] Error vinculando:', err);
    }
  };

  const handleSearchClients = async (q) => {
    setLinkClientSearch(q);
    if (q.length < 2) { setClientSearchResults([]); return; }
    try {
      const { default: clientService } = await import('../services/clientService');
      const res = await clientService.getClients({ search: q, limit: 10 });
      setClientSearchResults(res.data || []);
    } catch (_) { setClientSearchResults([]); }
  };

  // ─── Resolver LID ─────────────────────────────────────────────────────────
  const handleStartResolve = () => {
    setResolveInput('');
    setResolvingPhone(selectedPhone);
  };

  const handleCancelResolve = () => {
    setResolvingPhone(null);
    setResolveInput('');
  };

  const handleConfirmResolve = async () => {
    const digits = resolveInput.replace(/[^0-9]/g, '');
    if (digits.length < 10) return;
    try {
      await messageService.resolveLid(resolvingPhone, digits);
      setResolvingPhone(null);
      setResolveInput('');
      // Recargar conversaciones para ver el cambio
      await loadConversations(true);
      setSelectedClient(null);
      // Recargar mensajes para la conversación fusionada
      if (selectedPhone) await loadMessages(selectedPhone, false);
    } catch (err) {
      console.error('[MessagesPage] Error resolviendo LID:', err);
    }
  };

  const handleResolveKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirmResolve();
    if (e.key === 'Escape') handleCancelResolve();
  };

  // ─── Formatear hora ──────────────────────────────────────────────────────
  function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800000) return 'ayer';
    return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
  }

  // ─── Renderizar media en mensaje ─────────────────────────────────────────
  function renderMedia(msg) {
    if (!msg.media) return null;
    const { url, mime, type } = msg.media;
    const fullUrl = url?.startsWith('http') ? url : (url ? `/uploads/${type || 'images'}/${url.split('/').pop()}` : null);
    if (!fullUrl) return null;

    if (type === 'image') {
      return (
        <div className="mt-1.5 max-w-[300px] rounded-lg overflow-hidden border border-gray-700/50">
          <img
            src={fullUrl}
            alt=""
            className="w-full h-auto max-h-[300px] object-cover"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '';
              e.target.alt = '[Imagen no disponible]';
              e.target.className = 'w-full h-24 flex items-center justify-center bg-gray-800 text-gray-400 text-sm';
            }}
          />
        </div>
      );
    }
    if (type === 'audio') {
      return (
        <div className="mt-1.5 max-w-[250px]">
          <audio controls src={fullUrl} className="w-full h-10" preload="none" />
        </div>
      );
    }
    if (type === 'video') {
      return (
        <div className="mt-1.5 max-w-[300px] rounded-lg overflow-hidden border border-gray-700/50">
          <video controls src={fullUrl} className="w-full max-h-[300px]" preload="metadata" />
        </div>
      );
    }
    if (type === 'document') {
      const { filename } = msg.media;
      return (
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors text-sm max-w-[300px]"
        >
          <span className="text-blue-400 text-lg">📄</span>
          <span className="truncate text-gray-200">{filename || 'Documento'}</span>
          <span className="text-gray-400 text-xs ml-auto shrink-0">↓</span>
        </a>
      );
    }
    return (
      <div className="mt-1.5 text-xs text-gray-400">[Archivo: {type || 'desconocido'}]</div>
    );
  }

  // ─── Sidebar: Lista de conversaciones ──────────────────────────────────────
  function ConversationSidebar() {
    const filtered = search
      ? conversations.filter(c =>
          (c.client_name && c.client_name.toLowerCase().includes(search.toLowerCase())) ||
          c.phone.includes(search)
        )
      : conversations;

    return (
      <div className="w-80 lg:w-96 border-r border-gray-700/50 flex flex-col bg-gray-900">
        {/* Header */}
        <div className="p-3 border-b border-gray-700/50">
          <h2 className="text-lg font-semibold text-white mb-2">Mensajes</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-800 text-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm border border-gray-700/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors placeholder:text-gray-500"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filtered.map((conv) => {
            const isSelected = conv.phone === selectedPhone;
            const name = conv.client_name || formatPhone(conv.phone);
            const isLid = conv.phone?.replace(/[^0-9]/g, '').length >= 13;
            return (
              <button
                key={conv.phone}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full text-left px-3 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${
                  isSelected ? 'bg-blue-900/30 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      isLid ? 'bg-amber-800/60 text-amber-300' : 'bg-blue-800/60 text-blue-300'
                    }`}>
                      {isLid ? '⚠' : (conv.client_name ? (
                        conv.client_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                      ) : '?')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-200 truncate">{name}</span>
                      <span className="text-[11px] text-gray-500 shrink-0">{formatTime(conv.last_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-xs truncate ${conv.unread_count > 0 ? 'text-gray-300 font-medium' : 'text-gray-500'}`}>
                        {conv.last_message || (conv.has_media ? '[Medio]' : '')}{' '}
                      </span>
                      {conv.message_count > 1 && (
                        <span className="text-[10px] text-gray-600 shrink-0">({conv.message_count})</span>
                      )}
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold mt-1">
                        {conv.unread_count > 99 ? '99+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && !loading && (
            <div className="p-6 text-center text-gray-500 text-sm">
              {search ? 'Sin resultados' : 'No hay conversaciones'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Panel principal: Mensajes ─────────────────────────────────────────────
  function MessagesPanel() {
    if (!selectedPhone) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-500">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium">Selecciona una conversación</p>
            <p className="text-sm mt-1">Elige una conversación de la lista para ver los mensajes</p>
          </div>
        </div>
      );
    }

    const isLid = selectedPhone?.replace(/[^0-9]/g, '').length >= 13;
    const headerName = selectedClient || formatPhone(selectedPhone);

    return (
      <div className="flex-1 flex flex-col bg-gray-900 min-w-0">
        {/* Header de la conversación */}
        <div className="px-4 py-3 border-b border-gray-700/50 bg-gray-900/95 backdrop-blur flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              isLid ? 'bg-amber-800/60 text-amber-300' : 'bg-blue-800/60 text-blue-300'
            }`}>
              {isLid ? '⚠' : (selectedClient ? (
                selectedClient.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              ) : '?')}
            </div>
            <div className="min-w-0">
              {/* Nombre / Número / Resolución LID */}
              {resolvingPhone === selectedPhone ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={resolveInputRef}
                    type="text"
                    placeholder="Ej: 8099815190"
                    value={resolveInput}
                    onChange={(e) => setResolveInput(e.target.value)}
                    onKeyDown={handleResolveKeyDown}
                    className="w-40 bg-gray-800 text-gray-200 rounded px-2 py-1 text-sm border border-amber-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none placeholder:text-gray-500"
                  />
                  <button
                    onClick={handleConfirmResolve}
                    disabled={resolveInput.replace(/[^0-9]/g, '').length < 10}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs rounded transition-colors"
                  >
                    ✓
                  </button>
                  <button
                    onClick={handleCancelResolve}
                    className="px-2 py-1 text-gray-400 hover:text-gray-200 text-xs transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-100 truncate text-sm">{headerName}</span>
                  {isLid && (
                    <button
                      onClick={handleStartResolve}
                      title="Resolver LID a número de teléfono"
                      className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-800/60 text-amber-300 rounded hover:bg-amber-700/60 transition-colors shrink-0"
                    >
                      ✏️ Resolver
                    </button>
                  )}
                </div>
              )}
              <span className="text-xs text-gray-500">{selectedPhone}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLinkClientOpen(!linkClientOpen)}
              className="px-2.5 py-1.5 text-xs bg-blue-800/40 hover:bg-blue-700/40 text-blue-300 rounded transition-colors"
              title="Vincular a cliente"
            >
              👤 Cliente
            </button>
          </div>
        </div>

        {/* Búsqueda de clientes (inline) */}
        {linkClientOpen && (
          <div className="px-4 py-2 border-b border-gray-700/50 bg-gray-850">
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={linkClientSearch}
              onChange={(e) => handleSearchClients(e.target.value)}
              className="w-full bg-gray-800 text-gray-200 rounded px-3 py-1.5 text-sm border border-gray-700/50 focus:border-blue-500 outline-none"
            />
            {clientSearchResults.length > 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto">
                {clientSearchResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleLinkClient(c.id)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded transition-colors"
                  >
                    {c.first_name} {c.last_name}
                    {c.phone ? <span className="text-gray-500 ml-2">{c.phone}</span> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'saliente' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 ${
                  msg.direction === 'saliente'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-800 text-gray-200 rounded-bl-md'
                }`}
              >
                {msg.message && (
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                )}
                {renderMedia(msg)}
                <div className={`flex items-center justify-end gap-1 mt-1 ${
                  msg.direction === 'saliente' ? 'text-blue-200' : 'text-gray-500'
                }`}>
                  <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                  {msg.direction === 'saliente' && (
                    <svg className="w-3 h-3" viewBox="0 0 16 11" fill="currentColor">
                      <path d="M11.071.653a.457.457 0 00-.304-.102H6.232a.457.457 0 00-.406.253L4.84 3.31l.914.558.812-1.99h2.201c.14 0 .267.068.346.184l1.41 2.074a.457.457 0 00.384.205h1.675c.175 0 .293-.17.232-.335l-1.84-4.8a.457.457 0 00-.34-.297l-.17-.032.007.676z" />
                      <path d="M12.083 5.002H10.42a.457.457 0 00-.384.205l-1.41 2.074a.457.457 0 01-.384.205H6.04a.457.457 0 01-.384-.205l-1.41-2.074a.457.457 0 00-.384-.205H2.457a.457.457 0 00-.457.457v2.156c0 .152.076.294.202.38l2.192 1.52a.457.457 0 00.255.079h7.268a.457.457 0 00.255-.079l2.192-1.52a.457.457 0 00.202-.38V5.459a.457.457 0 00-.457-.457h-.026z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
          {messages.length === 0 && !loading && (
            <div className="text-center text-gray-500 text-sm py-8">
              No hay mensajes en esta conversación
            </div>
          )}
        </div>

        {/* Input de envío */}
        <form onSubmit={handleSendText} className="p-3 border-t border-gray-700/50 bg-gray-900/95 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-gray-200 transition-colors shrink-0"
              title="Adjuntar archivo"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setMediaFile(file);
                  setToPhone(selectedPhone);
                  setModalType('media');
                  setShowModal(true);
                  e.target.value = '';
                }
              }}
            />
            <input
              type="text"
              value={sendText}
              onChange={(e) => setSendText(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-gray-800 text-gray-200 rounded-full px-4 py-2 text-sm border border-gray-700/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors placeholder:text-gray-500"
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) handleSendText(e);
              }}
            />
            <button
              type="submit"
              disabled={!sendText.trim() || sending}
              className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-full transition-colors shrink-0 disabled:text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ─── Modal de envío de media ──────────────────────────────────────────────
  function MediaModal() {
    if (!showModal) return null;
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
        <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700/50" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-semibold text-white mb-4">
            {modalType === 'media' ? 'Enviar archivo' : 'Enviar mensaje'}
          </h3>
          <form onSubmit={handleSendMedia}>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Número de teléfono</label>
                <input
                  type="text"
                  value={toPhone}
                  onChange={(e) => setToPhone(e.target.value)}
                  className="w-full bg-gray-800 text-gray-200 rounded px-3 py-2 text-sm border border-gray-700/50 focus:border-blue-500 outline-none"
                  placeholder="Ej: 18298595480"
                />
              </div>
              {mediaFile && (
                <div className="text-sm text-gray-400">
                  Archivo: {mediaFile.name} ({(mediaFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!mediaFile || !toPhone || sending}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
              >
                {sending ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ─── Render principal ─────────────────────────────────────────────────────
  if (loading && conversations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Cargando conversaciones…</p>
        </div>
      </div>
    );
  }

  if (error && conversations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <button
            onClick={() => loadConversations(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-900">
      <ConversationSidebar />
      <MessagesPanel />
      <MediaModal />
    </div>
  );
}
