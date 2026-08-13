import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import Navbar from '@/components/Navbar'
import Home from '@/pages/Home'
import Signup from '@/pages/Signup'
import Login from '@/pages/Login'
import Admin from '@/pages/Admin'
import AdminOrderList from '@/pages/AdminOrderList'
import ProductCreate from '@/pages/ProductCreate'
import ProductEdit from '@/pages/ProductEdit'
import ProductList from '@/pages/ProductList'
import ProductDetail from '@/pages/ProductDetail'
import Cart from '@/pages/Cart'
import OrderCheckout from '@/pages/OrderCheckout'
import OrderList from '@/pages/OrderList'
import ForgotPassword from '@/pages/ForgotPassword'

function StoreLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <Outlet />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/orders" element={<AdminOrderList />} />
            <Route path="/admin/products" element={<ProductList />} />
            <Route path="/admin/products/new" element={<ProductCreate />} />
            <Route path="/admin/products/:id/edit" element={<ProductEdit />} />
            <Route element={<StoreLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/order" element={<OrderCheckout />} />
              <Route path="/orders" element={<OrderList />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
