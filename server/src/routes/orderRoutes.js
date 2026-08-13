const express = require("express");
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
} = require("../controllers/orderController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// POST   /api/orders       — 주문 생성
// GET    /api/orders       — 주문 목록 (본인 / 관리자 전체)
// GET    /api/orders/:id   — 주문 상세
// PUT    /api/orders/:id   — 주문 수정 (상태/배송지/메모)
// DELETE /api/orders/:id   — 주문 삭제(관리자) 또는 취소(유저)
router.post("/", createOrder);
router.get("/", getOrders);
router.get("/:id", getOrderById);
router.put("/:id", updateOrder);
router.delete("/:id", deleteOrder);

module.exports = router;
