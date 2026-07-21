import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ROLE_LABELS } from '../types/member'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, member, logout } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <main>
      <h1>Dashboard</h1>

      {member ? (
        <>
          <p>Bienvenido, {member.displayName} </p>
          <p>Rol: {ROLE_LABELS[member.role]}</p>
          <p>Negocio: {member.businessId}</p>
        </>
      ) : (
        <p>Tu cuenta no tiene una membresía activa</p>
      )}

      <p>Sesión iniciada: {user?.email}</p>
      <button type="button" onClick={() => navigate('/clients')}>
        Clientes
      </button>
      <button type="button" onClick={handleLogout}>
        Cerrar sesión
      </button>
    </main>
  )
}