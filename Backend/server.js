require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 15; // Increase from default 10

// Import custom modules
const { connectDB } = require("./src/config/db");
const logger = require("./src/utils/logger");
const { auth } = require("./src/modules");
const {
  errorHandler,
  notFoundHandler,
} = require("./src/middleware/errorMiddleware");
const { healthLimiter } = require("./src/modules/auth/middleware/rateLimit");

// Initialize express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Technical Support CRM API",
      version: "1.0.0",
      description: "API documentation for Technical Support CRM",
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:4290",
        description: "API Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/modules/**/routes/*.js", "./src/modules/**/docs/*.yaml"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Update CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5173'  // Single origin instead of array
    : process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token']
}));

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Initialize modules
auth.initialize(app);

// Basic route for testing (add this BEFORE error handlers)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple in-memory cache for health endpoint
let healthCache = {
  data: { status: 'ok', timestamp: new Date().toISOString() },
  lastUpdated: Date.now()
};

// Health endpoint with caching
app.get('/api/health', (req, res) => {
  // Update cache every 5 seconds
  if (Date.now() - healthCache.lastUpdated > 5000) {
    healthCache.data.timestamp = new Date().toISOString();
    healthCache.lastUpdated = Date.now();
  }
  res.json(healthCache.data);
});

// Error handling middleware should be last
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4290;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info("MongoDB connected successfully");

    // Import and connect Redis (moved here to avoid duplicate imports)
    const {
      redisClient,
      redisPublisher,
      redisSubscriber,
    } = require("./src/config/redis");

    // Wait for Redis connections
    await Promise.all([
      new Promise((resolve) => redisClient.on("connect", resolve)),
      new Promise((resolve) => redisPublisher.on("connect", resolve)),
      new Promise((resolve) => redisSubscriber.on("connect", resolve)),
    ]);

    logger.info("Redis connected successfully");

    // Setup Socket.IO with Redis adapter
    io.adapter(createAdapter(redisPublisher, redisSubscriber));

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(
        `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
      );
    });
  } catch (error) {
    logger.error("Server startup failed:", error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled Rejection:", error);
  process.exit(1);
});

// Handle graceful shutdown
const gracefulShutdown = async () => {
  try {
    logger.info("Initiating graceful shutdown...");
    await redisClient.quit();
    await redisPublisher.quit();
    await redisSubscriber.quit();
    await new Promise((resolve) => httpServer.close(resolve));
    logger.info("Server shut down successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Start the server
startServer();

module.exports = app; // For testing purposes
