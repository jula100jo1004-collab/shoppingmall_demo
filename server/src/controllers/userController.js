const bcrypt = require("bcryptjs");
const User = require("../models/User");

const SALT_ROUNDS = 10;

const createUser = async (req, res, next) => {
  try {
    const { email, name, password, user_type, address } = req.body;

    if (!email || !name || !password || !user_type) {
      res.status(400);
      return next(
        new Error("email, name, password, user_type are required")
      );
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      email,
      name,
      password: hashedPassword,
      user_type,
      address,
    });

    const userData = user.toObject();
    delete userData.password;

    res.status(201).json(userData);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      return next(new Error("Email already exists"));
    }

    if (error.name === "ValidationError") {
      res.status(400);
      return next(new Error(error.message));
    }

    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      res.status(404);
      return next(new Error("User not found"));
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const allowedFields = ["email", "name", "password", "user_type", "address"];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, SALT_ROUNDS);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      res.status(404);
      return next(new Error("User not found"));
    }

    res.json(user);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      return next(new Error("Email already exists"));
    }

    if (error.name === "ValidationError") {
      res.status(400);
      return next(new Error(error.message));
    }

    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id).select("-password");

    if (!user) {
      res.status(404);
      return next(new Error("User not found"));
    }

    res.json({ message: "User deleted", user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
