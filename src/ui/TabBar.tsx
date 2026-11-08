import { NavLink } from 'react-router';
import { Icon, type IconName } from './Icon';

const TABS: ReadonlyArray<{ to: string; label: string; icon: IconName }> = [
  { to: '/', label: 'Ahora', icon: 'home' },
  { to: '/pendientes', label: 'Pendientes', icon: 'list' },
  { to: '/agenda', label: 'Agenda', icon: 'calendar' },
  { to: '/presupuesto', label: 'Presupuesto', icon: 'wallet' },
];

export function TabBar() {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E7E5F0] bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid h-[68px] max-w-lg grid-cols-4 px-2">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[11px] no-underline ${
                isActive ? 'font-extrabold text-primary' : 'font-bold text-muted'
              }`
            }
          >
            <Icon name={t.icon} />
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
