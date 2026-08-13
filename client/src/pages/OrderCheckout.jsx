import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import * as PortOne from '@portone/browser-sdk/v2'
import { createOrder, fetchProductById } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'

const PAYMENT_OPTIONS = [
  { value: 'card', label: '신용/체크카드' },
  { value: 'vbank', label: '무통장입금' },
  { value: 'trans', label: '계좌이체' },
  { value: 'phone', label: '휴대폰결제' },
]

const SHIPPING_FEE = 0
const PENDING_ORDER_KEY = 'pendingOrder'

/** 포트원 콘솔 > 결제연동 화면 우측 상단 Store ID (store-...) */
const PORTONE_STORE_ID = (import.meta.env.VITE_PORTONE_STORE_ID || '').trim()
/** 포트원 콘솔 > 채널 관리 채널키 */
const PORTONE_CHANNEL_KEY = (
  import.meta.env.VITE_PORTONE_CHANNEL_KEY ||
  'channel-key-c670b0a7-cf6f-4356-b1d9-071dd2334112'
).trim()

/** V2 payMethod 매핑 — KG이니시스 V2 채널 전용 */
const PORTONE_PAYMENT_MAP = {
  card: { payMethod: 'CARD' },
  vbank: { payMethod: 'VIRTUAL_ACCOUNT' },
  trans: { payMethod: 'TRANSFER' },
  phone: { payMethod: 'MOBILE' },
}

function formatPrice(price) {
  return `₩${Number(price).toLocaleString('ko-KR')}`
}

function formatBuyerTel(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  let normalized = digits
  if (normalized.startsWith('82')) {
    normalized = `0${normalized.slice(2)}`
  }
  if (normalized.length === 11) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`
  }
  if (normalized.length === 10) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`
  }
  return normalized || '010-0000-0000'
}

