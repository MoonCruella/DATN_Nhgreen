import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Send, Store, UserCog } from "lucide-react";
import { toast } from "sonner";
import supportChatApi from "@/api/supportChatApi";

const ChatBox = ({ conversation, socket, onRefresh, currentUserId }) => {
  const { accessToken } = useSelector((state) => state.auth);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const getOtherParticipant = () => {
    if (!conversation.participantsInfo || conversation.participantsInfo.length < 2) return null;
    return conversation.participantsInfo.find(p => p.userId !== currentUserId);
  };

  const otherParticipant = getOtherParticipant();
  const isAdmin = otherParticipant?.role === 'admin';

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages
  useEffect(() => {
    if (!conversation) return;
    
    loadMessages();
    
    // Join socket room
    if (socket) {
      socket.emit("join_support_room", conversation.conversationId);
    }

    return () => {
      if (socket) {
        socket.emit("leave_support_room", conversation.conversationId);
      }
    };
  }, [conversation, socket]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (message.conversationId === conversation.conversationId) {
        setMessages((prev) => [...prev, message]);
        onRefresh();
      }
    };

    socket.on("support_new_message", handleNewMessage);

    return () => {
      socket.off("support_new_message", handleNewMessage);
    };
  }, [socket, conversation]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await supportChatApi.getMessages(
        accessToken,
        conversation.conversationId,
        { page: 1, limit: 100 }
      );

      if (response.success) {
        setMessages(response.data.messages || []);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Không thể tải tin nhắn");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      const response = await supportChatApi.sendMessage(accessToken, {
        conversationId: conversation.conversationId,
        message: messageText,
        messageType: "text",
      });

      if (response.success) {
        setMessages((prev) => [...prev, response.data]);
        onRefresh();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Không thể gửi tin nhắn");
      setNewMessage(messageText); // Restore message
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isAdmin ? "bg-orange-100" : "bg-green-100"
          }`}>
            {isAdmin ? (
              <UserCog className="w-5 h-5 text-orange-600" />
            ) : (
              <Store className="w-5 h-5 text-green-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">
              {otherParticipant?.name || (isAdmin ? "Admin - Hỗ trợ" : "Chi nhánh")}
            </h3>
            <p className="text-sm text-gray-500">
              {isAdmin ? "Quản trị viên" : "Quản lý chi nhánh"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Đang tải tin nhắn...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              isAdmin ? "bg-orange-100" : "bg-green-100"
            }`}>
              {isAdmin ? (
                <UserCog className="w-8 h-8 text-orange-600" />
              ) : (
                <Store className="w-8 h-8 text-green-600" />
              )}
            </div>
            <p className="text-gray-600 font-medium mb-1">
              Bắt đầu cuộc trò chuyện
            </p>
            <p className="text-sm text-gray-500">
              Gửi tin nhắn để nhận được hỗ trợ từ chúng tôi
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === currentUserId;

            return (
              <div
                key={index}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[70%] ${isMe ? "" : "flex items-start gap-2"}`}>
                  {!isMe && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isAdmin ? "bg-orange-100" : "bg-green-100"
                    }`}>
                      {isAdmin ? (
                        <UserCog className="w-4 h-4 text-orange-600" />
                      ) : (
                        <Store className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  )}
                  
                  <div>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isMe
                          ? "bg-green-600 text-white"
                          : "bg-white text-gray-800 border"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        isMe ? "text-right text-gray-500" : "text-gray-500"
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Nhập tin nhắn..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Gửi
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;
