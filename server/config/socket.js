import { Server } from "socket.io";
import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/user-model.js";

let io;

// Khởi tạo Socket.IO server
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Middleware xác thực - sử dụng verifyAccessToken từ utils/jwt.js
  io.use(async (socket, next) => {
    try {
      const { token } = socket.handshake.auth;

      if (!token) {
        return next(new Error("Access token không được cung cấp"));
      }

      // Sử dụng hàm verifyAccessToken thay vì jwt.verify trực tiếp
      const decoded = verifyAccessToken(token);

      // Kiểm tra user có tồn tại và active không (tương tự authenticateToken)
      const user = await User.findById(decoded.userId);

      if (!user || !user.active) {
        return next(new Error("User không hợp lệ hoặc đã bị khóa"));
      }

      socket.userId = decoded.userId;
      socket.userRole = decoded.role;

      next();
    } catch (error) {
      console.error("Socket authentication error:", error.message);

      if (error.name === "TokenExpiredError") {
        return next(new Error("Token hết hạn"));
      }

      return next(new Error("Token không hợp lệ"));
    }
  });

  // Xử lý kết nối
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId}, Role: ${socket.userRole}`);

    // Người dùng join vào room cá nhân
    socket.join(`user:${socket.userId}`);

    // Admin join vào room admin
    if (socket.userRole === "admin") {
      socket.join("admin");
    }

    // Manager join vào room manager
    if (socket.userRole === "manager") {
      socket.join("manager");
    }

    // Join branch room (for manager and orders)
    socket.on("join_branch_room", (branchId) => {
      const roomName = `branch:${branchId}`;
      socket.join(roomName);
      console.log(
        `🏪 Socket ${socket.id} (User: ${socket.userId}) joined branch room: ${roomName}`
      );
      socket.emit("joined_branch_room", { branchId, roomName });
    });

    // Leave branch room
    socket.on("leave_branch_room", (branchId) => {
      const roomName = `branch:${branchId}`;
      socket.leave(roomName);
      console.log(
        `👋 Socket ${socket.id} (User: ${socket.userId}) left branch room: ${roomName}`
      );
      socket.emit("left_branch_room", { branchId, roomName });
    });

    //  BỔ SUNG: Xử lý Support Chat
    // Join support chat room
    socket.on("join_support_room", (conversationId) => {
      const roomName = `support:${conversationId}`;
      socket.join(roomName);
      console.log(
        `💬 Socket ${socket.id} (User: ${socket.userId}) joined support room: ${roomName}`
      );

      // Confirm join bằng cách emit lại cho client
      socket.emit("joined_support_room", { conversationId, roomName });
    });

    // Leave support chat room
    socket.on("leave_support_room", (conversationId) => {
      const roomName = `support:${conversationId}`;
      socket.leave(roomName);
      console.log(
        `👋 Socket ${socket.id} (User: ${socket.userId}) left support room: ${roomName}`
      );

      // Confirm leave
      socket.emit("left_support_room", { conversationId, roomName });
    });

    // Test support event (để debug)
    socket.on("test_support", (data) => {
      console.log(`🧪 Test support event from ${socket.userId}:`, data);
      socket.emit("test_support_response", {
        status: "ok",
        data,
        userId: socket.userId,
        userRole: socket.userRole,
      });
    });

    // Xử lý typing indicator cho support chat
    socket.on("support_typing", ({ conversationId, isTyping }) => {
      const roomName = `support:${conversationId}`;
      socket.to(roomName).emit("support_user_typing", {
        conversationId,
        userId: socket.userId,
        userRole: socket.userRole,
        isTyping,
      });
    });

    // Xử lý khi ngắt kết nối
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

// Lấy instance hiện tại của io
const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

export { initSocket, getIO };
