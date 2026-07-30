import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ROLE_LABELS } from '../types/member'

export function DashboardPage() {
  const { user, member } = useAuth()

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <span className="page-eyebrow">
            Panel principal
          </span>

          <h1>
            Bienvenido,{' '}
            {member?.displayName ?? 'equipo ACPA'}
          </h1>

          <p>
            Administra las ventas, los clientes y el
            seguimiento de las notas desde un solo lugar.
          </p>
        </div>

        <dl className="dashboard-account">
          <div>
            <dt>Usuario</dt>
            <dd>{user?.email ?? 'No disponible'}</dd>
          </div>

          <div>
            <dt>Rol</dt>
            <dd>
              {member
                ? ROLE_LABELS[member.role]
                : 'Sin membresía'}
            </dd>
          </div>
        </dl>
      </header>

      {!member && (
        <p role="alert">
          Tu cuenta no tiene una membresía activa.
          Comunícate con el propietario del negocio.
        </p>
      )}

      <section
        className="dashboard-actions"
        aria-labelledby="dashboard-actions-title"
      >
        <div className="dashboard-section-heading">
          <div>
            <span className="page-eyebrow">
              Acciones rápidas
            </span>

            <h2 id="dashboard-actions-title">
              ¿Qué deseas hacer?
            </h2>
          </div>

          <p>
            Accede directamente a las operaciones más
            frecuentes.
          </p>
        </div>

        <div className="dashboard-grid">
          <Link
            className="dashboard-action-card dashboard-action-card--primary"
            to="/sales/new"
          >
            <span
              className="dashboard-action-number"
              aria-hidden="true"
            >
              01
            </span>

            <div>
              <h3>Nueva nota</h3>
              <p>
                Crea una cotización o registra una nueva
                venta.
              </p>
            </div>

            <span
              className="dashboard-action-arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>

          <Link
            className="dashboard-action-card"
            to="/sales"
          >
            <span
              className="dashboard-action-number"
              aria-hidden="true"
            >
              02
            </span>

            <div>
              <h3>Historial de notas</h3>
              <p>
                Consulta pagos, saldos, entregas y
                cancelaciones.
              </p>
            </div>

            <span
              className="dashboard-action-arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>

          <Link
            className="dashboard-action-card"
            to="/clients"
          >
            <span
              className="dashboard-action-number"
              aria-hidden="true"
            >
              03
            </span>

            <div>
              <h3>Clientes</h3>
              <p>
                Registra clientes y actualiza sus datos de
                contacto.
              </p>
            </div>

            <span
              className="dashboard-action-arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>
      </section>

      <section className="dashboard-version">
        <div>
          <span className="dashboard-version-indicator" />

          <div>
            <h2>Operación disponible</h2>
            <p>
              El sistema está preparado para registrar
              ventas, pagos y entregas con trazabilidad.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}