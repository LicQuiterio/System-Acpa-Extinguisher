import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <p>Cargando sesión…</p>
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}