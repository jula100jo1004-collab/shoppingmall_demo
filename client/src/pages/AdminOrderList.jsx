import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchOrders, updateOrder } from '@/api/client'
import { useAuth } from '@/context/AuthContext'

const STATUS_TABS = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '주문접수' },
  { value: 'paid', label: '결제완료' },
  { value: 'preparing', label: '상품준비중' },
  { value: 'shipping', label: '배송중' },
  { value: 'delivered', label: '배송완료' },
  { value: 'cancelled', label: '취소됨' },
]

const STATUS_LABELS = Object.fromEntries(
  STATUS_TABS.filter((tab) => tab.value !== 'all').map((tab) => [
    tab.value,
    tab.label,
  ]),
)

const PAYMENT_LABELS = {
  card: '신용카드',
  transfer: '계좌이체',
  trans: '계좌이체',
  vbank: '무통장',
  phone: '휴대폰',
  kakao: '카카오페이',
  toss: '토스페이',
}

function formatPrice(price) {
  return `${Number(price).toLocaleString('ko-KR')}원`
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

function AdminOrderList() {
  const navigate = useNavigate()
  const { isAdmin, isLoggedIn, loading, user, token, logout } = useAuth()
  const [orders, setOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    if (!loading && (!isLoggedIn || !isAdmin)) {
      navigate('/', { replace: true })
    }
  }, [isAdmin, isLoggedIn, loading, navigate])

  useEffect(() => {
    if (loading || !isAdmin) return undefined

    let cancelled = false

    const loadOrders = async () => {
      setStatus('loading')
      setMessage('')
      try {
        const data = await fetchOrders(token)
        if (!cancelled) {
          setOrders(Array.isArray(data) ? data : [])
          setStatus('idle')
        }
      } catch (error) {
        if (!cancelled) {
          setOrders([])
          setStatus('error')
          setMessage(error.message || '주문 목록을 불러오지 못했습니다.')
        }
      }
    }

    loadOrders()

    return () => {
      cancelled = true
    }
  }, [isAdmin, loading, token])

  const statusCounts = useMemo(() => {
    const counts = { all: orders.length }
    for (const tab of STATUS_TABS) {
      if (tab.value !== 'all') counts[tab.value] = 0
    }
    for (const order of orders) {
      const key = order.status || 'pending'
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [orders])

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders
    return orders.filter((order) => (order.status || 'pending') === statusFilter)
  }, [orders, statusFilter])

  const totalAmount = useMemo(
    () =>
      filteredOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    [filteredOrders],
  )

  const handleStatusChange = async (order, nextStatus) => {
    if (!nextStatus || nextStatus === order.status) return

    setBusyId(order._id)
    setMessage('')
    try {
      const updated = await updateOrder(order._id, { status: nextStatus }, token)
      const nextOrder = updated?.order || updated
      setOrders((prev) =>
        prev.map((item) =>
          item._id === order._id
            ? {
                ...item,
                status: nextOrder.status || nextStatus,
                paymentStatus: nextOrder.paymentStatus || item.paymentStatus,
              }
            : item,
        ),
      )
      setMessage(
        nextStatus === 'cancelled'
          ? `주문 ${order.orderNumber}이(가) 취소되었습니다.`
          : `주문 ${order.orderNumber} 상태가 변경되었습니다.`,
      )
      setStatus('idle')
    } catch (error) {
      setStatus('error')
      setMessage(error.message || '주문 상태 변경에 실패했습니다.')
    } finally {
      setBusyId('')
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
              <p className="admin-product__eyebrow">Order Management</p>
              <h1>주문관리</h1>
              <p>전체 주문을 확인하고 상태를 변경할 수 있습니다.</p>
            </div>
            <div className="admin-product-list__actions">
              <Link className="admin-dash__create-btn" to="/admin/products">
                상품관리
              </Link>
              <Link className="admin-product__back" to="/admin">
                대시보드로
              </Link>
            </div>
          </header>

          <div className="admin-order-list__summary">
            <div>
              <span>조회 건수</span>
              <strong>{filteredOrders.length}</strong>
            </div>
            <div>
              <span>합계 금액</span>
              <strong>{formatPrice(totalAmount)}</strong>
            </div>
          </div>

          <div className="admin-product-list__filters">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={
                  statusFilter === tab.value
                    ? 'admin-product-list__chip admin-product-list__chip--active'
                    : 'admin-product-list__chip'
                }
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label} ({statusCounts[tab.value] || 0})
              </button>
            ))}
          </div>

          {message ? (
            <p
              className={`admin-product__message admin-product__message--${
                status === 'error' ? 'error' : 'success'
              }`}
              role="status"
            >
              {message}
            </p>
          ) : null}

          {status === 'loading' ? (
            <p className="admin-product-list__empty">주문 목록을 불러오는 중...</p>
          ) : filteredOrders.length === 0 ? (
            <div className="admin-product-list__empty">
              <p>
                {statusFilter === 'all'
                  ? '등록된 주문이 없습니다.'
                  : `${STATUS_LABELS[statusFilter]} 주문이 없습니다.`}
              </p>
            </div>
          ) : (
            <div className="admin-dash__table-wrap">
              <table className="admin-dash__table admin-order-list__table">
                <thead>
                  <tr>
                    <th>주문번호</th>
                    <th>주문자</th>
                    <th>상품</th>
                    <th>결제</th>
                    <th>금액</th>
                    <th>상태</th>
                    <th>주문일시</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const firstItem = order.items?.[0]
                    const extraCount = Math.max((order.items?.length || 0) - 1, 0)
                    const buyerName = order.user?.name || '-'
                    const buyerEmail = order.user?.email || ''

                    return (
                      <tr key={order._id}>
                        <td>
                          <p className="admin-order-list__number">
                            {order.orderNumber}
                          </p>
                          <p className="admin-order-list__sub">
                            {order.shippingAddress?.recipientName || '-'}
                          </p>
                        </td>
                        <td>
                          <p className="admin-order-list__buyer">{buyerName}</p>
                          {buyerEmail ? (
                            <p className="admin-order-list__sub">{buyerEmail}</p>
                          ) : null}
                        </td>
                        <td>
                          <div className="admin-order-list__product">
                            {firstItem?.image ? (
                              <img
                                className="admin-order-list__thumb"
                                src={firstItem.image}
                                alt={firstItem.name || '상품'}
                              />
                            ) : null}
                            <div>
                              <p className="admin-order-list__product-name">
                                {firstItem?.name || '상품 없음'}
                              </p>
                              <p className="admin-order-list__sub">
                                {extraCount > 0
                                  ? `외 ${extraCount}건 · 총 ${order.items.length}종`
                                  : `${firstItem?.quantity || 0}개`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          {PAYMENT_LABELS[order.paymentMethod] ||
                            order.paymentMethod}
                          <p className="admin-order-list__sub">
                            {order.paymentStatus === 'paid'
                              ? '결제완료'
                              : order.paymentStatus || '-'}
                          </p>
                        </td>
                        <td className="admin-order-list__amount">
                          {formatPrice(order.totalAmount)}
                        </td>
                        <td>
                          <div className="admin-order-list__status-cell">
                            <select
                              className="admin-order-list__status"
                              value={order.status || 'pending'}
                              disabled={busyId === order._id}
                              onChange={(event) =>
                                handleStatusChange(order, event.target.value)
                              }
                            >
                              {STATUS_TABS.filter((tab) => tab.value !== 'all').map(
                                (tab) => (
                                  <option key={tab.value} value={tab.value}>
                                    {tab.label}
                                  </option>
                                ),
                              )}
                            </select>
                            {order.status !== 'cancelled' ? (
                              <button
                                type="button"
                                className="admin-order-list__cancel"
                                disabled={busyId === order._id}
                                onClick={() => {
                                  const ok = window.confirm(
                                    `주문 ${order.orderNumber}을(를) 취소할까요?`,
                                  )
                                  if (!ok) return
                                  handleStatusChange(order, 'cancelled')
                                }}
                              >
                                주문취소
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminOrderList
