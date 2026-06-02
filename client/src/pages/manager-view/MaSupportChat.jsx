import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import supportChatApi from "@/api/supportChatApi";
import { useSocket } from "@/context/SocketContext";
import {
  MessageCircle,
  Send,
  X,
  Clock,
  User,
  CheckCheck,
  Package,
} from "lucide-react";

const MaSupportChat = () => {
  const navigate = useNavigate();
  const { accessToken, isAuthenticated, user } = useSelector(
    (state) => state.auth
  );
  const { socket, isConnected } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      toast.error("Vui lòng đăng nhập để tiếp tục");
      navigate("/auth/login");
      return;
    }
    if (user?.role !== "manager") {
      toast.error("Bạn không có quyền truy cập trang này");
      navigate("/");
      return;
    }
  }, [isAuthenticated, accessToken, user, navigate]);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await supportChatApi.getConversations(accessToken, {
        page: 1,
        limit: 50,
      });

      if (response?.success) {
        setConversations(response.data.conversations || []);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Không thể tải danh sách hội thoại");
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for selected conversation
  const fetchMessages = async (conversationId) => {
    try {
      const response = await supportChatApi.getMessages(
        accessToken,
        conversationId,
        { page: 1, limit: 100 }
      );

      if (response?.success) {
        setMessages(response.data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Không thể tải tin nhắn");
    }
  };

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [accessToken]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join support room when conversation is selected
    if (selectedConversation) {
      socket.emit("join_support_room", selectedConversation._id);
    }

    // Listen for new messages
    const handleNewMessage = (data) => {
      console.log("📨 New support message received:", data);

      // Add message to current conversation
      if (data.conversation_id === selectedConversation?._id) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === data.message._id);
          if (exists) return prev;
          return [...prev, data.message];
        });
      }

      // Update conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c._id === data.conversation_id
            ? {
                ...c,
                lastMessage: data.message.message,
                updatedAt: data.message.created_at,
              }
            : c
        )
      );
    };

    // Listen for new conversations
    const handleNewConversation = (data) => {
      console.log("💬 New conversation:", data);
      fetchConversations();
    };

    socket.on("support_new_message", handleNewMessage);
    socket.on("support_new_conversation", handleNewConversation);

    return () => {
      if (selectedConversation) {
        socket.emit("leave_support_room", selectedConversation._id);
      }
      socket.off("support_new_message", handleNewMessage);
      socket.off("support_new_conversation", handleNewConversation);
    };
  }, [socket, isConnected, selectedConversation]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Select conversation
  const handleSelectConversation = async (conversation) => {
    // Leave previous room
    if (socket && selectedConversation) {
      socket.emit("leave_support_room", selectedConversation._id);
    }

    setSelectedConversation(conversation);
    await fetchMessages(conversation._id);

    // Join new room
    if (socket) {
      socket.emit("join_support_room", conversation._id);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      const response = await supportChatApi.sendMessage(accessToken, {
        conversationId: selectedConversation._id,
        message: messageText,
        messageType: "text",
      });

      if (response?.success) {
        // Message will be added via socket event
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === response.data._id);
          if (exists) return prev;
          return [...prev, response.data];
        });
      } else {
        toast.error("Không thể gửi tin nhắn");
        setNewMessage(messageText); // Restore message
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Có lỗi xảy ra khi gửi tin nhắn");
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  // Format time
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  // Get customer info from conversation
  const getCustomerInfo = (conversation) => {
    const customer = conversation.participantsInfo?.find(
      (p) => p.role === "customer"
    );
    return {
      name: customer?.name || "Khách hàng",
      id: customer?._id,
    };
  };

  // Close conversation
  const handleCloseConversation = async (conversationId) => {
    if (!window.confirm("Bạn có chắc muốn đóng hội thoại này?")) return;

    try {
      const response = await supportChatApi.closeConversation(
        accessToken,
        conversationId
      );

      if (response?.success) {
        toast.success("Đã đóng hội thoại");
        fetchConversations();
        if (selectedConversation?._id === conversationId) {
          setSelectedConversation(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error("Error closing conversation:", error);
      toast.error("Không thể đóng hội thoại");
    }
  };

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const maxHeight = 150;
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + "px";
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [newMessage]);

  return (
    <div className="h-[calc(100vh-140px)] bg-white rounded-lg shadow-sm border">
      <div className="flex h-full">
        {/* Left: Conversation list */}
        <div className="w-80 border-r flex flex-col">
          {/* Header */}
          <div className="p-4 border-b bg-green-50">
            <h2 className="text-lg font-semibold text-green-800 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Hỗ trợ khách hàng
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {conversations.length} cuộc hội thoại
            </p>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                  <p className="text-sm">Đang tải...</p>
                </div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                <MessageCircle className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-sm text-center">
                  Chưa có cuộc hội thoại nào
                </p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {conversations.map((conversation) => {
                  const customer = getCustomerInfo(conversation);
                  const isSelected =
                    selectedConversation?._id === conversation._id;
                  const unreadCount =
                    conversation.participantsInfo?.find(
                      (p) => p._id === user?._id
                    )?.unreadCount || 0;

                  return (
                    <div
                      key={conversation._id}
                      onClick={() => handleSelectConversation(conversation)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? "bg-green-100 border border-green-300"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold flex-shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {customer.name}
                            </h3>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatTime(conversation.updatedAt)}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 truncate">
                            {conversation.lastMessage || "Bắt đầu hội thoại..."}
                          </p>

                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                conversation.status === "open"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {conversation.status === "open"
                                ? "Đang mở"
                                : "Đã đóng"}
                            </span>

                            {unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {unreadCount > 9 ? "9+" : unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Messages */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold">
                    {getCustomerInfo(selectedConversation)
                      .name.charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {getCustomerInfo(selectedConversation).name}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(selectedConversation.updatedAt)}
                    </p>
                  </div>
                </div>

                {selectedConversation.status === "open" && (
                  <button
                    onClick={() =>
                      handleCloseConversation(selectedConversation._id)
                    }
                    className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Đóng hội thoại
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <MessageCircle className="w-12 h-12 text-gray-300 mb-2" />
                    <p>Chưa có tin nhắn</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = msg.sender_id === user?._id;
                    const showAvatar =
                      index === 0 ||
                      messages[index - 1].sender_id !== msg.sender_id;

                    return (
                      <div
                        key={msg._id || index}
                        className={`flex ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] ${
                            isMe ? "items-end" : "items-start"
                          }`}
                        >
                          {showAvatar && !isMe && (
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="text-xs text-gray-500">
                                {getCustomerInfo(selectedConversation).name}
                              </span>
                            </div>
                          )}

                          <div
                            className={`rounded-lg px-4 py-2 break-words whitespace-pre-wrap ${
                              isMe
                                ? "bg-green-600 text-white"
                                : "bg-white text-gray-800 border"
                            }`}
                          >
                            <div className="text-sm">{msg.message}</div>
                            <div
                              className={`text-xs mt-1 flex items-center gap-1 ${
                                isMe ? "text-green-100" : "text-gray-500"
                              }`}
                            >
                              {new Date(msg.created_at).toLocaleTimeString(
                                "vi-VN",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                              {isMe && msg.is_read && (
                                <CheckCheck className="w-3 h-3" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {selectedConversation.status === "open" && (
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t bg-white flex items-end gap-2"
                >
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter để xuống dòng)"
                    rows={1}
                    className="flex-1 px-3 py-2 border rounded-lg resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-green-400"
                    onInput={adjustTextareaHeight}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="bg-green-600 text-white p-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
              <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-lg font-medium mb-2">
                Chọn một cuộc hội thoại
              </p>
              <p className="text-sm text-center text-gray-400">
                Chọn một cuộc hội thoại từ danh sách bên trái để bắt đầu trò
                chuyện với khách hàng
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaSupportChat;


