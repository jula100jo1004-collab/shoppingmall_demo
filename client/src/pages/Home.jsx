import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProducts } from '@/api/client'

const QUICK_LINKS = [
  { label: '위시', mark: '♡' },
  { label: '투데이', mark: '27' },
  { label: '세일', mark: '%' },
  { label: '룩북', mark: 'Look' },
  { label: '선물', mark: 'Gift' },
]

function formatPrice(price) {
  return `${Number(price).toLocaleString('ko-KR')}원`
}

function Home() {
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadProducts = async () => {
      setStatus('loading')
      setMessage('')

      try {
        // 메인에서는 전체 상품을 한 번에 조회 (페이지네이션 상한)
        const data = await fetchProducts({ page: 1, limit: 1000 })
        if (!cancelled) {
          setProducts(Array.isArray(data.products) ? data.products : [])
          setStatus('idle')
        }
      } catch (error) {
        if (!cancelled) {
          setProducts([])
          setStatus('error')
          setMessage(error.message || '상품을 불러오지 못했습니다.')
        }
      }
    }

    loadProducts()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="mall">
      <section
        className="mall-hero"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(10,18,30,0.08) 0%, rgba(10,18,30,0.45) 100%), url('https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1600&q=80')",
        }}
      >
        <div className="mall-hero__content">
          <p className="mall-hero__brand">lumi nest</p>
          <h1>여름 하늘 아래, 가벼운 하루</h1>
          <p className="mall-hero__lead">
            움직임이 자유로운 키즈 웨어로 완성하는 시즌 룩
          </p>
          <a className="mall-hero__cta" href="#products">
            컬렉션 보기
          </a>
        </div>
      </section>

      <section className="mall-quick" aria-label="바로가기">
        {QUICK_LINKS.map((item) => (
          <a key={item.label} className="mall-quick__item" href="#products">
            <span className="mall-quick__circle">{item.mark}</span>
            <span className="mall-quick__label">{item.label}</span>
          </a>
        ))}
      </section>

      <section className="mall-products" id="products">
        <header className="mall-products__head">
          <h2>전체 상품</h2>
          <p>등록된 상품을 모두 만나보세요</p>
        </header>

        {status === 'loading' ? (
          <p className="mall-products__status">상품을 불러오는 중...</p>
        ) : status === 'error' ? (
          <p className="mall-products__status mall-products__status--error">
            {message}
          </p>
        ) : products.length === 0 ? (
          <p className="mall-products__status">등록된 상품이 없습니다.</p>
        ) : (
          <div className="mall-products__grid">
            {products.map((product) => (
              <Link
                key={product._id}
                to={`/products/${product._id}`}
                className="mall-product"
              >
                <div
                  className="mall-product__image"
                  style={{ backgroundImage: `url('${product.image}')` }}
                >
                  <button
                    type="button"
                    className="mall-product__wish"
                    aria-label="위시리스트 담기"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                  >
                    ♡
                  </button>
                </div>
                <div className="mall-product__info">
                  <h3>{product.name}</h3>
                  <p className="mall-product__price">
                    {formatPrice(product.price)}
                  </p>
                  <span className="mall-product__tag">{product.category}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="mall-footer">
        <Link to="/login">로그인</Link>
        <span aria-hidden="true">·</span>
        <Link to="/signup">회원가입</Link>
      </footer>
    </main>
  )
}

export default Home
