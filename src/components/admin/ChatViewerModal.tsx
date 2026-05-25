import React from 'react';
import { X } from "lucide-react";

const ChatViewerModal = ({
  channel,
  channelUserId,
  onClose,
}: {
  channel: string;
  channelUserId: string;
  onClose: () => void;
}) => {
  const [messages, setMessages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem("wop_token");
        const res = await fetch(`/api/admin/chat-sessions/${channel}/${channelUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setMessages(data);
      } catch (e) {
        console.error("Failed to load chat", e);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [channel, channelUserId]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-[#252526] p-6 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Chat History: {channel} - {channelUserId}</h3>
          <button onClick={onClose} className="text-[#999] hover:text-white"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 bg-[#1e1e1e] p-4 rounded">
          {loading ? <p>Loading...</p> : messages.map((m, i) => (
            <div key={i} className={`p-2 rounded text-sm ${m.role === 'user' ? 'bg-[#264f78] text-white ml-8' : 'bg-[#3c3c3c] text-white mr-8'}`}>
              <span className="font-bold">{m.role}: </span>{m.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatViewerModal;