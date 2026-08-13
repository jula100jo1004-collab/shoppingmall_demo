const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Heroku 등 리버스 프록시 뒤에서 올바른 프로토콜/IP 인식
app.set("trust proxy", 1);

const allowedOrigins = String(process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Postman/서버간 요청 등 Origin 없는 경우 허용
      if (!origin) {
        callback(null, true);
        return;
      }

      // CLIENT_ORIGIN 미설정 시 개발 편의상 전체 허용
      if (allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/", (req, res) => {
  res.json({
    message: "Shopping mall API is running",
    health: "/api/health",
  });
});

app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);

module.exports = app;
