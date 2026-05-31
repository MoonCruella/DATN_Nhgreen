import { useState, useEffect, useRef } from "react";
import { useSocket } from "../../context/SocketContext";
import supportChatService from "../../api/supportChatApi";
import { Button } from "../../components/ui/button";
import { MessageCircle, Send, Clock, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";

const AdChatPage = () => {
  const { socket } = useSocket();
  const { accessToken } = useSelector((state) => state.auth);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  // Lưu nháp tin nhắn cho từng hội thoại
  const [inputDrafts, setInputDrafts] = useState({});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversations
  const loadConversations = async () => {
    try {
      const response = await supportChatService.getConversations(accessToken, {
        status: "active",
      });

      if (response.success) {
        setConversations(response.data.conversations || []);
      } else {
        toast.error("Không thể tải danh sách hội thoại");
      }
    } catch {
      toast.error("Có lỗi khi tải danh sách hội thoại");
    }
  };

  // Load messages
  const loadMessages = async (conversationId) => {
    try {
      setIsLoading(true);
      const response = await supportChatService.getMessages(
        accessToken,
        conversationId
      );

      if (response.success) {
        setMessages(response.data.messages || []);
      } else {
        toast.error("Không thể tải tin nhắn");
      }
    } catch {
      toast.error("Có lỗi khi tải tin nhắn");
    } finally {
      setIsLoading(false);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedConversation) return;

    try {
      setIsLoading(true);
      const response = await supportChatService.sendMessage(accessToken, {
        conversationId: selectedConversation.conversationId,
        message: input,
      });
      if (response.success) {
        setInput("");
        // Đánh dấu đã đọc sau khi gửi tin nhắn
        resetUnreadCountAdmin(selectedConversation.conversationId);
      } else {
        toast.error("Không thể gửi tin nhắn");
      }
    } catch {
      toast.error("Có lỗi khi gửi tin nhắn");
    } finally {
      setIsLoading(false);
    }
  };

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      if (selectedConversation?.conversationId === newMessage.conversationId) {
        setMessages((prev) => {
          const exists = prev.some((msg) => msg._id === newMessage._id);
          return exists ? prev : [...prev, newMessage];
        });
        // Tự động đánh dấu đã đọc khi nhận tin nhắn mới trong hội thoại đang mở
        resetUnreadCountAdmin(newMessage.conversationId);
      }
      loadConversations();
    };

    const handleConversationUpdate = () => {
      loadConversations();
    };

    socket.on("support_new_message", handleNewMessage);
    socket.on("support_conversation_update", handleConversationUpdate);

    return () => {
      socket.off("support_new_message", handleNewMessage);
      socket.off("support_conversation_update", handleConversationUpdate);
    };
  }, [socket, selectedConversation]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, []);

  // Reset unreadCountAdmin for selected conversation
  const resetUnreadCountAdmin = async (conversationId) => {
    try {
      await supportChatService.markAsReadAdmin(
        accessToken,
        conversationId
      );
      // Cập nhật lại danh sách conversations để xóa badge chưa đọc
      setConversations((prev) =>
        prev.map((conv) =>
          conv.conversationId === conversationId
            ? { ...conv, unreadCountAdmin: 0 }
            : conv
        )
      );
    } catch (error) {
      // Không cần báo lỗi, chỉ log
      console.error("Lỗi reset unreadCountAdmin:", error);
    }
  };

  // Khi chuyển hội thoại: lưu nháp hội thoại cũ, load nháp hội thoại mới (fix bug lưu nháp)
  // Lưu nháp hội thoại cũ trước khi chuyển, khôi phục nháp hội thoại mới (fix triệt để)
  useEffect(() => {
    // Khi chuyển hội thoại, lưu nháp hội thoại cũ và đánh dấu đã đọc
    return () => {
      if (selectedConversation && selectedConversation.conversationId) {
        setInputDrafts((prev) => ({
          ...prev,
          [selectedConversation.conversationId]: input,
        }));
        // Đánh dấu đã đọc khi rời khỏi hội thoại
        resetUnreadCountAdmin(selectedConversation.conversationId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation && socket) {
      // Khôi phục nháp hội thoại mới (dùng callback để lấy đúng nháp mới nhất)
      setInput(() => {
        const draft = inputDrafts[selectedConversation.conversationId];
        return typeof draft === "string" ? draft : "";
      });
      socket.emit("join_support_room", selectedConversation.conversationId);
      loadMessages(selectedConversation.conversationId);
    }
  }, [selectedConversation, socket, inputDrafts]);

  // Filter conversations
  const filteredConversations = conversations.filter((conv) =>
    conv.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Reset time to compare dates only
    const isToday = messageDate.toDateString() === today.toDateString();
    const isYesterday = messageDate.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return messageDate.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (isYesterday) {
      return "Hôm qua";
    } else {
      return messageDate.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      });
    }
  };

  const formatMessageTime = (date) => {
    return new Date(date).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateDivider = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = messageDate.toDateString() === today.toDateString();
    const isYesterday = messageDate.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return "Hôm nay";
    } else if (isYesterday) {
      return "Hôm qua";
    } else {
      return messageDate.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  };

  // Check if two messages are on different days
  const isDifferentDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.toDateString() !== d2.toDateString();
  };

  // Render conversation item
  const ConversationItem = ({ conv }) => {
    const draft = inputDrafts[conv.conversationId];
    const hasDraft = typeof draft === "string" && draft.trim() !== "";
    // Show draft preview ONLY if there is no lastMessage
    const showDraftPreview = hasDraft && !conv.lastMessage;
    
    // Format last message with "Bạn: " prefix if sent by admin
    const formatLastMessage = () => {
      if (!conv.lastMessage) return "";
      
      // Check if last message was sent by admin
      const isAdminMessage = conv.lastMessageSender === "Admin";
      const prefix = isAdminMessage ? "Bạn: " : "";
      
      return prefix + conv.lastMessage;
    };
    
    const handleClick = () => {
      // Reset unread count ngay khi click
      if (conv.unreadCountAdmin > 0) {
        resetUnreadCountAdmin(conv.conversationId);
      }
      setSelectedConversation(conv);
    };
    
    return (
      <div
        onClick={handleClick}
        className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
          selectedConversation?.conversationId === conv.conversationId
            ? "bg-green-50 border-l-4 border-l-green-600"
            : ""
        }`}
      >
        <div className="flex items-start gap-3">
          {conv.customerId.avatar ? (
            <img
              src={conv.customerId.avatar}
              alt={conv.customerName || "User Avatar"}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-medium">
              {conv.customerName?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-medium text-sm truncate flex items-center gap-2">
                {showDraftPreview && (
                  <span className="text-red-500 font-semibold">Bản nháp</span>
                )}
                {conv.customerName || "Khách hàng"}
              </h3>
              {conv.unreadCountAdmin > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                  {conv.unreadCountAdmin}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 truncate mb-1">
              {showDraftPreview
                ? `Bản nháp: ${
                    draft.length > 20 ? draft.slice(0, 20) + "..." : draft
                  }`
                : formatLastMessage() || "Chưa có tin nhắn"}
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={12} />
              <span>{formatTime(conv.lastMessageAt)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render message item
  const MessageItem = ({ msg }) => {
    const isOwn = msg.senderModel === "Admin";
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[70%]">
          <div
            className={`p-3 rounded-lg ${
              isOwn
                ? "bg-green-600 text-white rounded-br-none"
                : "bg-white text-gray-800 shadow-sm rounded-bl-none"
            }`}
            style={{
              maxHeight: "300px",
              maxWidth: "100%",
              overflowY: "auto",
              overflowX: "auto",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <p
              className="text-sm whitespace-pre-wrap break-words"
              style={{
                margin: 0,
                maxWidth: "100%",
                overflowX: "auto",
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.message}
            </p>
            <p className="text-xs opacity-70 mt-1">
              {formatMessageTime(msg.createdAt)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Card Container */}
      <div className="bg-white rounded-lg shadow flex overflow-hidden min-h-[600px]">
        {/* Sidebar - Conversations List */}
        <div className="w-80 border-r flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b">
            {/* Search */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
          </div>
          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                <MessageCircle size={48} className="mb-2 opacity-30" />
                <p className="text-sm text-center">
                  {searchTerm
                    ? "Không tìm thấy hội thoại nào"
                    : "Chưa có hội thoại nào"}
                </p>
                {!searchTerm && (
                  <p className="text-xs text-center mt-2 text-gray-400">
                    Khi khách hàng nhắn tin, hội thoại sẽ xuất hiện ở đây
                  </p>
                )}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <ConversationItem key={conv.conversationId} conv={conv} />
              ))
            )}
          </div>
        </div>
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {selectedConversation.customerId.avatar ? (
                    <img
                      src={selectedConversation.customerId.avatar}
                      alt={selectedConversation.customerName || "User Avatar"}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-medium">
                      {selectedConversation.customerName
                        ?.charAt(0)
                        ?.toUpperCase() || "U"}
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium">
                      {selectedConversation.customerName || "Khách hàng"}
                    </h3>
                  </div>
                </div>
              </div>
              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-0"
                style={{ maxHeight: 400, overflowY: "auto" }}
              >
                {isLoading && messages.length === 0 ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <MessageCircle size={48} className="mb-2 opacity-30" />
                    <p className="text-sm">Chưa có tin nhắn nào</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div key={msg._id || index}>
                      {/* Date divider */}
                      {(index === 0 || isDifferentDay(messages[index - 1].createdAt, msg.createdAt)) && (
                        <div className="flex items-center justify-center my-4">
                          <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                            {formatDateDivider(msg.createdAt)}
                          </div>
                        </div>
                      )}
                      <MessageItem msg={msg} />
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              {/* Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 bg-white border-t mt-auto"
              >
                <div className="flex gap-2 items-end">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-600 resize-none min-h-[56px] max-h-[180px] text-base"
                    disabled={isLoading}
                    rows={2}
                    style={{ overflow: "auto" }}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="bg-green-600 hover:bg-green-700 h-[56px] flex items-center justify-center"
                  >
                    <Send size={20} />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
              <div className="text-center">
                <MessageCircle size={64} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">
                  Chọn một hội thoại để bắt đầu
                </p>
                <p className="text-sm">
                  Khách hàng của bạn đang chờ bạn trả lời
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdChatPage;
