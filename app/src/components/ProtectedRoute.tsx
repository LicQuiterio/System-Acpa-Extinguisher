import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AppShell } from './AppShell'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-loading" role="status">
        <div className="app-loading-spinner" />
        <p>Cargando sesión…</p>
      </div>
    )
  }

  return user
    ? <AppShell />
    : <Navigate to="/login" replace />
}