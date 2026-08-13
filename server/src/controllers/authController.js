const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

const SALT_ROUNDS = 10;

const isBcryptHash = (value) =>
  typeof value === "string" && /^\$2[aby]?\$/.test(value);

const verifyPassword = async (plainPassword, storedPassword) => {
  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(plainPassword, storedPassword);
  }

  // 암호화 도입 전 평문 비밀번호 호환
  return plainPassword === storedPassword;
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      return next(new Error("email and password are required"));
    }

    if (!process.env.JWT_SECRET) {
      res.status(500);
      return next(new Error("JWT_SECRET is not configured"));
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      res.status(401);
      return next(new Error("Invalid email or password"));
    }

    const isMatch = await verifyPassword(password, user.password);

    if (!isMatch) {
      res.status(401);
      return next(new Error("Invalid email or password"));
    }

    // 평문으로 저장된 비밀번호는 로그인 성공 시 해시로 전환
    if (!isBcryptHash(user.password)) {
      user.password = await bcrypt.hash(password, SALT_ROUNDS);
      await user.save();
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        user_type: user.user_type,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
    );

    const userData = user.toObject();
    delete userData.password;
    delete userData.resetPasswordToken;
    delete userData.resetPasswordExpires;

    res.status(200).json({
      message: "Login successful",
      token,
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -resetPasswordToken -resetPasswordExpires"
    );

    if (!user) {
      res.status(404);
      return next(new Error("User not found"));
    }

    res.status(200).json({
      message: "User fetched successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      res.status(400);
      return next(new Error("email and name are required"));
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      name: name.trim(),
    });

    if (!user) {
      res.status(404);
      return next(new Error("No matching account found"));
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    res.status(200).json({
      message: "Account verified. You can reset your password.",
      resetToken,
      expiresInMinutes: 15,
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      res.status(400);
      return next(
        new Error("email, resetToken, and newPassword are required")
      );
    }

    if (newPassword.length < 4) {
      res.status(400);
      return next(new Error("Password must be at least 4 characters"));
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400);
      return next(new Error("Invalid or expired reset token"));
    }

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      message: "Password has been reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  forgotPassword,
  resetPassword,
};
