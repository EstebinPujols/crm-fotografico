import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getSession } from '../services/authService';
import messageService from '../services/messageService';

export default function Layout({ children }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Home', path: '/', icon: 'home' },
    { name: 'Galerías', path: '/galleries', icon: 'photo_library' },
    { name: 'Clientes', path: '/clientes', icon: 'group' },
    { name: 'Messages', path: '/messages', icon: 'mail' },
    { name: 'Calendar', path: '/calendar', icon: 'calendar_today' },
    { name: 'Settings', path: '/settings', icon: 'settings' },
  ];

  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Cargar usuario autenticado al montar el componente
  useEffect(() => {
    async function loadUser() {
      try {
        const { session } = await getSession();
        if (session?.user) {
          setUser(session.user);
        }
      } catch (e) {
        console.warn('No se pudo cargar el usuario:', e.message);
      }
    }
    loadUser();
  }, []);

  // Polling de mensajes no leídos
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const stats = await messageService.getStats();
        setUnreadCount(stats.unread || 0);
      } catch (_) {}
    };
    fetchUnread();
    const id = setInterval(fetchUnread, 15000);
    return () => clearInterval(id);
  }, []);

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/home';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f9f9f9]">
      {/* Mobile TopAppBar */}
      <header className="md:hidden bg-white border-b border-[#E5E5E5] flex justify-between items-center w-full px-ds-margin-mobile py-ds-sm fixed top-0 left-0 z-50 h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:bg-surface-container-low p-1 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? 'close' : 'menu'}
          </button>
          <h1 className="font-bold text-2xl text-[#735c00]">PhotoCRM</h1>
        </div>
        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border border-[#E5E5E5] text-on-surface-variant">
          <span className="material-symbols-outlined text-sm">person</span>
        </div>
      </header>

      {/* Mobile Sidebar overlay menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="w-64 h-full bg-white border-r border-[#E5E5E5] pt-20 px-4 space-y-2 animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active
                      ? 'bg-secondary-container/10 text-secondary font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
                    }`}
                >
                  <span className="relative">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {item.icon}
                    </span>
                    {item.name === 'Messages' && unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="font-label-md">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] bg-white border-r border-[#E5E5E5] h-screen sticky top-0 py-ds-lg px-ds-md justify-between select-none">
        <div className="space-y-ds-lg">
          <div className="flex items-center gap-3 px-ds-xs mb-ds-xl">
            <span className="material-symbols-outlined text-secondary text-3xl">photo_camera</span>
            <span className="text-xl font-bold text-[#735c00]">PhotoCRM</span>
          </div>

          <nav className="space-y-ds-xs">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-ds-md py-3 rounded-xl transition-all duration-200 active:scale-[0.98] ${active
                      ? 'bg-[#fed65b]/20 text-[#735c00] font-semibold border-l-4 border-[#735c00] rounded-l-none'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
                    }`}
                >
                  <span className="relative">
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {item.icon}
                    </span>
                    {item.name === 'Messages' && unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="font-label-md text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile section in desktop sidebar */}
        <div className="flex items-center gap-3 p-2 bg-[#F5F5F5] rounded-xl border border-[#E5E5E5]">
          <div className="min-w-0 flex-1">
            <p className="font-label-md text-xs font-semibold text-primary truncate">
              {user?.name || 'Usuario'}
            </p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-sm cursor-pointer hover:text-primary">logout</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-hidden pt-20 md:pt-10 px-ds-margin-mobile md:px-ds-margin-desktop">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-ds-xs py-ds-base pb-safe bg-white border-t border-[#E5E5E5] z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-2 transition-all active:scale-90 duration-200 ${active
                    ? 'text-[#735c00] bg-secondary-container/10 rounded-xl'
                    : 'text-on-surface-variant hover:text-primary'
                  }`}
              >
                <span className="relative">
                  <span
                    className="material-symbols-outlined text-[24px]"
                    style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {item.icon}
                  </span>
                  {item.name === 'Messages' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] flex items-center justify-center px-[3px] rounded-full bg-red-500 text-white text-[8px] font-bold leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </span>
                <span className="font-label-md text-[10px] mt-0.5">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
