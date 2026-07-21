import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <main>
      <h1>Dashboard</h1>
      <p>Sesión iniciada: {user?.email}</p>
      <p>La conexión con Firebase Authentication funciona correctamente.</p>
      <button type="button" onClick={handleLogout}>
        Cerrar sesión
      </button>
    </main>
  )
}