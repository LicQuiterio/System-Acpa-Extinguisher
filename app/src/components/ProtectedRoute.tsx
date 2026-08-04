import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AppShell } from './AppShell'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div
        className="app-loading"
        role="status"
        aria-label="Cargando aplicación"
      >
        <div
          className="app-loading-header"
          aria-hidden="true"
        >
          <div className="skeleton app-loading-logo" />

          <div className="app-loading-navigation">
            <div className="skeleton app-loading-nav-item" />
            <div className="skeleton app-loading-nav-item" />
            <div className="skeleton app-loading-nav-item" />
          </div>

          <div className="skeleton app-loading-user" />
        </div>

        <div
          className="app-loading-content"
          aria-hidden="true"
        >
          <div className="skeleton app-loading-title" />
          <div className="skeleton app-loading-description" />

          <div className="app-loading-cards">
            <div className="skeleton app-loading-card" />
            <div className="skeleton app-loading-card" />
            <div className="skeleton app-loading-card" />
          </div>
        </div>

        <p>Cargando aplicación…</p>
      </div>
    )
  }

  return user
    ? <AppShell />
    : <Navigate to="/login" replace />
}