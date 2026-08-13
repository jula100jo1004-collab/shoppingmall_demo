import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forgotPassword, resetPassword } from '@/api/client'

const initialForm = {
  email: '',
  name: '',
  newPassword: '',
  newPasswordConfirm: '',
}

function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initialForm)
  const [resetToken, setResetToken] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleVerify = async (event) => {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    const email = form.email.trim()
    const name = form.name.trim()

    if (!email || !name) {
      setStatus('error')
      setMessage('이메일과 이름을 입력해 주세요.')
      return
    }

    try {
      const data = await forgotPassword({ email, name })
      setResetToken(data.resetToken)
      setStep(2)
      setStatus('success')
      setMessage('계정이 확인되었습니다. 새 비밀번호를 설정해 주세요.')
    } catch (error) {
      setStatus('error')
      setMessage(
        error.message === 'No matching account found'
          ? '일치하는 계정을 찾을 수 없습니다.'
          : error.message || '계정 확인에 실패했습니다.',
      )
    }
  }

  const handleReset = async (event) => {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    const email = form.email.trim()
    const newPassword = form.newPassword
    const newPasswordConfirm = form.newPasswordConfirm

    if (!newPassword || !newPasswordConfirm) {
      setStatus('error')
      setMessage('새 비밀번호를 입력해 주세요.')
      return
    }

    if (newPassword !== newPasswordConfirm) {
      setStatus('error')
      setMessage('새 비밀번호가 일치하지 않습니다.')
      return
    }

    try {
      await resetPassword({
        email,
        resetToken,
        newPassword,
      })

      setStatus('success')
      setMessage('비밀번호가 변경되었습니다. 로그인 페이지로 이동합니다.')

      setTimeout(() => {
        navigate('/login')
      }, 1000)
    } catch (error) {
      setStatus('error')
      setMessage(
        error.message === 'Invalid or expired reset token'
          ? '재설정 요청이 만료되었습니다. 다시 시도해 주세요.'
          : error.message || '비밀번호 변경에 실패했습니다.',
      )
    }
  }

  return (
    <main className="auth">
      <section className="auth__panel">
        <header className="auth__header">
          <p className="auth__brand">Lumi Nest</p>
          <h1>비밀번호 찾기</h1>
          <p className="auth__lead">
            {step === 1
              ? '가입 시 사용한 이메일과 이름으로 계정을 확인합니다.'
              : '새 비밀번호를 입력해 주세요.'}
          </p>
        </header>

        {step === 1 ? (
          <form className="auth__form" onSubmit={handleVerify} noValidate>
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
              <span>이름</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="가입 시 입력한 이름"
                required
                autoComplete="name"
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
              {status === 'loading' ? '확인 중...' : '계정 확인'}
            </button>
          </form>
        ) : (
          <form className="auth__form" onSubmit={handleReset} noValidate>
            <label className="field">
              <span>새 비밀번호</span>
              <input
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                placeholder="새 비밀번호"
                required
                autoComplete="new-password"
              />
            </label>

            <label className="field">
              <span>새 비밀번호 확인</span>
              <input
                type="password"
                name="newPasswordConfirm"
                value={form.newPasswordConfirm}
                onChange={handleChange}
                placeholder="새 비밀번호 확인"
                required
                autoComplete="new-password"
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
              {status === 'loading' ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        )}

        <p className="auth__footer">
          <Link to="/login">로그인으로 돌아가기</Link>
        </p>
      </section>
    </main>
  )
}

export default ForgotPassword
