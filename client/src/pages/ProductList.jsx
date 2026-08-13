import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteProduct, fetchProducts } from '@/api/client'
import { useAuth } from '@/context/AuthContext'

const CATEGORIES = ['전체', '상의', '하의', '악세사리']

function formatPrice(price) {
  return `${Number(price).toLocaleString('ko-KR')}원`
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

function ProductList() {
  const navigate = useNavigate()
  const { isAdmin, isLoggedIn, loading, user, logout } = useAuth()
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState('전체')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 2,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!loading && (!isLoggedIn || !isAdmin)) {
      navigate('/', { replace: true })
    }
  }, [isAdmin, isLoggedIn, loading, navigate])

  useEffect(() => {
    if (loading || !isAdmin) return undefined

    let cancelled = false

    const loadProducts = async () => {
      setStatus('loading')
      setMessage('')

      try {
        const data = await fetchProducts({
          page,
          limit: 2,
          ...(category === '전체' ? {} : { category }),
        })
        if (!cancelled) {
          setProducts(Array.isArray(data.products) ? data.products : [])
          setPagination(
            data.pagination || {
              page: 1,
              limit: 2,
              total: 0,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false,
            },
          )
          setStatus('idle')
        }
      } catch (error) {
        if (!cancelled) {
          setProducts([])
          setStatus('error')
          setMessage(error.message || '상품 목록을 불러오지 못했습니다.')
        }
      }
    }

    loadProducts()

    return () => {
      cancelled = true
    }
  }, [category, isAdmin, loading, page])

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `"${product.name}" 상품을 삭제하시겠습니까?`,
    )
    if (!confirmed) return

    try {
      await deleteProduct(product._id)
      setMessage(`"${product.name}" 상품이 삭제되었습니다.`)

      // 현재 페이지에 남은 상품이 1개뿐이면 이전 페이지로 이동
      if (products.length === 1 && page > 1) {
        setPage((prev) => prev - 1)
      } else {
        const data = await fetchProducts({
          page,
          limit: 2,
          ...(category === '전체' ? {} : { category }),
        })
        setProducts(Array.isArray(data.products) ? data.products : [])
        setPagination(
          data.pagination || {
            page: 1,
            limit: 2,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        )
      }
      setStatus('idle')
    } catch (error) {
      setStatus('error')
      setMessage(error.message || '상품 삭제에 실패했습니다.')
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
        <div className="admin-product__panel admin-product__panel--wide">
          <header className="admin-product__header">
            <div>
              <p className="admin-product__eyebrow">Product Management</p>
              <h1>상품 조회</h1>
              <p>등록된 상품을 카테고리별로 확인하고 관리하세요.</p>
            </div>
            <div className="admin-product-list__actions">
              <Link className="admin-dash__create-btn" to="/admin/products/new">
                새상품 등록하기
              </Link>
              <Link className="admin-product__back" to="/admin">
                대시보드로
              </Link>
            </div>
          </header>

          <div className="admin-product-list__filters">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                className={
                  category === item
                    ? 'admin-product-list__chip admin-product-list__chip--active'
                    : 'admin-product-list__chip'
                }
                onClick={() => {
                  setCategory(item)
                  setPage(1)
                }}
              >
                {item}
              </button>
            ))}
            <p className="admin-product-list__count">
              총 {pagination.total}개 · {pagination.page}/{pagination.totalPages}페이지
            </p>
          </div>

          {message ? (
            <p
              className={`admin-product__message admin-product__message--${
                status === 'error' ? 'error' : 'info'
              }`}
              role="status"
            >
              {message}
            </p>
          ) : null}

          {status === 'loading' ? (
            <p className="admin-product-list__empty">상품을 불러오는 중...</p>
          ) : products.length === 0 ? (
            <div className="admin-product-list__empty">
              <p>등록된 상품이 없습니다.</p>
              <Link to="/admin/products/new">새상품 등록하기</Link>
            </div>
          ) : (
            <div className="admin-dash__table-wrap">
              <table className="admin-dash__table admin-product-list__table">
                <thead>
                  <tr>
                    <th>이미지</th>
                    <th>상품 아이디</th>
                    <th>상품명</th>
                    <th>카테고리</th>
                    <th>가격</th>
                    <th>설명</th>
                    <th>등록일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <img
                          className="admin-product-list__thumb"
                          src={product.image}
                          alt={product.name}
                        />
                      </td>
                      <td>{product.productId}</td>
                      <td className="admin-product-list__name">{product.name}</td>
                      <td>
                        <span className="admin-product-list__badge">
                          {product.category}
                        </span>
                      </td>
                      <td>{formatPrice(product.price)}</td>
                      <td className="admin-product-list__desc">
                        {product.description || '-'}
                      </td>
                      <td>{formatDate(product.createdAt)}</td>
                      <td>
                        <div className="admin-product-list__manage">
                          <Link
                            className="admin-product-list__edit"
                            to={`/admin/products/${product._id}/edit`}
                          >
                            수정
                          </Link>
                          <button
                            type="button"
                            className="admin-product-list__delete"
                            onClick={() => handleDelete(product)}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="admin-product-list__pagination">
                <button
                  type="button"
                  disabled={!pagination.hasPrevPage || status === 'loading'}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  이전
                </button>
                <span>
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={!pagination.hasNextPage || status === 'loading'}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default ProductList
