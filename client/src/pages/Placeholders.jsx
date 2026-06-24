import { useEffect, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { Link } from 'react-router-dom';
import appointmentService from '../services/appointmentService';
import paymentService from '../services/paymentService';
import clientService from '../services/clientService';

// ─── Home / Dashboard ─────────────────────────────────────────────────────────

export function Home() {
  const [stats, setStats] = useState({
    todayAppointments: [],
    pendingPayments: 0,
    totalClients: 0,
    upcomingAppointments: [],
    loading: true,
    error: false,
  });

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [upcoming, paySummary, clientsResult] = await Promise.all([
          appointmentService.getUpcoming(),
          paymentService.getSummary(),
          clientService.getAll({ limit: 1 }),
        ]);

        const todayAppts = (upcoming || []).filter((a) => a.date === today);

        setStats({
          todayAppointments: todayAppts,
          pendingPayments: paySummary.pending || 0,
          totalClients: clientsResult.pagination?.total || 0,
          upcomingAppointments: (upcoming || []).slice(0, 5),
          loading: false,
          error: false,
        });
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
        setStats((s) => ({ ...s, loading: false, error: true }));
      }
    }
    load();
  }, []);

  const fmt = (n) => Number(n).toLocaleString('es-DO', { minimumFractionDigits: 0 });
  const fmtDate = (d) => {
    if (!d) return '';
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-ds-lg h-full overflow-y-auto">
      <div>
        <h2 className="text-display-lg-mobile md:text-headline-lg font-bold text-primary tracking-tight mb-1">
          Bienvenido 👋
        </h2>
        <p className="text-body-md text-on-surface-variant">
          Aquí está el resumen de tu estudio fotográfico hoy.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-ds-md">
        <Card interactive>
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-secondary text-2xl">schedule</span>
            <span className="text-label-sm text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 font-bold">Hoy</span>
          </div>
          {stats.loading ? (
            <div className="h-8 w-8 bg-gray-100 rounded animate-pulse mt-4 mb-1" />
          ) : (
            <p className="text-display-lg-mobile font-bold text-primary mt-4">
              {stats.todayAppointments.length}
            </p>
          )}
          <p className="text-label-md text-on-surface-variant font-semibold">Sesiones hoy</p>
        </Card>

        <Card interactive>
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-secondary text-2xl">payments</span>
            <span className="text-label-sm text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100 font-bold">Pendiente</span>
          </div>
          {stats.loading ? (
            <div className="h-8 w-24 bg-gray-100 rounded animate-pulse mt-4 mb-1" />
          ) : (
            <p className="text-display-lg-mobile font-bold text-primary mt-4">
              ${fmt(stats.pendingPayments)}
            </p>
          )}
          <p className="text-label-md text-on-surface-variant font-semibold">Por cobrar</p>
        </Card>

        <Card interactive>
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-secondary text-2xl">groups</span>
            <span className="text-label-sm text-primary bg-[#F5F5F5] px-2 py-0.5 rounded-full border border-[#E5E5E5] font-bold">Total</span>
          </div>
          {stats.loading ? (
            <div className="h-8 w-8 bg-gray-100 rounded animate-pulse mt-4 mb-1" />
          ) : (
            <p className="text-display-lg-mobile font-bold text-primary mt-4">
              {stats.totalClients}
            </p>
          )}
          <p className="text-label-md text-on-surface-variant font-semibold">Clientes</p>
        </Card>
      </div>

      {/* Próximas citas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-headline-md font-bold text-primary">Próximas citas</h3>
          <Link to="/calendar">
            <Button variant="secondary">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              Ver calendario
            </Button>
          </Link>
        </div>

        {stats.error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100 mb-3">
            <span className="material-symbols-outlined text-sm">error</span>
            No se pudo conectar al servidor. Verifica que el backend esté corriendo en el puerto 3001.
          </div>
        )}

        <Card padding={false} className="overflow-hidden">
          {stats.loading ? (
            <div className="divide-y divide-[#E5E5E5]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-ds-md flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats.upcomingAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant text-center">
              <span className="material-symbols-outlined text-3xl opacity-30 mb-2">event_busy</span>
              <p className="text-sm">No hay citas próximas</p>
              <Link to="/calendar" className="mt-3">
                <button className="text-xs font-semibold text-[#735c00] hover:underline cursor-pointer flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Agendar primera cita
                </button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5E5]">
              {stats.upcomingAppointments.map((appt) => (
                <div key={appt.id} className="p-ds-md flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#fed65b]/20 text-[#735c00] flex items-center justify-center font-bold text-xs flex-shrink-0">
                      <span className="material-symbols-outlined text-sm">camera_alt</span>
                    </div>
                    <div>
                      <p className="text-label-md text-primary font-semibold">
                        {appt.client_name || 'Cliente'}
                      </p>
                      <p className="text-body-md text-on-surface-variant">
                        {appt.session_type || 'Sesión'}{appt.location ? ` · ${appt.location}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-label-sm text-primary font-semibold">{appt.time?.slice(0, 5)}</p>
                    <p className="text-body-md text-on-surface-variant">{fmtDate(appt.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Accesos rápidos */}
      <div>
        <h3 className="text-headline-md font-bold text-primary mb-3">Accesos rápidos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-ds-md">
          {[
            { icon: 'person_add', label: 'Nuevo Cliente', to: '/clientes' },
            { icon: 'event_available', label: 'Agendar Cita', to: '/calendar' },
            { icon: 'photo_library', label: 'Galerías', to: '/galleries' },
            { icon: 'chat', label: 'Mensajes', to: '/messages' },
          ].map((item) => (
            <Link key={item.label} to={item.to}>
              <Card interactive className="flex flex-col items-center text-center py-ds-lg cursor-pointer hover:shadow-md transition-shadow">
                <span className="material-symbols-outlined text-secondary text-3xl mb-2">{item.icon}</span>
                <span className="text-label-md font-semibold text-primary">{item.label}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CRM Placeholder ──────────────────────────────────────────────────────────

function PlaceholderPage({ title, description, icon, actionText, actionLink }) {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-ds-md py-ds-xl max-w-md mx-auto h-full overflow-y-auto">
      <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-secondary border border-[#E5E5E5] mb-ds-sm">
        <span className="material-symbols-outlined text-4xl">{icon}</span>
      </div>
      <h2 className="text-headline-lg font-bold text-primary tracking-tight">{title}</h2>
      <p className="text-body-md text-on-surface-variant max-w-sm">{description}</p>
      {actionText && actionLink && (
        <Link to={actionLink} className="pt-2">
          <Button>{actionText}</Button>
        </Link>
      )}
    </div>
  );
}

export function CRM() {
  return (
    <PlaceholderPage
      title="Directorio de Clientes"
      description="Gestiona tus leads y clientes en una base de datos unificada."
      icon="group"
      actionText="Ver Clientes"
      actionLink="/clientes"
    />
  );
}

export { default as Messages } from './MessagesPage';
export { default as Calendar } from './CalendarPage';
