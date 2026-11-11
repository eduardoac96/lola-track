import { NavLink } from 'react-router';
import { Icon, type IconName } from './Icon';

const TABS: ReadonlyArray<{ to: string; label: string; icon: IconName }> = [
  { to: '/', label: 'Ahora', icon: 'home' },
  { to: '/pendientes', label: 'Pendientes', icon: 'list' },
  { to: '/agenda', label: 'Agenda', icon: 'calendar' },
  { to: '/presupuesto', label: 'Presupuesto', icon: 'wallet' },
  { to: '/deseos', label: 'Deseos', icon: 'gift' },
];

export function TabBar() {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:inset-y-0 md:right-auto md:w-24 md:border-t-0 md:border-r md:pt-[env(safe-area-inset-top)] md:pb-0"
    >
      <div className="mx-auto grid h-[68px] max-w-lg grid-cols-5 px-1 md:h-full md:grid-cols-1 md:grid-rows-[repeat(5,88px)] md:content-center md:px-0">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[11px] tracking-tight no-underline ${
                isActive ? 'font-extrabold text-primary-hover' : 'font-bold text-muted'
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
