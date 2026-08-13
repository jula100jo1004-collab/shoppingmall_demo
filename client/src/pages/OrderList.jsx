import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchOrders, updateOrder } from '@/api/client'
import { useAuth } from '@/context/AuthContext'

/** Order.js status enum 과 동일한 순서 */
const ORDER_STATUS_TABS = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '주문접수' },
  { value: 'paid', label: '결제완료' },
  { value: 'preparing', label: '상품준비중' },
  { value: 'shipping', label: '배송중' },
  { value: 'delivered', label: '배송완료' },
  { value: 'cancelled', label: '취소됨' },
]

const CANCELABLE_STATUSES = new Set(['pending', 'paid', 'preparing'])

const STATUS_LABELS = Object.fromEntries(
  ORDER_STATUS_TABS.filter((tab) => tab.value !== 'all').map((tab) => [
    tab.value,
    tab.label,
  ]),
)

const PAYMENT_LABELS = {
  card: '신용/체크카드',
  transfer: '계좌이체',
  trans: '계좌이체',
  vbank: '무통장입금',
  phone: '휴대폰결제',
  kakao: '카카오페이',
  toss: '토스페이',
}

function formatPrice(price) {
  return `₩${Number(price).toLocaleString('ko-KR')}`
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function OrderList() {
  const navigate = useNavigate()
  const { isLoggedIn, loading: authLoading, token } = useAuth()
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate('/login', { replace: true, state: { from: '/orders' } })
    }
  }, [authLoading, isLoggedIn, navigate])

  useEffect(() => {
    if (authLoading || !isLoggedIn) return

    let cancelled = false

    async function loadOrders() {
      setStatus('loading')
      setMessage('')
      try {
        const data = await fetchOrders(token)
        if (cancelled) return
        setOrders(Array.isArray(data) ? data : [])
        setStatus('ready')
      } catch (error) {
        if (cancelled) return
        setMessage(error.message || '주문 목록을 불러오지 못했습니다.')
        setStatus('error')
      }
    }

    loadOrders()

    return () => {
      cancelled = true
    }
  }, [authLoading, isLoggedIn, token])

  const handleCancelOrder = async (order) => {
    const ok = window.confirm(
      `주문 ${order.orderNumber}을(를) 취소할까요?`,
    )
    if (!ok) return

    setBusyId(order._id)
    setMessage('')
    try {
      const updated = await updateOrder(order._id, { status: 'cancelled' }, token)
      const nextOrder = updated?.order || updated
      setOrders((prev) =>
        prev.map((item) =>
          item._id === order._id
            ? {
                ...item,
                status: nextOrder.status || 'cancelled',
                paymentStatus: nextOrder.paymentStatus || item.paymentStatus,
              }
            : item,
        ),
      )
      setMessage(`주문 ${order.orderNumber}이(가) 취소되었습니다.`)
    } catch (error) {
      setMessage(error.message || '주문 취소에 실패했습니다.')
    } finally {
      setBusyId('')
    }
  }
  const statusCounts = useMemo(() => {
    const counts = { all: orders.length }
    for (const tab of ORDER_STATUS_TABS) {
      if (tab.value === 'all') continue
      counts[tab.value] = 0
    }
    for (const order of orders) {
      const key = order.status || 'pending'
      if (counts[key] == null) counts[key] = 0
      counts[key] += 1
    }
    return counts
  }, [orders])

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders
    return orders.filter((order) => (order.status || 'pending') === activeTab)
  }, [orders, activeTab])

  if (authLoading || status === 'loading') {
    return (
      <main className="orders-page">
        <p className="orders-page__status">주문 목록을 불러오는 중...</p>
      </main>
    )
  }

  return (
    <main className="orders-page">
      <header className="orders-page__head">
        <div>
          <p className="orders-page__eyebrow">My Orders</p>
          <h1>내 주문</h1>
          <p className="orders-page__lead">결제한 주문 내역을 확인할 수 있습니다.</p>
        </div>
        <Link to="/">쇼핑 계속하기</Link>
      </header>

      <nav className="orders-page__tabs" aria-label="주문 상태">
        {ORDER_STATUS_TABS.map((tab) => {
          const count = statusCounts[tab.value] || 0
          const isActive = activeTab === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              className={
                isActive
                  ? 'orders-page__tab orders-page__tab--active'
                  : 'orders-page__tab'
              }
              aria-pressed={isActive}
              onClick={() => setActiveTab(tab.value)}
            >
              <span>{tab.label}</span>
              <em>{count}</em>
            </button>
          )
        })}
      </nav>

      {message ? (
        <p className="orders-page__message" role="alert">
          {message}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <div className="orders-page__empty">
          <h2>아직 주문이 없습니다</h2>
          <p>마음에 드는 상품을 담아 첫 주문을 완료해 보세요.</p>
          <Link to="/" className="orders-page__primary">
            상품 보러가기
          </Link>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="orders-page__empty">
          <h2>{STATUS_LABELS[activeTab] || '해당'} 주문이 없습니다</h2>
          <p>다른 상태 탭을 선택해 보세요.</p>
          <button
            type="button"
            className="orders-page__primary"
            onClick={() => setActiveTab('all')}
          >
            전체 보기
          </button>
        </div>
      ) : (
        <ul className="orders-page__list">
          {filteredOrders.map((order) => {
            const statusKey = order.status || 'pending'
            const itemCount = (order.items || []).reduce(
              (sum, item) => sum + Number(item.quantity || 0),
              0,
            )
            const previewItems = (order.items || []).slice(0, 3)

            return (
              <li key={order._id} className="orders-page__card">
                <div className="orders-page__card-top">
                  <div>
                    <p className="orders-page__number">{order.orderNumber}</p>
                    <p className="orders-page__date">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="orders-page__status-actions">
                    <span
                      className={`orders-page__badge orders-page__badge--${statusKey}`}
                    >
                      {STATUS_LABELS[statusKey] || statusKey}
                    </span>
                    {CANCELABLE_STATUSES.has(statusKey) ? (
                      <button
                        type="button"
                        className="orders-page__cancel"
                        disabled={busyId === order._id}
                        onClick={() => handleCancelOrder(order)}
                      >
                        {busyId === order._id ? '취소 중...' : '주문취소'}
                      </button>
                    ) : null}
                  </div>
                </div>

                <ul className="orders-page__items">
                  {previewItems.map((item, index) => (
                    <li key={`${order._id}-${item.productId || index}`}>
                      <img
                        className="orders-page__thumb"
                        src={item.image}
                        alt={item.name}
                      />
                      <div>
                        <p className="orders-page__item-name">{item.name}</p>
                        <p className="orders-page__item-meta">
                          {formatPrice(item.price)} · {item.quantity}개
                        </p>
                      </div>
                      <p className="orders-page__item-total">
                        {formatPrice(item.lineTotal)}
                      </p>
                    </li>
                  ))}
                </ul>

                {(order.items || []).length > 3 ? (
                  <p className="orders-page__more">
                    외 {(order.items || []).length - 3}개 상품
                  </p>
                ) : null}

                <div className="orders-page__card-foot">
                  <div className="orders-page__meta">
                    <span>
                      {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
                    </span>
                    <span>상품 {itemCount}개</span>
                    {order.shippingAddress?.recipientName ? (
                      <span>{order.shippingAddress.recipientName}</span>
                    ) : null}
                  </div>
                  <p className="orders-page__amount">
                    {formatPrice(order.totalAmount)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

export default OrderList
