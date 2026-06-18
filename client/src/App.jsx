import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Settings from './pages/Settings';
import Galleries from './pages/Galleries';
import { Home, CRM, Messages, Calendar } from './pages/Placeholders';
import LoginPage from './pages/LoginPage';
import ClientsPage from './pages/ClientsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta de login — fuera del Layout para que no muestre sidebar/nav */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas — envueltas en Layout con children */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/galleries" element={<Galleries />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/clientes" element={<ClientsPage />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
