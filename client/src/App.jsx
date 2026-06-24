import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Settings from './pages/Settings';
import Galleries from './pages/Galleries';
import { Home, CRM, Calendar } from './pages/Placeholders';
import MessagesPage from './pages/MessagesPage';
import LoginPage from './pages/LoginPage';
import ClientsPage from './pages/ClientsPage';
// ─── AuthGuard: redirige a /login si no hay token en sessionStorage ────
function AuthGuard() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    setStatus(token ? 'auth' : 'unauth');
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-4xl text-secondary">sync</span>
          <p className="text-sm font-medium">Iniciando…</p>
        </div>
      </div>
    );
  }

  if (status === 'unauth') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta de login — pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas — requieren sesión */}
        <Route element={<AuthGuard />}>
          <Route path="/*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/home" element={<Home />} />
                <Route path="/galleries" element={<Galleries />} />
                <Route path="/crm" element={<CRM />} />
                <Route path="/clientes" element={<ClientsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
