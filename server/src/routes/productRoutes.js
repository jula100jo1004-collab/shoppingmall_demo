const express = require("express");
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { requireAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

// GET /api/products?page=1&limit=2&category=상의
// 기본 limit=2 (한 페이지에 상품 2개)
router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", ...requireAdmin, createProduct);
router.put("/:id", ...requireAdmin, updateProduct);
router.delete("/:id", ...requireAdmin, deleteProduct);

module.exports = router;
