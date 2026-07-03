import http from "http";
import app from "./app.js";
import { config } from "./config/env.js";
import connectDB from "./config/mongodb.js";
import { initSocket } from "./config/socket.js";
import * as orderSchedulerService from "./services/order-scheduler-service.js";
import { syncPendingGhnOrders } from "./controllers/order-controller.js";

let ghnAutoSyncRunning = false;

const startGhnAutoSync = () => {
  if (process.env.GHN_AUTO_SYNC_ENABLED === "false") return;

  const intervalMs = Number(process.env.GHN_AUTO_SYNC_INTERVAL_MS || 120000);
  const runSync = async () => {
    if (ghnAutoSyncRunning) return;
    ghnAutoSyncRunning = true;
    try {
      const result = await syncPendingGhnOrders();
      if (result.checked > 0) {
        console.log(
          `GHN auto sync checked ${result.checked} orders, updated ${result.updated}`,
        );
      }
    } catch (error) {
      console.error("GHN auto sync error:", error.message);
    } finally {
      ghnAutoSyncRunning = false;
    }
  };

  setTimeout(runSync, 10000);
  setInterval(runSync, intervalMs);
  console.log(`GHN auto sync enabled, interval ${intervalMs}ms`);
};

const startServer = async () => {
  await connectDB();

  // Tạo HTTP server
  const httpServer = http.createServer(app);

  // Khởi tạo Socket.io
  initSocket(httpServer);

  // Khôi phục các schedule auto-complete đã tồn tại
  await orderSchedulerService.restoreScheduledAutoCompletes();
  startGhnAutoSync();

  // Listen trên httpServer thay vì app
  httpServer.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Socket.io initialized successfully`);
  });
};

startServer();
