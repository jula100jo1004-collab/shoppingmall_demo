import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const SIDE_ICONS = [
  { label: '홈', mark: 'H' },
  { label: '회원', mark: 'U' },
  { label: '목록', mark: 'L' },
  { label: '주문', mark: 'O' },
  { label: '상품', mark: 'P' },
  { label: '배송', mark: 'D' },
  { label: '설정', mark: 'S' },
]

const SIDE_MENUS = [
  '쇼핑몰설정',
  '주문내역',
  '개인결제관리',
  '물류관리',
  '상품관리',
  '상품문의',
  '사용후기',
  '상품평가관리',
  '상품옵션재고관리',
  '쿠폰관리',
  '배송사관리',
  '회원관리',
]

const ORDER_CHART = [
  { date: '03-21', order: 42, cancel: 8 },
  { date: '03-22', order: 55, cancel: 12 },
  { date: '03-23', order: 38, cancel: 6 },
  { date: '03-24', order: 70, cancel: 14 },
  { date: '03-25', order: 48, cancel: 9 },
  { date: '03-26', order: 62, cancel: 11 },
  { date: '03-27', order: 80, cancel: 16 },
]

const PROCESS_ORDERS = [
  { status: '주문 → 입금', count: 12, amount: '1,240,000' },
  { status: '입금 → 준비', count: 8, amount: '890,000' },
  { status: '준비 → 배송', count: 15, amount: '1,520,000' },
  { status: '배송 → 완료', count: 21, amount: '2,180,000' },
]

const PAYMENT_ROWS = [
  {
    method: '신용카드',
    values: [
      [18, '1,820,000'],
      [22, '2,140,000'],
      [25, '2,560,000'],
    ],
  },
  {
    method: '계좌이체',
    values: [
      [4, '320,000'],
      [5, '410,000'],
      [3, '280,000'],
    ],
  },
  {
    method: '가상계좌',
    values: [
      [6, '540,000'],
      [7, '610,000'],
      [8, '720,000'],
    ],
  },
  {
    method: '무통장',
    values: [
      [3, '210,000'],
      [2, '150,000'],
      [4, '290,000'],
    ],
  },
  {
    method: '휴대폰',
    values: [
      [2, '98,000'],
      [1, '45,000'],
      [3, '132,000'],
    ],
  },
  {
    method: '포인트',
    values: [
      [5, '50,000'],
      [4, '40,000'],
      [6, '60,000'],
    ],
  },
  {
    method: '쿠폰',
    values: [
      [7, '70,000'],
      [9, '90,000'],
      [8, '80,000'],
    ],
  },
]

const INQUIRIES = [
  { user: 'mina01', text: '배송 일정 문의드립니다.' },
  { user: 'park_k', text: '사이즈 교환 가능할까요?' },
  { user: 'lee_j', text: '결제 취소 요청합니다.' },
]

const PRODUCT_QNA = [
  { user: 'yoon_a', text: '원단 두께가 어느 정도인가요?' },
  { user: 'choi88', text: '색상 차이 많이 나나요?' },
  { user: 'han_s', text: '세탁 방법을 알려주세요.' },
]

const REVIEWS = [
  { user: 'kim_b', text: '아이가 너무 좋아해요. 추천합니다!' },
  { user: 'jung_m', text: '배송도 빠르고 품질이 좋아요.' },
  { user: 'oh_y', text: '사이즈가 조금 작게 나온 것 같아요.' },
]

