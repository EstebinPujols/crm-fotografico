import Card from '../components/Card';
import Button from '../components/Button';
import { Link } from 'react-router-dom';

function PlaceholderPage({ title, description, icon, actionText, actionLink }) {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-ds-md py-ds-xl max-w-md mx-auto h-full overflow-y-auto">
      <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-secondary border border-[#E5E5E5] mb-ds-sm">
        <span className="material-symbols-outlined text-4xl">{icon}</span>
      </div>
      <h2 className="text-headline-lg font-bold text-primary tracking-tight">{title}</h2>
      <p className="text-body-md text-on-surface-variant max-w-sm">
        {description}
      </p>
      {actionText && actionLink && (
        <Link to={actionLink} className="pt-2">
          <Button>{actionText}</Button>
        </Link>
      )}
    </div>
  );
}

export function Home() {
  return (
    <div className="space-y-ds-lg h-full overflow-y-auto">
      <div>
        <h2 className="text-display-lg-mobile md:text-headline-lg font-bold text-primary tracking-tight mb-1">
          Welcome back
        </h2>
        <p className="text-body-md text-on-surface-variant">
          Here is what is happening with your photography studio today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-ds-md">
        <Card interactive>
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-secondary text-2xl">schedule</span>
            <span className="text-label-sm text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 font-bold">Today</span>
          </div>
          <p className="text-display-lg-mobile font-bold text-primary mt-4">3</p>
          <p className="text-label-md text-on-surface-variant font-semibold">Scheduled Shoots</p>
        </Card>

        <Card interactive>
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-secondary text-2xl">mail</span>
            <span className="text-label-sm text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100 font-bold">Unread</span>
          </div>
          <p className="text-display-lg-mobile font-bold text-primary mt-4">8</p>
          <p className="text-label-md text-on-surface-variant font-semibold">New Messages</p>
        </Card>

        <Card interactive>
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-secondary text-2xl">payments</span>
            <span className="text-label-sm text-primary bg-[#F5F5F5] px-2 py-0.5 rounded-full border border-[#E5E5E5] font-bold">Pending</span>
          </div>
          <p className="text-display-lg-mobile font-bold text-primary mt-4">$1,250</p>
          <p className="text-label-md text-on-surface-variant font-semibold">Pending Payments</p>
        </Card>
      </div>

      <div className="pt-4">
        <h3 className="text-headline-md font-bold text-primary mb-3">Recent Activity</h3>
        <Card padding={false} className="overflow-hidden">
          <div className="divide-y divide-[#E5E5E5]">
            <div className="p-ds-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#fed65b]/20 text-[#735c00] flex items-center justify-center font-bold text-xs">
                  <span className="material-symbols-outlined text-sm">payments</span>
                </div>
                <div>
                  <p className="text-label-md text-primary font-semibold">Deposit received from Maria Gomez</p>
                  <p className="text-body-md text-on-surface-variant">Wedding Pack - Dec 12, 2026</p>
                </div>
              </div>
              <span className="text-label-sm text-on-surface-variant">2h ago</span>
            </div>
            <div className="p-ds-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#e2e2e2] text-on-surface-variant flex items-center justify-center font-bold text-xs">
                  <span className="material-symbols-outlined text-sm">mail</span>
                </div>
                <div>
                  <p className="text-label-md text-primary font-semibold">Inquiry about Portrait Sessions</p>
                  <p className="text-body-md text-on-surface-variant">David K. (via WhatsApp)</p>
                </div>
              </div>
              <span className="text-label-sm text-on-surface-variant">5h ago</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function CRM() {
  return (
    <PlaceholderPage
      title="Client Directory"
      description="Manage your photography leads, current clients, and past shoots in a single clean contact database."
      icon="group"
      actionText="Ver Galerías"
      actionLink="/galleries"
    />
  );
}

export { default as Messages } from './MessagesPage';
export { default as Calendar } from './CalendarPage';
