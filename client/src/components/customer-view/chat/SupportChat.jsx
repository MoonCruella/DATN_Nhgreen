import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSupportChat } from '../../../context/SupportChatContext';
import { Button } from '../../ui/button';
import { X, Send, MessageCircle, WifiOff } from 'lucide-react';

const SupportChat = () => {
  const location = useLocation();
  const { 
    isOpen, 
    messages, 
    isLoading, 
    unreadCount,
    isConnected,
    toggleChat, 
    sendMessage,
    user
  } = useSupportChat();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const success = await sendMessage(input);
    if (success) {
      setInput('');
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Không hiển thị nếu user chưa đăng nhập, là admin/manager, hoặc đang ở trang auth
  if (!user || user.role === 'admin' || user.role === 'manager' || location.pathname === '/auth') return null;

  // Nút floating khi đóng
  if (!isOpen) {
    return (
      <button
        onClick={toggleChat}
        className={`rounded-full h-14 w-14 bg-green-600 hover:bg-green-700 p-0 shadow-lg relative flex items-center justify-center cursor-pointer transition-transform active:scale-90 ${
          unreadCount > 0 ? 'animate-bounce' : ''
        }`}
        style={{ 
          position: 'fixed',
          bottom: '6rem',
          right: '1.5rem',
          zIndex: 100
        }}
        aria-label="Open support chat"
      >
        <MessageCircle size={24} className="text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full h-6 w-6 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  // Cửa sổ chat
  return (
    <div className="fixed bottom-6 right-20 w-96 h-[600px] bg-white rounded-lg shadow-xl flex flex-col border overflow-hidden z-[100] animate-in zoom-in-80 slide-in-from-bottom-10 duration-300">
      {/* Header */}
      <div className="p-4 bg-green-600 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
            <MessageCircle size={20} />
          </div>
          <div>
            <h3 className="font-medium">Hỗ trợ khách hàng</h3>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleChat}
          className="h-8 w-8 text-white hover:bg-white/20 cursor-pointer"
        >
          <X size={18} />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Chào bạn! 👋</p>
            <p className="text-xs mt-1">Hãy gửi tin nhắn để chúng tôi hỗ trợ bạn</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.senderModel === 'User';
            return (
              <div
                key={msg._id || index}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`p-3 rounded-lg ${
                      isOwn
                        ? 'bg-green-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
                    }`}
                    style={{
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      maxWidth: '350px',
                      overflowX: 'auto',
                    }}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words" style={{margin: 0, maxWidth: '100%', wordBreak: 'break-word', overflowWrap: 'break-word'}}>{msg.message}</p>
                    {msg.productRef && (
                      <div className="mt-2 p-2 bg-white/10 rounded border border-white/20">
                        <div className="flex gap-2">
                          <img
                            src={msg.productRef.images?.[0]?.image_url}
                            alt={msg.productRef.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {msg.productRef.name}
                            </p>
                            <p className="text-xs">
                              {new Intl.NumberFormat('vi-VN').format(msg.productRef.price)}₫
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {formatTime(msg.createdAt)}
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
      <form onSubmit={handleSubmit} className="border-t p-4 bg-white">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isConnected ? "Nhập tin nhắn..." : "Đang kết nối..."}
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 text-sm resize-none min-h-[40px] max-h-[120px]"
            disabled={isLoading || !isConnected}
            rows={2}
            style={{overflow: 'auto'}}
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim() || !isConnected}
            size="icon"
            className="h-10 w-10 bg-green-600 hover:bg-green-700 flex items-center justify-center cursor-pointer"
          >
            <Send size={18} />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {isConnected ? 'Thời gian phản hồi: 5-10 phút' : 'Đang kết nối lại...'}
        </p>
      </form>
    </div>
  );
};

export default SupportChat;