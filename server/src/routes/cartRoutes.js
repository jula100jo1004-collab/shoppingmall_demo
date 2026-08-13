const express = require("express");
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controllers/cartController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// GET    /api/cart                     — 내 장바구니 조회
// POST   /api/cart/items               — 상품 추가 (body: productId, quantity)
// PUT    /api/cart/items/:productId    — 수량 수정 (body: quantity)
// DELETE /api/cart/items/:productId    — 상품 삭제
// DELETE /api/cart                     — 장바구니 비우기
router.get("/", getCart);
router.post("/items", addToCart);
router.put("/items/:productId", updateCartItem);
router.delete("/items/:productId", removeCartItem);
router.delete("/", clearCart);

module.exports = router;
