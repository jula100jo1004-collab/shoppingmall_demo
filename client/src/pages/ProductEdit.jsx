import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchProductById, updateProduct } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import CloudinaryUploadModal from '@/components/CloudinaryUploadModal'

const CATEGORIES = ['상의', '하의', '악세사리']

function ProductEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin, isLoggedIn, loading, user, logout } = useAuth()
  const [form, setForm] = useState({
    productId: '',
    name: '',
    price: '',
    category: '상의',
    image: '',
    description: '',
  })
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [mongoId, setMongoId] = useState('')

  useEffect(() => {
    if (!loading && (!isLoggedIn || !isAdmin)) {
      navigate('/', { replace: true })
    }
  }, [isAdmin, isLoggedIn, loading, navigate])

  useEffect(() => {
    if (loading || !isAdmin || !id) return undefined

    let cancelled = false

    const loadProduct = async () => {
      setStatus('loading')
      setMessage('')

      try {
        const product = await fetchProductById(id)
        if (cancelled) return

        setMongoId(product._id)
        setForm({
          productId: product.productId || '',
          name: product.name || '',
          price: product.price ?? '',
          category: product.category || '상의',
          image: product.image || '',
          description: product.description || '',
        })
        setPreviewKey(Date.now())
        setStatus('idle')
      } catch (error) {
        if (!cancelled) {
          setStatus('error')
          setMessage(error.message || '상품 정보를 불러오지 못했습니다.')
        }
      }
    }

    loadProduct()

    return () => {
      cancelled = true
    }
  }, [id, isAdmin, loading])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleUploaded = (imageUrl) => {
    setForm((prev) => ({ ...prev, image: imageUrl }))
    setPreviewKey(Date.now())
    setStatus('idle')
    setMessage('이미지가 변경되었습니다. 미리보기를 확인하세요.')
  }

  const handleOpenWidget = () => {
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
      const data = await updateProduct(mongoId || id, {
        productId,
        name,
        price,
        category,
        image,
        description: description || '',
      })

      const saved = data.product || data
      setStatus('success')
      setMessage(`"${saved.name}" 상품이 수정되었습니다.`)

      setTimeout(() => {
        navigate('/admin/products')
      }, 800)
    } catch (error) {
      setStatus('error')
      setMessage(
        error.message === 'productId already exists'
          ? '이미 사용 중인 상품 아이디입니다.'
          : error.message === 'Admin access required'
            ? '관리자만 상품을 수정할 수 있습니다.'
            : error.message || '상품 수정에 실패했습니다.',
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
              <h1>상품 수정</h1>
              <p>상품 정보를 수정하고 필요하면 이미지를 다시 업로드하세요.</p>
            </div>
            <Link className="admin-product__back" to="/admin/products">
              목록으로
            </Link>
          </header>

          {status === 'loading' && !form.productId ? (
            <p className="admin-product-list__empty">상품 정보를 불러오는 중...</p>
          ) : (
            <form className="admin-product__form" onSubmit={handleSubmit} noValidate>
              <div className="admin-product__grid">
                <label className="admin-product__field">
                  <span>상품 아이디 *</span>
                  <input
                    type="text"
                    name="productId"
                    value={form.productId}
                    onChange={handleChange}
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
                      이미지 변경
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
                    <p>이미지가 없습니다. 이미지를 다시 업로드해 주세요.</p>
                  </div>
                )}
              </div>

              <label className="admin-product__field">
                <span>상품 설명 (선택)</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
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
                  {status === 'loading' ? '수정 중...' : '상품 수정하기'}
                </button>
                <Link to="/admin/products" className="admin-product__cancel">
                  취소
                </Link>
              </div>
            </form>
          )}
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

export default ProductEdit
