const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");

const ORDER_STATUSES = [
  "pending",
  "paid",
  "preparing",
  "shipping",
  "delivered",
  "cancelled",
];
const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "failed"];
const PAYMENT_METHODS = ["card", "transfer", "kakao", "toss"];

const generateOrderNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `ORD${y}${m}${d}${Date.now().toString().slice(-5)}${random}`;
};

const findProduct = async (productRef) => {
  const value = String(productRef || "").trim();
  if (!value) return null;

  return (
    (await Product.findById(value).catch(() => null)) ||
    (await Product.findOne({ productId: value }))
  );
};

const buildOrderItems = async (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    const error = new Error("items must be a non-empty array");
    error.statusCode = 400;
    throw error;
  }

  const items = [];

  for (const raw of rawItems) {
    const quantity = Number(raw.quantity) || 1;

    if (!Number.isInteger(quantity) || quantity < 1) {
      const error = new Error("quantity must be an integer of 1 or greater");
      error.statusCode = 400;
      throw error;
    }

    const product = await findProduct(raw.productId || raw.product);

    if (!product) {
      const error = new Error(`Product not found: ${raw.productId || raw.product}`);
      error.statusCode = 404;
      throw error;
    }

    const price = Number(product.price);
    items.push({
      product: product._id,
      productId: product.productId,
      name: product.name,
      price,
      image: product.image,
      category: product.category,
      quantity,
      lineTotal: price * quantity,
    });
  }

  return items;
};

const parseShippingAddress = (address) => {
  if (!address || typeof address !== "object") {
    const error = new Error("shippingAddress is required");
    error.statusCode = 400;
    throw error;
  }

  const recipientName = String(address.recipientName || "").trim();
  const phone = String(address.phone || "").trim();
  const baseAddress = String(address.address || "").trim();
  const detailAddress = address.detailAddress
    ? String(address.detailAddress).trim()
    : undefined;
  const postalCode = address.postalCode
    ? String(address.postalCode).trim()
    : undefined;

  if (!recipientName || !phone || !baseAddress) {
    const error = new Error(
      "shippingAddress.recipientName, phone, and address are required"
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    recipientName,
    phone,
    address: baseAddress,
    detailAddress,
    postalCode,
  };
};

const isAdmin = (user) => user?.user_type === "admin";

const canAccessOrder = (order, user) =>
  isAdmin(user) || String(order.user) === String(user.id);

/** POST /api/orders — 주문 생성 */
const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const paymentMethod = String(req.body.paymentMethod || "").trim();
    const source = req.body.source === "cart" ? "cart" : "direct";
    const orderMemo = req.body.orderMemo
      ? String(req.body.orderMemo).trim()
      : undefined;
    const shippingFee = Number(req.body.shippingFee) || 0;

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      res.status(400);
      return next(
        new Error(`paymentMethod must be one of: ${PAYMENT_METHODS.join(", ")}`)
      );
    }

    if (shippingFee < 0) {
      res.status(400);
      return next(new Error("shippingFee must be 0 or greater"));
    }

    const shippingAddress = parseShippingAddress(req.body.shippingAddress);
    const items = await buildOrderItems(req.body.items);
    const itemsTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalAmount = itemsTotal + shippingFee;

    // 데모: markPaid=true 이면 바로 결제 완료 처리
    const markPaid = Boolean(req.body.markPaid);
    const paymentStatus = markPaid ? "paid" : "unpaid";
    const status = markPaid ? "paid" : "pending";

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: userId,
      items,
      status,
      paymentMethod,
      paymentStatus,
      itemsTotal,
      shippingFee,
      totalAmount,
      shippingAddress,
      orderMemo,
      source,
    });

    if (source === "cart") {
      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        const orderedProductIds = new Set(
          items.map((item) => String(item.product))
        );
        cart.items = cart.items.filter(
          (item) => !orderedProductIds.has(String(item.product))
        );
        await cart.save();
      }
    }

    res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
    }
    if (error.name === "ValidationError") {
      res.status(400);
      return next(new Error(error.message));
    }
    next(error);
  }
};