function Admin() {
  const navigate = useNavigate()
  const { user, isAdmin, loading, isLoggedIn, logout } = useAuth()
  const [activeMenu, setActiveMenu] = useState('주문내역')
  const maxOrder = Math.max(...ORDER_CHART.map((item) => item.order))

  useEffect(() => {
    if (!loading && (!isLoggedIn || !isAdmin)) {
      navigate('/', { replace: true })
    }
  }, [isAdmin, isLoggedIn, loading, navigate])

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
          <Link to="/" className="admin-dash__icon-link" aria-label="홈">
            Home
          </Link>
          <button type="button" className="admin-dash__icon-link" aria-label="알림">
            Alert
          </button>
          <span>부가서비스</span>
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

      <div className="admin-dash__body">
        <aside className="admin-dash__rail" aria-label="모듈">
          {SIDE_ICONS.map((icon) => (
            <button
              key={icon.label}
              type="button"
              className="admin-dash__rail-btn"
              aria-label={icon.label}
              title={icon.label}
              onClick={() => {
                if (icon.label === '홈') {
                  navigate('/admin')
                  return
                }
                if (icon.label === '주문') {
                  navigate('/admin/orders')
                  return
                }
                if (icon.label === '상품') {
                  navigate('/admin/products')
                }
              }}
            >
              {icon.mark}
            </button>
          ))}
        </aside>

        <aside className="admin-dash__sidebar">
          <p className="admin-dash__sidebar-title">쇼핑몰관리</p>
          <nav>
            {SIDE_MENUS.map((menu) => (
              <button
                key={menu}
                type="button"
                className={
                  activeMenu === menu
                    ? 'admin-dash__menu admin-dash__menu--active'
                    : 'admin-dash__menu'
                }
                onClick={() => {
                  if (menu === '상품관리') {
                    navigate('/admin/products')
                    return
                  }
                  if (menu === '주문내역') {
                    navigate('/admin/orders')
                    return
                  }
                  setActiveMenu(menu)
                }}
              >
                {menu}
              </button>
            ))}
          </nav>
        </aside>

        <main className="admin-dash__main">
          <div className="admin-dash__main-head">
            <h1>쇼핑몰관리</h1>
            <div className="admin-dash__main-actions">
              <Link className="admin-dash__create-btn" to="/admin/orders">
                주문관리
              </Link>
              <Link className="admin-dash__create-btn admin-dash__create-btn--ghost" to="/admin/products/new">
                새상품 등록하기
              </Link>
            </div>
          </div>

          <section className="admin-dash__top-grid">
            <article className="admin-dash__card">
              <header className="admin-dash__card-head">
                <h2>주문현황</h2>
                <div className="admin-dash__legend">
                  <span>
                    <i className="admin-dash__dot admin-dash__dot--order" /> 주문
                  </span>
                  <span>
                    <i className="admin-dash__dot admin-dash__dot--cancel" /> 취소
                  </span>
                </div>
              </header>
              <div className="admin-dash__chart" role="img" aria-label="주문현황 막대 그래프">
                {ORDER_CHART.map((item) => (
                  <div key={item.date} className="admin-dash__chart-col">
                    <div className="admin-dash__bars">
                      <span
                        className="admin-dash__bar admin-dash__bar--order"
                        style={{ height: `${(item.order / maxOrder) * 100}%` }}
                        title={`주문 ${item.order}`}
                      />
                      <span
                        className="admin-dash__bar admin-dash__bar--cancel"
                        style={{ height: `${(item.cancel / maxOrder) * 100}%` }}
                        title={`취소 ${item.cancel}`}
                      />
                    </div>
                    <p>{item.date}</p>
                  </div>
                ))}
              </div>
            </article>

            <div className="admin-dash__side-cards">
              <article className="admin-dash__card">
                <header className="admin-dash__card-head">
                  <h2>처리할 주문</h2>
                </header>
                <table className="admin-dash__table">
                  <thead>
                    <tr>
                      <th>상태변경</th>
                      <th>건수</th>
                      <th>금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROCESS_ORDERS.map((row) => (
                      <tr key={row.status}>
                        <td>{row.status}</td>
                        <td>{row.count}</td>
                        <td>{row.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>

              <article className="admin-dash__card">
                <header className="admin-dash__card-head">
                  <h2>재고현황</h2>
                </header>
                <table className="admin-dash__table admin-dash__table--compact">
                  <thead>
                    <tr>
                      <th>재고부족 상품</th>
                      <th>재고부족 옵션</th>
                      <th>SMS 잔여금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>7</td>
                      <td>9</td>
                      <td>0원</td>
                    </tr>
                  </tbody>
                </table>
              </article>
            </div>
          </section>

          <section className="admin-dash__card">
            <header className="admin-dash__card-head">
              <h2>결제수단별 주문현황</h2>
            </header>
            <div className="admin-dash__table-wrap">
              <table className="admin-dash__table admin-dash__table--payment">
                <thead>
                  <tr>
                    <th rowSpan={2}>결제수단</th>
                    <th colSpan={2}>03-25</th>
                    <th colSpan={2}>03-26</th>
                    <th colSpan={2}>03-27</th>
                  </tr>
                  <tr>
                    <th>건수</th>
                    <th>금액</th>
                    <th>건수</th>
                    <th>금액</th>
                    <th>건수</th>
                    <th>금액</th>
                  </tr>
                </thead>
                <tbody>
                  {PAYMENT_ROWS.map((row) => (
                    <tr key={row.method}>
                      <td>{row.method}</td>
                      {row.values.flat().map((value, index) => (
                        <td key={`${row.method}-${index}`}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-dash__bottom-grid">
            <article className="admin-dash__card">
              <header className="admin-dash__card-head">
                <h2>1:1 문의</h2>
              </header>
              <ul className="admin-dash__list">
                {INQUIRIES.map((item) => (
                  <li key={item.user}>
                    <strong>{item.user}</strong>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="admin-dash__card">
              <header className="admin-dash__card-head">
                <h2>상품문의</h2>
              </header>
              <ul className="admin-dash__list">
                {PRODUCT_QNA.map((item) => (
                  <li key={item.user}>
                    <strong>{item.user}</strong>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="admin-dash__card">
              <header className="admin-dash__card-head">
                <h2>사용후기</h2>
              </header>
              <ul className="admin-dash__list">
                {REVIEWS.map((item) => (
                  <li key={item.user}>
                    <strong>{item.user}</strong>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </main>
      </div>
    </div>
  )
}

export default Admin
