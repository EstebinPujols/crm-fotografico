import { useState } from 'react';
import Button from '../components/Button';

const DEMO_CONVERSATIONS = [
  { id: 1, name: 'Maria Gomez', initials: 'MG', lastMessage: '¡Las fotos de la boda son increíbles! Gracias 🙌', time: '2m ago', unread: 2, online: true, channel: 'whatsapp' },
  { id: 2, name: 'Carlos Méndez', initials: 'CM', lastMessage: '¿Para cuándo estaría lista la galería de graduación?', time: '1h ago', unread: 0, online: false, channel: 'email' },
  { id: 3, name: 'Ana Rodríguez', initials: 'AR', lastMessage: 'Perfecto, el sábado a las 10am en la iglesia.', time: '3h ago', unread: 1, online: true, channel: 'whatsapp' },
  { id: 4, name: 'David K.', initials: 'DK', lastMessage: 'Hola, quería saber si hacen sesiones de retratos profesionales.', time: '5h ago', unread: 0, online: false, channel: 'whatsapp' },
  { id: 5, name: 'TechConf RD', initials: 'TC', lastMessage: 'Cobertura confirmada para el evento del 28 de Junio.', time: '1d ago', unread: 0, online: false, channel: 'email' },
];

const DEMO_MESSAGES = [
  { id: 1, from: 'them', text: '¡Hola! Solo quería agradecerles por el trabajo en la boda.', time: '10:23 AM' },
  { id: 2, from: 'them', text: 'Las fotos quedaron espectaculares, toda la familia está encantada 🙌', time: '10:24 AM' },
  { id: 3, from: 'me', text: '¡Muchas gracias! Fue un placer ser parte de su día especial 🎉', time: '10:26 AM' },
  { id: 4, from: 'me', text: 'Ya subí todas las fotos a su galería privada.', time: '10:27 AM' },
  { id: 5, from: 'them', text: '¿Se pueden pedir impresiones adicionales?', time: '10:31 AM' },
  { id: 6, from: 'me', text: '¡Claro! Te envío el catálogo de impresiones por este medio.', time: '10:33 AM' },
  { id: 7, from: 'them', text: '¡Las fotos de la boda son increíbles! Gracias 🙌', time: '10:36 AM' },
];

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mobileView, setMobileView] = useState('list');
  const [newMessage, setNewMessage] = useState('');

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const selected = conversations.find((c) => c.id === selectedId);

  const loadDemoData = () => {
    setConversations(DEMO_CONVERSATIONS);
    setSelectedId(DEMO_CONVERSATIONS[0].id);
  };
  const clearData = () => { setConversations([]); setSelectedId(null); };

  // --- Empty state ---
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center flex-1 min-h-[60vh]">
        <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-4 border border-[#E5E5E5]">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant">chat</span>
        </div>
        <h3 className="text-headline-md font-semibold text-primary mb-1">Bandeja vacía</h3>
        <p className="text-body-md text-on-surface-variant max-w-sm mb-6">
          Aún no tienes conversaciones. Cuando tus clientes te escriban por WhatsApp o email,
          los mensajes aparecerán aquí.
        </p>
        <Button onClick={loadDemoData}>
          <span className="material-symbols-outlined text-[18px]">preview</span>
          Cargar datos de demostración
        </Button>
      </div>
    );
  }

  // --- Vista con datos ---
  return (
    <div className="flex flex-col h-full">
      {/* Encabezado compacto */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">chat</span>
          <h2 className="text-headline-md font-bold text-primary tracking-tight">Mensajes</h2>
          <span className="text-body-md text-on-surface-variant ml-1">· {conversations.length} conversaciones</span>
        </div>
        <Button variant="secondary" onClick={clearData}>
          <span className="material-symbols-outlined text-[16px]">inbox</span>
          Mostrar vacío
        </Button>
      </div>

      {/* Panel de chat: flex-1 para que ocupe todo el espacio disponible */}
      <div className="flex flex-1 min-h-0 bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
        {/* Sidebar: lista */}
        <div className={`flex flex-col w-full md:w-72 lg:w-80 border-r border-[#E5E5E5] bg-white ${isMobile && mobileView === 'chat' ? 'hidden' : 'flex'} md:flex`}>
          {/* Búsqueda */}
          <div className="p-3 border-b border-[#E5E5E5]">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
              <input type="text" placeholder="Buscar conversación…" className="w-full h-9 pl-10 pr-3 rounded-xl border border-[#E5E5E5] bg-[#f5f5f5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b] focus:bg-white" />
            </div>
          </div>
          {/* Lista */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E5E5]">
            {conversations.map((conv) => (
              <button key={conv.id} onClick={() => { setSelectedId(conv.id); if (isMobile) setMobileView('chat'); }}
                className={`w-full text-left p-3 flex items-center gap-3 transition-all hover:bg-[#f9f9f9] cursor-pointer ${selectedId === conv.id ? 'bg-[#fed65b]/10' : ''}`}>
                <div className="relative flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${conv.channel === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {conv.initials}
                  </div>
                  {conv.online && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="text-label-md font-semibold text-primary truncate">{conv.name}</p>
                    <span className="text-[11px] text-on-surface-variant flex-shrink-0 ml-2">{conv.time}</span>
                  </div>
                  <p className="text-body-md text-on-surface-variant truncate mt-0.5">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-[#735c00] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{conv.unread}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Panel de conversación activa */}
        <div className={`flex flex-col flex-1 min-w-0 bg-white ${isMobile && mobileView === 'list' ? 'hidden' : 'flex'} md:flex`}>
          {selected ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E5E5] bg-white shrink-0">
                {isMobile && (
                  <button onClick={() => setMobileView('list')} className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer">arrow_back</button>
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${selected.channel === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {selected.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-label-md font-semibold text-primary truncate">{selected.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${selected.channel === 'whatsapp' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      <span className="material-symbols-outlined text-[11px]">{selected.channel === 'whatsapp' ? 'chat' : 'mail'}</span>
                      {selected.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                    </span>
                    <span className={`text-[11px] ${selected.online ? 'text-green-600' : 'text-on-surface-variant'}`}>
                      · {selected.online ? 'En línea' : 'Desconectado'}
                    </span>
                  </div>
                </div>
              </div>
              {/* Mensajes: scrollarea flexible */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#f9f9f9]">
                {DEMO_MESSAGES.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${msg.from === 'me' ? 'bg-[#735c00] text-white rounded-br-md' : 'bg-white border border-[#E5E5E5] rounded-bl-md'}`}>
                      <p>{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${msg.from === 'me' ? 'text-white/70' : 'text-on-surface-variant'}`}>{msg.time}</p>
                    </div>
                  </div>
                ))}
                <div className="flex justify-start">
                  <div className="bg-white border border-[#E5E5E5] px-3 py-2 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
              {/* Input */}
              <form onSubmit={(e) => { e.preventDefault(); if (newMessage.trim()) { console.log('📤', newMessage); setNewMessage(''); } }} className="px-4 py-3 border-t border-[#E5E5E5] bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <button type="button" className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer">attach_file</button>
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Escribe un mensaje…" className="flex-1 h-10 px-4 rounded-xl border border-[#E5E5E5] bg-[#f5f5f5] text-sm focus:outline-none focus:ring-2 focus:ring-[#fed65b] focus:bg-white" />
                  <button type="submit" disabled={!newMessage.trim()} className="w-9 h-9 rounded-full bg-[#735c00] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#5a4800] transition-all cursor-pointer">
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant">
              <div className="text-center">
                <span className="material-symbols-outlined text-4xl mb-2">chat</span>
                <p className="text-sm">Selecciona una conversación</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
