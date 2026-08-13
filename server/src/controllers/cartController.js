const Cart = require("../models/Cart");
const Product = require("../models/Product");

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  return cart;
};

const populateCart = (cartQuery) =>
  cartQuery.populate({
    path: "items.product",
    select: "productId name price category image description",
  });

/** GET /api/cart — 내 장바구니 조회 */
const getCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await getOrCreateCart(userId);

    const cart = await populateCart(Cart.findOne({ user: userId }));

    res.json(cart);
  } catch (error) {
    next(error);
  }
};

/** POST /api/cart/items — 장바구니에 상품 추가 */
const addToCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const productId = String(req.body.productId || "").trim();
    const quantity = Number(req.body.quantity) || 1;

    if (!productId) {
      res.status(400);
      return next(new Error("productId is required"));
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      res.status(400);
      return next(new Error("quantity must be an integer of 1 or greater"));
    }

    const product =
      (await Product.findById(productId).catch(() => null)) ||
      (await Product.findOne({ productId }));

    if (!product) {
      res.status(404);
      return next(new Error("Product not found"));
    }

    const cart = await getOrCreateCart(userId);
    const existingItem = cart.items.find(
      (item) => String(item.product) === String(product._id)
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: product._id,
        quantity,
      });
    }

    await cart.save();

    const populatedCart = await populateCart(Cart.findById(cart._id));

    res.status(201).json({
      message: "Item added to cart",
      cart: populatedCart,
    });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/cart/items/:productId — 장바구니 상품 수량 수정 */
const updateCartItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const quantity = Number(req.body.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      res.status(400);
      return next(new Error("quantity must be an integer of 1 or greater"));
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      res.status(404);
      return next(new Error("Cart not found"));
    }

    const item = cart.items.find(
      (cartItem) => String(cartItem.product) === String(productId)
    );

    if (!item) {
      res.status(404);
      return next(new Error("Cart item not found"));
    }

    item.quantity = quantity;
    await cart.save();

    const populatedCart = await populateCart(Cart.findById(cart._id));

    res.json({
      message: "Cart item updated",
      cart: populatedCart,
    });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/cart/items/:productId — 장바구니에서 상품 삭제 */
const removeCartItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      res.status(404);
      return next(new Error("Cart not found"));
    }

    const prevLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) => String(item.product) !== String(productId)
    );

    if (cart.items.length === prevLength) {
      res.status(404);
      return next(new Error("Cart item not found"));
    }

    await cart.save();

    const populatedCart = await populateCart(Cart.findById(cart._id));

    res.json({
      message: "Cart item removed",
      cart: populatedCart,
    });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/cart — 장바구니 비우기 */
const clearCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      res.status(404);
      return next(new Error("Cart not found"));
    }

    cart.items = [];
    await cart.save();

    res.json({
      message: "Cart cleared",
      cart,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
