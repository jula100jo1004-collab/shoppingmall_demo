import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addCartItem, fetchProductById } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'

function formatPrice(price) {
  return `₩${Number(price).toLocaleString('ko-KR')}`
}

function createImpulseQuiz() {
  const a = Math.floor(Math.random() * 8) + 2
  const b = Math.floor(Math.random() * 8) + 2
  const questions = [
    {
      prompt: `심호흡 퀴즈: ${a} + ${b} = ?`,
      answer: String(a + b),
      hint: '계산기로 풀어도 괜찮아요. 그 사이에 한 번 더 생각해보세요.',
    },
    {
      prompt: '구매 전 주문 암호를 입력하세요',
      answer: '내일도필요해',
      hint: '암호: 내일도필요해',
    },
    {
      prompt: '이 상품을 산 뒤에도 내일 아침 웃을 수 있나요? (예/아니오)',
      answer: '예',
      hint: '진심으로 필요하면 "예", 아니면 장바구니에만 담아보세요.',
    },
  ]

  return questions[Math.floor(Math.random() * questions.length)]
}

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLoggedIn, token } = useAuth()
  const { setCart } = useCart()
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState('detail')
  const [wishCount, setWishCount] = useState(0)
  const [wished, setWished] = useState(false)
  const [adding, setAdding] = useState(false)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [quiz, setQuiz] = useState(() => createImpulseQuiz())
  const [quizInput, setQuizInput] = useState('')
  const [quizPassed, setQuizPassed] = useState(false)
  const [quizError, setQuizError] = useState('')
  const [breatheLeft, setBreatheLeft] = useState(0)
  const [breathed, setBreathed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadProduct = async () => {
      setStatus('loading')
      setMessage('')
      setQuantity(1)
      setQuiz(createImpulseQuiz())
      setQuizInput('')
      setQuizPassed(false)
      setQuizError('')
      setBreatheLeft(0)
      setBreathed(false)

      try {
        const data = await fetchProductById(id)
        if (!cancelled) {
          setProduct(data)
          setStatus('idle')
        }
      } catch (error) {
        if (!cancelled) {
          setProduct(null)
          setStatus('error')
          setMessage(error.message || '상품을 불러오지 못했습니다.')
        }
      }
    }

    loadProduct()

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (breatheLeft <= 0) return undefined

    const timer = window.setTimeout(() => {
      setBreatheLeft((prev) => {
        if (prev <= 1) {
          setBreathed(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [breatheLeft])

  const rewardPoints = useMemo(() => {
    if (!product) return 0
    return Math.max(0, Math.floor(Number(product.price) * 0.05))
  }, [product])

  const totalPrice = useMemo(() => {
    if (!product) return 0
    return Number(product.price) * quantity
  }, [product, quantity])

  const handleQuantityChange = (next) => {
    setQuantity(Math.max(1, next))
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product?.name,
          url: window.location.href,
        })
        return
      }
      await navigator.clipboard.writeText(window.location.href)
      alert('링크가 복사되었습니다.')
    } catch {
      // user cancelled share
    }
  }

  const canBuy = breathed && quizPassed

  const startBreathing = () => {
    if (breathed || breatheLeft > 0) return
    setBreatheLeft(3)
  }

  const handleQuizSubmit = (event) => {
    event.preventDefault()
    const normalized = quizInput.trim().replace(/\s+/g, '')
    const expected = quiz.answer.trim().replace(/\s+/g, '')

    if (normalized === expected) {
      setQuizPassed(true)
      setQuizError('')
      return
    }

    setQuizPassed(false)
    setQuizError('아직 충동 모드예요! 힌트를 보고 다시 도전해볼까요?')
  }

  const handleBuy = () => {
    if (!canBuy) {
      alert('충동구매 방지 미션을 먼저 완료해주세요!')
      return
    }

    if (!isLoggedIn) {
      navigate('/login')
      return
    }

    navigate('/order', {
      state: {
        source: 'direct',
        items: [{ productId: product._id, quantity }],
      },
    })
  }

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }

    setAdding(true)
    try {
      const data = await addCartItem(
        { productId: product._id, quantity },
        token,
      )
      setCart(data.cart)
      alert('장바구니에 담았습니다.')
    } catch (error) {
      alert(error.message || '장바구니 담기에 실패했습니다.')
    } finally {
      setAdding(false)
    }
  }

  if (status === 'loading') {
    return (
      <main className="pdp">
        <p className="pdp__status">상품을 불러오는 중...</p>
      </main>
    )
  }

  if (status === 'error' || !product) {
    return (
      <main className="pdp">
        <p className="pdp__status pdp__status--error">{message}</p>
        <Link className="pdp__home-link" to="/">
          Home
        </Link>
      </main>
    )
  }

  return (
    <main className="pdp">
      <div className="pdp__top">
        <Link className="pdp__home-link" to="/">
          Home
        </Link>
        <button type="button" className="pdp__info-btn" aria-label="상품 안내">
          i
        </button>
      </div>

      <section className="pdp__main">
        <div className="pdp__gallery">
          <img src={product.image} alt={product.name} />
        </div>

        <div className="pdp__panel">
          <h1 className="pdp__title">{product.name}</h1>

          <div className="pdp__price-row">
            <p className="pdp__price">{formatPrice(product.price)}</p>
            <button
              type="button"
              className="pdp__share"
              onClick={handleShare}
              aria-label="공유하기"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="18" cy="5" r="2.2" />
                <circle cx="6" cy="12" r="2.2" />
                <circle cx="18" cy="19" r="2.2" />
                <path d="M8 12.5 16 6.5M8 11.5l8 6.2" />
              </svg>
            </button>
          </div>

          <p className="pdp__benefit">
            구매혜택 {rewardPoints.toLocaleString('ko-KR')} 포인트 적립예정
            <button type="button" className="pdp__benefit-help" aria-label="적립 안내">
              ?
            </button>
          </p>

          <div className="pdp__qty-box">
            <span className="pdp__qty-label">수량</span>
            <div className="pdp__qty-controls">
              <div className="pdp__stepper">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  aria-label="수량 감소"
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) =>
                    handleQuantityChange(Number(event.target.value) || 1)
                  }
                  aria-label="수량"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  aria-label="수량 증가"
                >
                  +
                </button>
              </div>
              <p className="pdp__qty-subtotal">{formatPrice(totalPrice)}</p>
            </div>
          </div>

          <div className="pdp__total-row">
            <span>총 상품금액({quantity}개)</span>
            <strong>{formatPrice(totalPrice)}</strong>
          </div>

          <div className="pdp__actions">
            <button
              type="button"
              className={canBuy ? 'pdp__buy' : 'pdp__buy pdp__buy--locked'}
              onClick={handleBuy}
              aria-disabled={!canBuy}
            >
              {canBuy ? '구매하기' : '구매 잠금 중'}
            </button>
            <button
              type="button"
              className="pdp__cart"
              onClick={handleAddToCart}
              disabled={adding}
            >
              {adding ? '담는 중...' : '장바구니'}
            </button>
            <button
              type="button"
              className={wished ? 'pdp__wish pdp__wish--on' : 'pdp__wish'}
              onClick={() => {
                setWished((prev) => !prev)
                setWishCount((prev) => (wished ? Math.max(0, prev - 1) : prev + 1))
              }}
              aria-label="위시리스트"
            >
              <span aria-hidden="true">{wished ? '♥' : '♡'}</span>
              <span>{wishCount}</span>
            </button>
          </div>

          <aside className="pdp__impulse" aria-label="충동구매 방지 미션">
            <div className="pdp__impulse-head">
              <p className="pdp__impulse-eyebrow">Impulse Guard</p>
              <h2>충동구매 STOP 미션</h2>
              <p>
                3초만 쉬고, 퀴즈를 풀면 구매하기가 열려요.
                급할수록 장바구니에만 담아두는 것도 좋은 선택!
              </p>
            </div>

            <div className="pdp__impulse-steps">
              <div
                className={
                  breathed
                    ? 'pdp__impulse-step pdp__impulse-step--done'
                    : 'pdp__impulse-step'
                }
              >
                <span className="pdp__impulse-num">1</span>
                <div className="pdp__impulse-body">
                  <p className="pdp__impulse-title">심호흡 3초</p>
                  <p className="pdp__impulse-desc">
                    {breathed
                      ? '좋아요. 숨이 고르게 돌아왔어요.'
                      : breatheLeft > 0
                        ? `숨을 고르는 중... ${breatheLeft}`
                        : '구매 전에 잠깐 멈춰볼까요?'}
                  </p>
                  <button
                    type="button"
                    className="pdp__impulse-btn"
                    onClick={startBreathing}
                    disabled={breathed || breatheLeft > 0}
                  >
                    {breathed
                      ? '완료'
                      : breatheLeft > 0
                        ? `${breatheLeft}초...`
                        : '3초 생각하기'}
                  </button>
                </div>
              </div>

              <div
                className={
                  quizPassed
                    ? 'pdp__impulse-step pdp__impulse-step--done'
                    : 'pdp__impulse-step'
                }
              >
                <span className="pdp__impulse-num">2</span>
                <div className="pdp__impulse-body">
                  <p className="pdp__impulse-title">{quiz.prompt}</p>
                  <p className="pdp__impulse-desc">{quiz.hint}</p>
                  <form className="pdp__impulse-form" onSubmit={handleQuizSubmit}>
                    <input
                      type="text"
                      value={quizInput}
                      onChange={(event) => setQuizInput(event.target.value)}
                      placeholder="답변 입력"
                      disabled={quizPassed}
                      aria-label="충동구매 방지 퀴즈 답변"
                    />
                    <button type="submit" disabled={quizPassed || !quizInput.trim()}>
                      {quizPassed ? '통과' : '확인'}
                    </button>
                  </form>
                  {quizError ? (
                    <p className="pdp__impulse-error" role="status">
                      {quizError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <p
              className={
                canBuy
                  ? 'pdp__impulse-status pdp__impulse-status--ready'
                  : 'pdp__impulse-status'
              }
            >
              {canBuy
                ? '미션 클리어! 이제 신중하게 구매할 수 있어요.'
                : `진행도 ${Number(breathed) + Number(quizPassed)} / 2`}
            </p>
          </aside>
        </div>
      </section>

      <section className="pdp__tabs" aria-label="상품 정보 탭">
        <div className="pdp__tab-list" role="tablist">
          {[
            { id: 'detail', label: '상세정보' },
            { id: 'reviews', label: '구매평 0' },
            { id: 'return', label: '반품/교환' },
            { id: 'qna', label: 'Q&A 0' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={
                activeTab === tab.id ? 'pdp__tab pdp__tab--active' : 'pdp__tab'
              }
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pdp__tab-panel" role="tabpanel">
          {activeTab === 'detail' ? (
            <div className="pdp__detail">
              <p className="pdp__detail-category">카테고리 · {product.category}</p>
              <p className="pdp__detail-text">
                {product.description || '등록된 상세 설명이 없습니다.'}
              </p>
              <img
                className="pdp__detail-image"
                src={product.image}
                alt={`${product.name} 상세 이미지`}
              />
            </div>
          ) : null}

          {activeTab === 'reviews' ? (
            <p className="pdp__empty">아직 작성된 구매평이 없습니다.</p>
          ) : null}

          {activeTab === 'return' ? (
            <div className="pdp__policy">
              <h3>반품/교환 안내</h3>
              <ul>
                <li>상품 수령 후 7일 이내 반품/교환이 가능합니다.</li>
                <li>고객 변심에 의한 반품 시 배송비는 구매자 부담입니다.</li>
                <li>사용 흔적, 훼손, 구성품 누락 시 반품이 제한될 수 있습니다.</li>
              </ul>
            </div>
          ) : null}

          {activeTab === 'qna' ? (
            <p className="pdp__empty">등록된 Q&A가 없습니다.</p>
          ) : null}
        </div>
      </section>
    </main>
  )
}

export default ProductDetail
