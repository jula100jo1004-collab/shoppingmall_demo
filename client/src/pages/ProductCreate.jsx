import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createProduct } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import CloudinaryUploadModal from '@/components/CloudinaryUploadModal'

const CATEGORIES = ['상의', '하의', '악세사리']

const initialForm = {
  productId: '',
  name: '',
  price: '',
  category: '상의',
  image: '',
  description: '',
}

function ProductCreate() {
  const navigate = useNavigate()
  const { isAdmin, isLoggedIn, loading, user, logout } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)

  useEffect(() => {
    if (!loading && (!isLoggedIn || !isAdmin)) {
      navigate('/', { replace: true })
    }
  }, [isAdmin, isLoggedIn, loading, navigate])

  // 페이지 진입 시 이전 등록 폼/이미지 잔존 방지
  useEffect(() => {
    setForm({ ...initialForm })
    setMessage('')
    setStatus('idle')
    setPreviewKey(0)
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleUploaded = (imageUrl) => {
    setForm((prev) => ({ ...prev, image: imageUrl }))
    setPreviewKey(Date.now())
    setStatus('idle')
    setMessage('이미지가 업로드되었습니다. 미리보기를 확인하세요.')
  }

  const handleOpenWidget = () => {
    // 새 업로드 전에 이전 미리보기를 비워 교체가 눈에 보이게 함
    setForm((prev) => ({ ...prev, image: '' }))
    setPreviewKey(0)
    setMessage('')
    setWidgetOpen(true)
  }

  const handleClearImage = () => {
    setForm((prev) => ({ ...prev, image: '' }))
    setPreviewKey(0)
    setMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    const productId = form.productId.trim()
    const name = form.name.trim()
    const price = Number(form.price)
    const category = form.category
    const image = form.image.trim()
    const description = form.description.trim()

    if (!productId || !name || !image || form.price === '') {
      setStatus('error')
      setMessage('상품 아이디, 이름, 가격, 이미지는 필수입니다.')
      return
    }

    if (Number.isNaN(price) || price < 0) {
      setStatus('error')
      setMessage('가격은 0 이상의 숫자여야 합니다.')
      return
    }

    try {
      // POST /api/products (관리자 토큰 필요)
      const data = await createProduct({
        productId,
        name,
        price,
        category,
        image,
        description: description || undefined,
      })

      const saved = data.product || data
      setStatus('success')
      setMessage(`"${saved.name}" 상품이 등록되었습니다.`)
      setForm({ ...initialForm })
      setPreviewKey(0)

      setTimeout(() => {
        navigate('/admin/products')
      }, 800)
    } catch (error) {
      setStatus('error')
      setMessage(
        error.message === 'productId already exists'
          ? '이미 사용 중인 상품 아이디입니다.'
          : error.message === 'Admin access required'
            ? '관리자만 상품을 등록할 수 있습니다.'
            : error.message || '상품 등록에 실패했습니다.',
      )
    }
  }

  if (loading || !isAdmin) {
    return (
      <div className="admin-dash admin-dash--loading">
        <p>권한을 확인하는 중...</p>
      </div>
    )
  }

  return (
    <div className="admin-dash">
      <header className="admin-dash__top">
        <p className="admin-dash__logo">ADMINISTRATOR</p>
        <div className="admin-dash__top-actions">
          <Link to="/admin" className="admin-dash__icon-link">
            Dashboard
          </Link>
          <Link to="/" className="admin-dash__icon-link">
            Home
          </Link>
          <details className="admin-dash__profile">
            <summary>관리자 ▾</summary>
            <div className="admin-dash__profile-menu">
              <p>{user?.name}님</p>
              <button type="button" onClick={logout}>
                로그아웃
              </button>
            </div>
          </details>
        </div>
      </header>

      <main className="admin-product">
        <div className="admin-product__panel">
          <header className="admin-product__header">
            <div>
              <p className="admin-product__eyebrow">Product Management</p>
              <h1>새 상품 등록</h1>
              <p>상품 정보를 입력하고 Cloudinary 위젯으로 이미지를 업로드하세요.</p>
            </div>
            <Link className="admin-product__back" to="/admin">
              대시보드로
            </Link>
          </header>

          <form className="admin-product__form" onSubmit={handleSubmit} noValidate>
            <div className="admin-product__grid">
              <label className="admin-product__field">
                <span>상품 아이디 *</span>
                <input
                  type="text"
                  name="productId"
                  value={form.productId}
                  onChange={handleChange}
                  placeholder="예: TOP-001"
                  required
                />
              </label>

              <label className="admin-product__field">
                <span>상품 이름 *</span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="예: 코튼 티셔츠"
                  required
                />
              </label>

              <label className="admin-product__field">
                <span>상품 가격 *</span>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="29000"
                  min="0"
                  required
                />
              </label>

              <label className="admin-product__field">
                <span>카테고리 *</span>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="admin-product__upload">
              <div className="admin-product__upload-head">
                <span>상품 이미지 *</span>
                <div className="admin-product__upload-actions">
                  <button
                    type="button"
                    className="admin-product__upload-btn"
                    onClick={handleOpenWidget}
                  >
                    Cloudinary 위젯
                  </button>
                  {form.image ? (
                    <button
                      type="button"
                      className="admin-product__clear-btn"
                      onClick={handleClearImage}
                    >
                      이미지 제거
                    </button>
                  ) : null}
                </div>
              </div>

              <input type="hidden" name="image" value={form.image} required />

              {form.image ? (
                <div className="admin-product__preview">
                  <p>이미지 미리보기</p>
                  <img
                    key={`${previewKey}-${form.image}`}
                    src={form.image}
                    alt="상품 미리보기"
                  />
                  <p className="admin-product__image-url">{form.image}</p>
                </div>
              ) : (
                <div className="admin-product__preview admin-product__preview--empty">
                  <p>업로드된 이미지가 없습니다.</p>
                  <p>
                    <strong>Cloudinary 위젯</strong>을 눌러 이미지를
                    업로드하세요.
                  </p>
                </div>
              )}
            </div>

            <label className="admin-product__field">
              <span>상품 설명 (선택)</span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="상품에 대한 설명을 입력하세요."
                rows={4}
              />
            </label>

            {message ? (
              <p
                className={`admin-product__message admin-product__message--${
                  status === 'error'
                    ? 'error'
                    : status === 'success'
                      ? 'success'
                      : 'info'
                }`}
                role="status"
              >
                {message}
              </p>
            ) : null}

            <div className="admin-product__actions">
              <button
                type="submit"
                disabled={status === 'loading' || !form.image}
              >
                {status === 'loading' ? '등록 중...' : '상품 등록하기'}
              </button>
              <Link to="/admin" className="admin-product__cancel">
                취소
              </Link>
            </div>
          </form>
        </div>
      </main>

      <CloudinaryUploadModal
        open={widgetOpen}
        onClose={() => setWidgetOpen(false)}
        onUploaded={handleUploaded}
      />
    </div>
  )
}

export default ProductCreate
