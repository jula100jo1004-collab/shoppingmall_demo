require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing. Set it in Heroku Config Vars.",
      );
    }
    if (!process.env.JWT_SECRET) {
      console.warn(
        "Warning: JWT_SECRET is missing. Login will fail until it is set.",
      );
    }

    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
