import { useState, type FormEvent } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password,
      )

      navigate('/dashboard', { replace: true })
    } catch {
      setError('Correo o contraseña incorrectos.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <img
          className="login-logo"
          src="/assets/branding/logo-acpa.jpeg"
          alt="ACPA Extintores"
        />

        <div className="login-heading">
          <h1>Control de ventas</h1>
          <p>
            Inicia sesión para administrar las operaciones
            del negocio.
          </p>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="login-email">
            Correo electrónico
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </label>

          <label htmlFor="login-password">
            Contraseña
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />
          </label>

          {error && <p role="alert">{error}</p>}

          <button
            className="login-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Ingresando…'
              : 'Iniciar sesión'}
          </button>
        </form>
      </section>
    </main>
  )
}