/** GET /api/orders — 내 주문 목록 (관리자는 전체) */
const getOrders = async (req, res, next) => {
  try {
    const filter = isAdmin(req.user) ? {} : { user: req.user.id };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    res.json(orders);
  } catch (error) {
    next(error);
  }
};

/** GET /api/orders/:id — 주문 상세 */
const getOrderById = async (req, res, next) => {
  try {
    const order =
      (await Order.findById(req.params.id)
        .populate("user", "name email")
        .catch(() => null)) ||
      (await Order.findOne({ orderNumber: req.params.id }).populate(
        "user",
        "name email"
      ));

    if (!order) {
      res.status(404);
      return next(new Error("Order not found"));
    }

    if (!canAccessOrder(order, req.user)) {
      res.status(403);
      return next(new Error("Access denied"));
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

/** PUT /api/orders/:id — 주문 수정 (상태/배송지/메모) */
const updateOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      return next(new Error("Order not found"));
    }

    if (!canAccessOrder(order, req.user)) {
      res.status(403);
      return next(new Error("Access denied"));
    }

    const admin = isAdmin(req.user);

    if (req.body.status !== undefined) {
      if (!admin) {
        // 일반 유저는 배송 시작 전 주문만 취소 가능
        if (req.body.status !== "cancelled") {
          res.status(403);
          return next(new Error("Only admins can change order status"));
        }
        if (!["pending", "paid", "preparing"].includes(order.status)) {
          res.status(400);
          return next(
            new Error("Only orders before shipping can be cancelled")
          );
        }
      }

      if (!ORDER_STATUSES.includes(req.body.status)) {
        res.status(400);
        return next(
          new Error(`status must be one of: ${ORDER_STATUSES.join(", ")}`)
        );
      }
      order.status = req.body.status;
      if (req.body.status === "cancelled" && order.paymentStatus === "paid") {
        order.paymentStatus = "refunded";
      }
    }

    if (req.body.paymentStatus !== undefined) {
      if (!admin) {
        res.status(403);
        return next(new Error("Only admins can change paymentStatus"));
      }
      if (!PAYMENT_STATUSES.includes(req.body.paymentStatus)) {
        res.status(400);
        return next(
          new Error(
            `paymentStatus must be one of: ${PAYMENT_STATUSES.join(", ")}`
          )
        );
      }
      order.paymentStatus = req.body.paymentStatus;
      if (req.body.paymentStatus === "paid" && order.status === "pending") {
        order.status = "paid";
      }
    }

    if (req.body.shippingAddress !== undefined) {
      if (!admin && order.status !== "pending") {
        res.status(400);
        return next(new Error("Shipping address can only be changed while pending"));
      }
      order.shippingAddress = parseShippingAddress(req.body.shippingAddress);
    }

    if (req.body.orderMemo !== undefined) {
      order.orderMemo = String(req.body.orderMemo || "").trim();
    }

    await order.save();

    res.json({
      message: "Order updated successfully",
      order,
    });
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
    }
    if (error.name === "ValidationError") {
      res.status(400);
      return next(new Error(error.message));
    }
    next(error);
  }
};

/** DELETE /api/orders/:id — 주문 삭제(관리자) 또는 취소(일반 유저) */
const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      return next(new Error("Order not found"));
    }

    if (!canAccessOrder(order, req.user)) {
      res.status(403);
      return next(new Error("Access denied"));
    }

    if (isAdmin(req.user)) {
      await order.deleteOne();
      return res.json({
        message: "Order deleted successfully",
      });
    }

    if (order.status !== "pending" || order.paymentStatus !== "unpaid") {
      res.status(400);
      return next(new Error("Only pending unpaid orders can be cancelled"));
    }

    order.status = "cancelled";
    await order.save();

    res.json({
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
};
