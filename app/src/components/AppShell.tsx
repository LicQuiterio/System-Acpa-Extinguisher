import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ROLE_LABELS } from '../types/member'

function getNavigationClass({
  isActive,
}: {
  isActive: boolean
}) {
  return isActive
    ? 'app-nav-link app-nav-link--active'
    : 'app-nav-link'
}

export function AppShell() {
  const { member, logout } = useAuth()

  async function handleLogout() {
    await logout()
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink
          to="/dashboard"
          className="app-brand"
          aria-label="Ir al inicio"
        >
          <img
            src="/assets/branding/logo-acpa.jpeg"
            alt="ACPA Extintores"
          />
        </NavLink>

        <nav
          className="app-navigation"
          aria-label="Navegación principal"
        >
          <NavLink
            to="/dashboard"
            className={getNavigationClass}
          >
            Inicio
          </NavLink>

          <NavLink
            to="/sales/new"
            className={getNavigationClass}
          >
            Nueva nota
          </NavLink>

          <NavLink
            to="/sales"
            className={getNavigationClass}
          >
            Historial
          </NavLink>

          <NavLink
            to="/clients"
            className={getNavigationClass}
          >
            Clientes
          </NavLink>

          <NavLink
            to="/cash"
            className={getNavigationClass}
          >
            Caja
          </NavLink>
        </nav>

        <div className="app-user">
          {member && (
            <div className="app-user-details">
              <strong>{member.displayName}</strong>
              <span>{ROLE_LABELS[member.role]}</span>
            </div>
          )}

          <button
            type="button"
            className="button-secondary app-logout"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="app-content">
        <Outlet />
      </div>
    </div>
  )
}
