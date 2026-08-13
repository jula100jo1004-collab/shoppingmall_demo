const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

async function request(path, options = {}) {
  const { headers, ...rest } = options

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || `API request failed: ${response.status}`)
  }

  return data
}

export async function fetchHealth() {
  return request('/health')
}

/** POST /api/users → userController.createUser */
export async function createUser(userData) {
  return request('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
}

/** POST /api/auth/login → authController.login */
export async function loginUser({ email, password }) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

/** GET /api/auth/me → authController.getMe */
export async function fetchCurrentUser(token) {
  return request('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

/** POST /api/auth/forgot-password */
export async function forgotPassword({ email, name }) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email, name }),
  })
}

/** POST /api/auth/reset-password */
export async function resetPassword({ email, resetToken, newPassword }) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, resetToken, newPassword }),
  })
}

/** GET /api/products?page=1&limit=2 */
export async function fetchProducts(params = {}) {
  const query = new URLSearchParams()

  if (params.category) {
    query.set('category', params.category)
  }

  query.set('page', String(params.page || 1))
  query.set('limit', String(params.limit || 2))

  const queryString = query.toString()
  return request(`/products?${queryString}`)
}

/** GET /api/products/:id */
export async function fetchProductById(id) {
  return request(`/products/${id}`)
}

/** POST /api/products (admin) */
export async function createProduct(productData, token) {
  const authToken = token || localStorage.getItem('token')

  if (!authToken) {
    throw new Error('로그인이 필요합니다.')
  }

  return request('/products', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(productData),
  })
}

/** PUT /api/products/:id (admin) */
export async function updateProduct(id, productData, token) {
  const authToken = token || localStorage.getItem('token')

  if (!authToken) {
    throw new Error('로그인이 필요합니다.')
  }

  return request(`/products/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(productData),
  })
}

/** DELETE /api/products/:id (admin) */
export async function deleteProduct(id, token) {
  const authToken = token || localStorage.getItem('token')

  if (!authToken) {
    throw new Error('로그인이 필요합니다.')
  }

  return request(`/products/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })
}

function getAuthToken(token) {
  const authToken = token || localStorage.getItem('token')
  if (!authToken) {
    throw new Error('로그인이 필요합니다.')
  }
  return authToken
}

/** GET /api/cart */
export async function fetchCart(token) {
  const authToken = getAuthToken(token)
  return request('/cart', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })
}

/** POST /api/cart/items */
export async function addCartItem({ productId, quantity = 1 }, token) {
  const authToken = getAuthToken(token)
  return request('/cart/items', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ productId, quantity }),
  })
}

/** PUT /api/cart/items/:productId */
export async function updateCartItem(productId, quantity, token) {
  const authToken = getAuthToken(token)
  return request(`/cart/items/${productId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ quantity }),
  })
}

/** DELETE /api/cart/items/:productId */
export async function removeCartItem(productId, token) {
  const authToken = getAuthToken(token)
  return request(`/cart/items/${productId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })
}

/** DELETE /api/cart */
export async function clearCart(token) {
  const authToken = getAuthToken(token)
  return request('/cart', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })
}

/** POST /api/orders */
export async function createOrder(orderData, token) {
  const authToken = getAuthToken(token)
  return request('/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(orderData),
  })
}

/** GET /api/orders */
export async function fetchOrders(token) {
  const authToken = getAuthToken(token)
  return request('/orders', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })
}

/** GET /api/orders/:id */
export async function fetchOrderById(id, token) {
  const authToken = getAuthToken(token)
  return request(`/orders/${id}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })
}

/** PUT /api/orders/:id */
export async function updateOrder(id, orderData, token) {
  const authToken = getAuthToken(token)
  return request(`/orders/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(orderData),
  })
}

export { API_BASE_URL }
