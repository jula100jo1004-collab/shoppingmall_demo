import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { removeCartItem, updateCartItem } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'

function formatPrice(price) {
  return `₩${Number(price).toLocaleString('ko-KR')}`
}

function Cart() {
  const navigate = useNavigate()
  const { isLoggedIn, loading: authLoading, token } = useAuth()
  const { cart, setCart, loading, refreshCart } = useCart()
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate('/login', { replace: true })
    }
  }, [authLoading, isLoggedIn, navigate])

  useEffect(() => {
    if (isLoggedIn) {
      refreshCart()
    }
  }, [isLoggedIn, refreshCart])

  const items = cart?.items || []

  const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = Number(item.product?.price) || 0
      return sum + price * (Number(item.quantity) || 0)
    }, 0)
  }, [items])

  const handleQuantityChange = async (productId, quantity) => {
    if (quantity < 1) return
    setBusyId(productId)
    setMessage('')
    try {
      const data = await updateCartItem(productId, quantity, token)
      setCart(data.cart)
    } catch (error) {
      setMessage(error.message || '수량 변경에 실패했습니다.')
    } finally {
      setBusyId('')
    }
  }

  const handleRemove = async (productId) => {
    setBusyId(productId)
    setMessage('')
    try {
      const data = await removeCartItem(productId, token)
      setCart(data.cart)
    } catch (error) {
      setMessage(error.message || '상품 삭제에 실패했습니다.')
    } finally {
      setBusyId('')
    }
  }

  if (authLoading || (isLoggedIn && loading && !cart)) {
    return (
      <main className="cart-page">
        <p className="cart-page__status">장바구니를 불러오는 중...</p>
      </main>
    )
  }

  return (
    <main className="cart-page">
      <header className="cart-page__head">
        <h1>장바구니</h1>
        <Link to="/">쇼핑 계속하기</Link>
      </header>

      {message ? <p className="cart-page__message">{message}</p> : null}

      {items.length === 0 ? (
        <div className="cart-page__empty">
          <p>장바구니에 담긴 상품이 없습니다.</p>
          <Link to="/">상품 보러가기</Link>
        </div>
      ) : (
        <>
          <ul className="cart-page__list">
            {items.map((item) => {
              const product = item.product
              if (!product) return null
              const productId = product._id
              const lineTotal = Number(product.price) * Number(item.quantity)

              return (
                <li key={productId} className="cart-page__item">
                  <Link
                    className="cart-page__thumb"
                    to={`/products/${productId}`}
                    style={{ backgroundImage: `url('${product.image}')` }}
                    aria-label={product.name}
                  />
                  <div className="cart-page__info">
                    <Link to={`/products/${productId}`}>
                      <h2>{product.name}</h2>
                    </Link>
                    <p className="cart-page__category">{product.category}</p>
                    <p className="cart-page__price">{formatPrice(product.price)}</p>

                    <div className="cart-page__controls">
                      <div className="cart-page__stepper">
                        <button
                          type="button"
                          disabled={busyId === productId || item.quantity <= 1}
                          onClick={() =>
                            handleQuantityChange(productId, item.quantity - 1)
                          }
                          aria-label="수량 감소"
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          disabled={busyId === productId}
                          onClick={() =>
                            handleQuantityChange(productId, item.quantity + 1)
                          }
                          aria-label="수량 증가"
                        >
                          +
                        </button>
                      </div>
                      <p className="cart-page__line-total">
                        {formatPrice(lineTotal)}
                      </p>
                      <button
                        type="button"
                        className="cart-page__remove"
                        disabled={busyId === productId}
                        onClick={() => handleRemove(productId)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <footer className="cart-page__footer">
            <div>
              <span>총 주문금액</span>
              <strong>{formatPrice(totalPrice)}</strong>
            </div>
            <button
              type="button"
              className="cart-page__checkout"
              onClick={() =>
                navigate('/order', {
                  state: { source: 'cart' },
                })
              }
            >
              주문하기
            </button>
          </footer>
        </>
      )}
    </main>
  )
}

export default Cart
