const Product = require("../models/Product");

const createProduct = async (req, res, next) => {
  try {
    const productId = String(req.body.productId || "").trim();
    const name = String(req.body.name || "").trim();
    const price = Number(req.body.price);
    const category = String(req.body.category || "").trim();
    const image = String(req.body.image || "").trim();
    const description = req.body.description
      ? String(req.body.description).trim()
      : undefined;

    if (!productId || !name || Number.isNaN(price) || !category || !image) {
      res.status(400);
      return next(
        new Error("productId, name, price, category, image are required")
      );
    }

    if (price < 0) {
      res.status(400);
      return next(new Error("price must be 0 or greater"));
    }

    const product = await Product.create({
      productId,
      name,
      price,
      category,
      image,
      description,
    });

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      return next(new Error("productId already exists"));
    }

    if (error.name === "ValidationError") {
      res.status(400);
      return next(new Error(error.message));
    }

    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.category) {
      filter.category = req.query.category;
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 2);
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product =
      (await Product.findById(id).catch(() => null)) ||
      (await Product.findOne({ productId: id }));

    if (!product) {
      res.status(404);
      return next(new Error("Product not found"));
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const allowedFields = [
      "productId",
      "name",
      "price",
      "category",
      "image",
      "description",
    ];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] =
          field === "price" ? Number(req.body[field]) : req.body[field];
      }
    }

    const { id } = req.params;
    let product = await Product.findById(id).catch(() => null);

    if (!product) {
      product = await Product.findOne({ productId: id });
    }

    if (!product) {
      res.status(404);
      return next(new Error("Product not found"));
    }

    Object.assign(product, updates);
    await product.save();

    res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      return next(new Error("productId already exists"));
    }

    if (error.name === "ValidationError") {
      res.status(400);
      return next(new Error(error.message));
    }

    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    let product = await Product.findByIdAndDelete(id).catch(() => null);

    if (!product) {
      product = await Product.findOneAndDelete({ productId: id });
    }

    if (!product) {
      res.status(404);
      return next(new Error("Product not found"));
    }

    res.json({ message: "Product deleted", product });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
