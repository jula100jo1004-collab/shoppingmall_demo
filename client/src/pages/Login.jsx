import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '@/api/client'
import { useAuth } from '@/context/AuthContext'

const initialForm = {
  email: '',
  password: '',
}

function Login() {
  const navigate = useNavigate()
  const { isLoggedIn, loading, login } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!loading && isLoggedIn) {
      navigate('/', { replace: true })
    }
  }, [isLoggedIn, loading, navigate])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    const email = form.email.trim()
    const password = form.password

    if (!email || !password) {
      setStatus('error')
      setMessage('이메일과 비밀번호를 입력해 주세요.')
      return
    }

    try {
      const { message: serverMessage, token, user } = await loginUser({
        email,
        password,
      })

      if (!token) {
        throw new Error('토큰을 받지 못했습니다.')
      }

      login(token, user)
      setStatus('success')
      setMessage(serverMessage || `${user?.name ?? '회원'}님, 로그인되었습니다.`)
      setForm(initialForm)

      setTimeout(() => {
        navigate('/')
      }, 600)
    } catch (error) {
      const apiMessage = error.message || ''
      const isAuthError =
        apiMessage.includes('Invalid email or password') ||
        apiMessage.includes('401')

      setStatus('error')
      setMessage(
        isAuthError
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : apiMessage || '로그인에 실패했습니다.',
      )
    }
  }

  if (loading || isLoggedIn) {
    return (
      <main className="auth">
        <section className="auth__panel">
          <p className="auth__lead">로그인 상태를 확인하는 중...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="auth">
      <section className="auth__panel">
        <header className="auth__header">
          <p className="auth__brand">Lumi Nest</p>
          <h1>로그인</h1>
          <p className="auth__lead">계정으로 들어와 컬렉션을 만나보세요.</p>
        </header>

        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>이메일</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span>비밀번호</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="비밀번호를 입력하세요"
              required
              autoComplete="current-password"
            />
          </label>

          {message ? (
            <p
              className={`auth__message auth__message--${status}`}
              role="status"
            >
              {message}
            </p>
          ) : null}

          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="auth__footer">
          <Link to="/forgot-password">비밀번호를 잊으셨나요?</Link>
        </p>

        <p className="auth__footer">
          계정이 없으신가요?{' '}
          <Link to="/signup">회원가입</Link>
        </p>
      </section>
    </main>
  )
}

export default Login
