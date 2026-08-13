import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'

const CATEGORY_TABS = ['NEW', 'BEST', 'SALE', 'EVENT', 'MADE']

function Navbar() {
  const { user, isLoggedIn, isAdmin, logout, loading } = useAuth()
  const { itemCount } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('NEW')

  const cartBadge = itemCount > 99 ? '99+' : String(itemCount)

  return (
    <header className="mall-header">
      <div className="mall-header__inner">
        <div className="mall-header__bar">
          <button
            type="button"
            className="mall-header__icon-btn"
            aria-label="메뉴 열기"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className="mall-header__burger" />
          </button>

          <Link
            className="mall-header__brand"
            to="/"
            onClick={() => setMenuOpen(false)}
          >
            lumi nest
          </Link>

          <div className="mall-header__tools">
            <div className="mall-header__auth">
              {loading ? (
                <span className="mall-header__auth-status">확인 중...</span>
              ) : isLoggedIn ? (
                <details className="mall-header__account">
                  <summary className="mall-header__account-trigger">
                    <span className="mall-header__welcome">
                      {user.name}님 환영합니다.
                    </span>
                    <span className="mall-header__account-caret" aria-hidden="true">
                      ▾
                    </span>
                  </summary>
                  <div className="mall-header__account-menu">
                    <Link
                      to="/orders"
                      className="mall-header__account-item"
                      onClick={(event) => {
                        event.currentTarget
                          .closest('details')
                          ?.removeAttribute('open')
                      }}
                    >
                      내 주문 목록
                    </Link>
                    {isAdmin ? (
                      <NavLink
                        className="mall-header__account-item"
                        to="/admin"
                        onClick={(event) => {
                          event.currentTarget
                            .closest('details')
                            ?.removeAttribute('open')
                        }}
                      >
                        어드민
                      </NavLink>
                    ) : null}
                    <button
                      type="button"
                      className="mall-header__account-item mall-header__account-item--danger"
                      onClick={logout}
                    >
                      로그아웃
                    </button>
                  </div>
                </details>
              ) : (
                <Link className="mall-header__login" to="/login">
                  로그인
                </Link>
              )}
            </div>

            <button
              type="button"
              className="mall-header__icon-btn"
              aria-label="검색"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </button>

            <Link
              to={isLoggedIn ? '/cart' : '/login'}
              className="mall-header__icon-btn mall-header__cart"
              aria-label={`장바구니${itemCount ? `, ${itemCount}개` : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 8h12l-1 11H7L6 8z" />
                <path d="M9 8V7a3 3 0 0 1 6 0v1" />
              </svg>
              {itemCount > 0 ? (
                <span className="mall-header__cart-badge">{cartBadge}</span>
              ) : null}
            </Link>
          </div>
        </div>

        <nav className="mall-header__tabs" aria-label="카테고리">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={
                activeTab === tab
                  ? 'mall-header__tab mall-header__tab--active'
                  : 'mall-header__tab'
              }
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {menuOpen ? (
        <div className="mall-header__drawer">
          <div className="mall-header__inner">
            <NavLink to="/" end onClick={() => setMenuOpen(false)}>
              홈
            </NavLink>
            <Link to="/cart" onClick={() => setMenuOpen(false)}>
              장바구니{itemCount > 0 ? ` (${itemCount})` : ''}
            </Link>
            {isLoggedIn ? (
              <Link to="/orders" onClick={() => setMenuOpen(false)}>
                내 주문 목록
              </Link>
            ) : null}
            {isAdmin ? (
              <NavLink to="/admin" onClick={() => setMenuOpen(false)}>
                어드민
              </NavLink>
            ) : null}
            {loading ? (
              <span>확인 중...</span>
            ) : isLoggedIn ? (
              <>
                <p>{user?.name}님 환영합니다.</p>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    setMenuOpen(false)
                  }}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)}>
                  로그인
                </Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)}>
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}

export default Navbar
