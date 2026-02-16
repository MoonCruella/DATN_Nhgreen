import http from "http";
import app from "./app.js";
import { config } from "./config/env.js";
import connectDB from "./config/mongodb.js";
import { initSocket } from "./config/socket.js";
import * as orderSchedulerService from "./services/order-scheduler-service.js";

const startServer = async () => {
  await connectDB();

  // Tạo HTTP server
  const httpServer = http.createServer(app);

  // Khởi tạo Socket.io
  initSocket(httpServer);

  // Khôi phục các schedule auto-complete đã tồn tại
  await orderSchedulerService.restoreScheduledAutoCompletes();

  // Listen trên httpServer thay vì app
  httpServer.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Socket.io initialized successfully`);
  });
};

startServer();
