import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Hoje', icon: '☀️' },
  { to: '/tabela', label: 'Tabela', icon: '▦' },
  { to: '/kanban', label: 'Kanban', icon: '🗂️' },
  { to: '/temas', label: 'Temas', icon: '🗂' },
  { to: '/habitos', label: 'Hábitos', icon: '✓' },
  { to: '/novo', label: 'Novo Item', icon: '+' },
];

export default function Nav() {
  return (
    <nav className="sticky top-0 z-20 border-b border-white/5 bg-bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-3">
        <div className="mr-4 flex items-center gap-2 whitespace-nowrap">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary text-sm font-bold text-white">
            TI
          </div>
          <span className="hidden text-sm font-semibold text-text-primary sm:inline">
            Temas de TI — Vicunha
          </span>
        </div>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent-primary text-white shadow-soft'
                  : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