function readPendingOrder() {
  try {
    const raw = sessionStorage.getItem(PENDING_ORDER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function createPaymentId() {
  // KG이니시스 oid 제한: 1~40자 (payment- + UUID는 44자라 초과)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '') // 32자
  }
  return `p${Date.now()}${Math.floor(Math.random() * 1e6)}`.slice(0, 40)
}

/**
 * 포트원 V2 결제 요청
 * KG이니시스 "결제창 일반/정기결제" 채널은 V2 전용
 * @see https://developers.portone.io/opi/ko/integration/pg/v2/inicis-v2
 */
function buildPortOneV2Payload({
  payMethod,
  paymentId,
  orderName,
  amount,
  buyer,
}) {
  return {
    storeId: PORTONE_STORE_ID,
    channelKey: PORTONE_CHANNEL_KEY,
    paymentId,
    orderName,
    totalAmount: Number(amount),
    currency: 'CURRENCY_KRW',
    payMethod,
    customer: {
      fullName: buyer.name || '구매자이름',
      phoneNumber: formatBuyerTel(buyer.tel),
      email: buyer.email || 'iamport@siot.do',
    },
    redirectUrl: `${window.location.origin}/order`,
  }
}

async function requestPortOnePayment(payload) {
  console.info('[PortOne V2] requestPayment', payload)

  const response = await PortOne.requestPayment(payload)
  console.info('[PortOne V2] response', response)

  // 사용자가 닫거나 실패하면 code가 존재
  if (response?.code != null) {
    throw new Error(response.message || '결제가 취소되었거나 실패했습니다.')
  }

  return response
}

function OrderCheckout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoggedIn, loading: authLoading, token } = useAuth()
  const { refreshCart } = useCart()

  const [lineItems, setLineItems] = useState([])
  const [source, setSource] = useState('direct')
  const [status, setStatus] = useState('loading')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [completedOrder, setCompletedOrder] = useState(null)
  const orderCompletedRef = useRef(false)

  const [form, setForm] = useState({
    recipientName: '',
    phone: '',
    address: '',
    detailAddress: '',
    postalCode: '',
    orderMemo: '',
    paymentMethod: 'card',
  })

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate('/login', { replace: true, state: { from: '/order' } })
    }
  }, [authLoading, isLoggedIn, navigate])

  useEffect(() => {
    if (!user) return
    setForm((prev) => ({
      ...prev,
      recipientName: prev.recipientName || user.name || '',
      address: prev.address || user.address || '',
    }))
  }, [user])

  useEffect(() => {
    if (authLoading || !isLoggedIn || orderCompletedRef.current) return undefined

    let cancelled = false

    const loadFromCart = async () => {
      // cart context 의존으로 재실행되지 않도록 여기서만 1회 fetch
      const cartData = await refreshCart()
      const items = (cartData?.items || [])
        .filter((item) => item.product)
        .map((item) => ({
          product: item.product,
          quantity: item.quantity,
        }))

      if (cancelled) return

      if (items.length === 0) {
        setLineItems([])
        setStatus('empty')
        return
      }

      setSource('cart')
      sessionStorage.setItem(
        PENDING_ORDER_KEY,
        JSON.stringify({
          source: 'cart',
          items: items.map((item) => ({
            productId: item.product._id,
            quantity: item.quantity,
          })),
        }),
      )
      setLineItems(items)
      setStatus('idle')
    }

    const loadFromPending = async (pending) => {
      sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(pending))
      setSource(pending.source || 'direct')

      const resolved = await Promise.all(
        pending.items.map(async (item) => {
          const product = await fetchProductById(item.productId)
          return {
            product,
            quantity: Math.max(1, Number(item.quantity) || 1),
          }
        }),
      )

      if (!cancelled) {
        setLineItems(resolved)
        setStatus('idle')
      }
    }

    const loadOrderItems = async () => {
      setStatus('loading')
      setMessage('')

      try {
        if (location.state?.source === 'cart') {
          await loadFromCart()
          return
        }

        if (location.state?.items?.length) {
          await loadFromPending({
            source: location.state.source || 'direct',
            items: location.state.items,
          })
          return
        }

        const saved = readPendingOrder()
        if (saved?.items?.length) {
          await loadFromPending(saved)
          return
        }

        await loadFromCart()
      } catch (error) {
        if (!cancelled) {
          setLineItems([])
          setStatus('error')
          setMessage(error.message || '주문 정보를 불러오지 못했습니다.')
        }
      }
    }

    loadOrderItems()

    return () => {
      cancelled = true
    }
    // cart를 deps에 넣으면 빈 장바구니 refresh 루프로 화면이 깜박임
  }, [authLoading, isLoggedIn, location.state, refreshCart])

  const itemsTotal = useMemo(
    () =>
      lineItems.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity,
        0,
      ),
    [lineItems],
  )

  const totalAmount = itemsTotal + SHIPPING_FEE

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting || lineItems.length === 0) return

    if (!form.recipientName.trim() || !form.phone.trim() || !form.address.trim()) {
      setMessage('수령인, 연락처, 주소는 필수입니다.')
      return
    }

    const paymentConfig = PORTONE_PAYMENT_MAP[form.paymentMethod]
    if (!paymentConfig) {
      setMessage('지원하지 않는 결제 수단입니다.')
      return
    }

    if (!PORTONE_STORE_ID) {
      setMessage(
        '포트원 Store ID가 없습니다. 콘솔 결제연동 화면의 store-... 값을 VITE_PORTONE_STORE_ID에 넣어 주세요.',
      )
      return
    }

    if (!PORTONE_CHANNEL_KEY) {
      setMessage('포트원 채널키가 없습니다. client/.env를 확인해 주세요.')
      return
    }

    setSubmitting(true)
    setMessage('')

    const paymentId = createPaymentId()
    const orderName =
      lineItems.length === 1
        ? lineItems[0].product.name
        : `${lineItems[0].product.name} 외 ${lineItems.length - 1}건`

    const payPayload = buildPortOneV2Payload({
      payMethod: paymentConfig.payMethod,
      paymentId,
      orderName,
      amount: totalAmount,
      buyer: {
        email: user?.email || '',
        name: form.recipientName.trim(),
        tel: form.phone.trim(),
        addr: [form.address.trim(), form.detailAddress.trim()]
          .filter(Boolean)
          .join(' '),
        postcode: form.postalCode.trim() || undefined,
      },
    })
    try {
      const paymentResult = await requestPortOnePayment(payPayload)

      // 2) 결제 성공 시 서버에 주문 생성
      const data = await createOrder(
        {
          items: lineItems.map((item) => ({
            productId: item.product._id,
            quantity: item.quantity,
          })),
          paymentMethod: form.paymentMethod,
          shippingFee: SHIPPING_FEE,
          shippingAddress: {
            recipientName: form.recipientName.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            detailAddress: form.detailAddress.trim() || undefined,
            postalCode: form.postalCode.trim() || undefined,
          },
          orderMemo: [
            form.orderMemo.trim(),
            paymentResult?.paymentId
              ? `paymentId:${paymentResult.paymentId}`
              : `paymentId:${paymentId}`,
            paymentResult?.txId ? `txId:${paymentResult.txId}` : '',
          ]
            .filter(Boolean)
            .join(' | '),
          source,
          markPaid: true,
        },
        token,
      )

      sessionStorage.removeItem(PENDING_ORDER_KEY)
      orderCompletedRef.current = true
      setCompletedOrder(data.order)
      setStatus('done')
      if (source === 'cart') {
        await refreshCart()
      }
    } catch (error) {
      setMessage(error.message || '결제 또는 주문에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || status === 'loading') {
    return (
      <main className="order-page">
        <p className="order-page__status">주문 정보를 준비하는 중...</p>
      </main>
    )
  }

  if (status === 'done' && completedOrder) {
    return (
      <main className="order-page">
        <section className="order-page__success">
          <p className="order-page__eyebrow">Order Complete</p>
          <h1>주문이 완료되었습니다</h1>
          <p className="order-page__success-lead">
            주문번호 <strong>{completedOrder.orderNumber}</strong>
          </p>
          <p className="order-page__success-amount">
            결제금액 {formatPrice(completedOrder.totalAmount)}
          </p>
          <div className="order-page__success-actions">
            <Link to="/orders" className="order-page__primary">
              주문 목록보기
            </Link>
            <Link to="/" className="order-page__secondary">
              쇼핑 계속하기
            </Link>
          </div>
        </section>
      </main>
    )
  }

  if (status === 'empty' || lineItems.length === 0) {
    return (
      <main className="order-page">
        <div className="order-page__empty">
          <h1>주문할 상품이 없습니다</h1>
          <p>상품 상세에서 구매하기를 누르거나 장바구니에서 주문해 주세요.</p>
          <Link to="/">상품 보러가기</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="order-page">
      <header className="order-page__head">
        <div>
          <p className="order-page__eyebrow">Checkout</p>
          <h1>주문 / 결제</h1>
          <p>배송지와 결제 수단을 확인한 뒤 주문을 완료해 주세요.</p>
        </div>
        <Link to={source === 'cart' ? '/cart' : `/products/${lineItems[0].product._id}`}>
          이전으로
        </Link>
      </header>

      {message ? (
        <p className="order-page__message" role="alert">
          {message}
        </p>
      ) : null}

      <div className="order-page__layout">
        <form className="order-page__form" onSubmit={handleSubmit}>
          <section className="order-page__section">
            <h2>배송 정보</h2>
            <div className="order-page__fields">
              <label>
                수령인
                <input
                  name="recipientName"
                  value={form.recipientName}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                />
              </label>
              <label>
                연락처
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder="010-0000-0000"
                  autoComplete="tel"
                />
              </label>
              <label>
                우편번호
                <input
                  name="postalCode"
                  value={form.postalCode}
                  onChange={handleChange}
                  placeholder="선택"
                />
              </label>
              <label className="order-page__full">
                주소
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  required
                  autoComplete="street-address"
                />
              </label>
              <label className="order-page__full">
                상세 주소
                <input
                  name="detailAddress"
                  value={form.detailAddress}
                  onChange={handleChange}
                  placeholder="동/호수 등"
                />
              </label>
              <label className="order-page__full">
                배송 메모
                <input
                  name="orderMemo"
                  value={form.orderMemo}
                  onChange={handleChange}
                  placeholder="문 앞에 놓아주세요"
                />
              </label>
            </div>
          </section>

          <section className="order-page__section">
            <h2>결제 수단</h2>
            <div className="order-page__payments">
              {PAYMENT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={
                    form.paymentMethod === option.value
                      ? 'order-page__pay order-page__pay--active'
                      : 'order-page__pay'
                  }
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.value}
                    checked={form.paymentMethod === option.value}
                    onChange={handleChange}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </section>

          <button
            type="submit"
            className="order-page__submit"
            disabled={submitting}
          >
            {submitting
              ? '결제창 진행 중...'
              : `${formatPrice(totalAmount)} 결제하기`}
          </button>
        </form>

        <aside className="order-page__summary">
          <h2>주문 상품</h2>
          <ul className="order-page__items">
            {lineItems.map(({ product, quantity }) => (
              <li key={product._id}>
                <div
                  className="order-page__thumb"
                  style={{ backgroundImage: `url('${product.image}')` }}
                />
                <div>
                  <p className="order-page__item-name">{product.name}</p>
                  <p className="order-page__item-meta">
                    {product.category} · {quantity}개
                  </p>
                  <p className="order-page__item-price">
                    {formatPrice(Number(product.price) * quantity)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <dl className="order-page__totals">
            <div>
              <dt>상품금액</dt>
              <dd>{formatPrice(itemsTotal)}</dd>
            </div>
            <div>
              <dt>배송비</dt>
              <dd>{SHIPPING_FEE === 0 ? '무료' : formatPrice(SHIPPING_FEE)}</dd>
            </div>
            <div className="order-page__totals-final">
              <dt>총 결제금액</dt>
              <dd>{formatPrice(totalAmount)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  )
}

export default OrderCheckout
