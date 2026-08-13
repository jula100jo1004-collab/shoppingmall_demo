import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createUser } from '@/api/client'

// userController.createUser의 req.body 필드 + 클라이언트 전용 필드
const initialForm = {
  email: '',
  name: '',
  password: '',
  passwordConfirm: '',
  user_type: 'customer',
  address: '',
  agreeTerms: false,
}

function Signup() {
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    const email = form.email.trim()
    const name = form.name.trim()
    const password = form.password
    const passwordConfirm = form.passwordConfirm
    const user_type = form.user_type
    const address = form.address.trim()

    if (!email || !name || !password || !user_type) {
      setStatus('error')
      setMessage('이메일, 이름, 비밀번호, 회원 유형은 필수입니다.')
      return
    }

    if (password !== passwordConfirm) {
      setStatus('error')
      setMessage('비밀번호가 일치하지 않습니다.')
      return
    }

    if (!form.agreeTerms) {
      setStatus('error')
      setMessage('약관에 동의해 주세요.')
      return
    }

    try {
      const savedUser = await createUser({
        email,
        name,
        password,
        user_type,
        address: address || undefined,
      })

      setStatus('success')
      setMessage(`${savedUser.name}님, 회원가입이 완료되었습니다.`)
      setForm(initialForm)
    } catch (error) {
      setStatus('error')
      setMessage(error.message || '회원가입에 실패했습니다.')
    }
  }

  return (
    <main className="signup">
      <section className="signup__panel">
        <header className="signup__header">
          <p className="signup__brand">Lumi Nest</p>
          <h1>회원가입</h1>
          <p className="signup__lead">아기의 일상을 위한 계정을 만들어 보세요.</p>
        </header>

        <form className="signup__form" onSubmit={handleSubmit} noValidate>
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
              placeholder="홍길동"
              required
              autoComplete="name"
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
              autoComplete="new-password"
            />
          </label>

          <label className="field">
            <span>비밀번호 확인</span>
            <input
              type="password"
              name="passwordConfirm"
              value={form.passwordConfirm}
              onChange={handleChange}
              placeholder="비밀번호를 다시 입력하세요"
              required
              autoComplete="new-password"
            />
          </label>

          <label className="field">
            <span>회원 유형</span>
            <select
              name="user_type"
              value={form.user_type}
              onChange={handleChange}
              required
            >
              <option value="customer">customer</option>
              <option value="admin">admin</option>
            </select>
          </label>

          <label className="field">
            <span>주소 (선택)</span>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="배송받을 주소"
              autoComplete="street-address"
            />
          </label>

          <label className="field field--checkbox">
            <input
              type="checkbox"
              name="agreeTerms"
              checked={form.agreeTerms}
              onChange={handleChange}
            />
            <span>
              <a href="#terms" onClick={(event) => event.preventDefault()}>
                이용약관
              </a>
              및{' '}
              <a href="#privacy" onClick={(event) => event.preventDefault()}>
                개인정보 처리방침
              </a>
              에 동의합니다.
            </span>
          </label>

          {message ? (
            <p
              className={`signup__message signup__message--${status}`}
              role="status"
            >
              {message}
            </p>
          ) : null}

          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? '가입 중...' : '회원가입하기'}
          </button>
        </form>

        <p className="auth__footer">
          이미 계정이 있으신가요?{' '}
          <Link to="/login">로그인</Link>
        </p>

        <Link className="signup__back" to="/">
          메인으로 돌아가기
        </Link>
      </section>
    </main>
  )
}

export default Signup
