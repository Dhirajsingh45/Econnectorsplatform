import { useState, useEffect, useRef } from 'react';
import socket from '../../services/socket';
import { useAppContext } from '../../context/AppContext';
import { Send, X, MessageSquare } from 'lucide-react';
import './Chat.css';

export default function Chat({ onClose }) {
  const { currentUser } = useAppContext();
  const [sector, setSector] = useState('Global');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  const sectors = ['Global', 'North area', 'South area', 'NGO verified'];

  useEffect(() => {
    socket.connect();
    socket.emit('join_sector', sector);

    socket.on('receive_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off('receive_message');
      socket.disconnect();
    };
  }, [sector]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    socket.emit('send_message', {
      sector: sector,
      sender: currentUser.name || 'Anonymous',
      text: input,
      type: 'text'
    });

    setInput('');
  };

  return (
    <div className="chat-window glass-panel animate-fade-in">
      <header className="chat-header">
        <div className="flex flex-col">
          <div className="flex items-center gap-xs">
            <MessageSquare size={14} className="text-primary" />
            <h3 className="pixel-font text-sm">{sector}</h3>
          </div>
          <select 
            value={sector} 
            onChange={(e) => {
              setSector(e.target.value);
              setMessages([]); // Clear local messages when switching sectors
            }}
            className="sector-selector mt-xs"
          >
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={onClose} className="icon-btn close-btn"><X size={20} /></button>
      </header>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-chat">
            <p className="text-xs text-muted pixel-font">No messages yet.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.sender === (currentUser.name || 'Anonymous') ? 'sent' : 'received'}`}>
            <span className="sender-tag">{msg.sender}</span>
            <div className="message-bubble">{msg.text}</div>
            <div className="message-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form className="chat-input" onSubmit={handleSend}>
        <input 
          type="text" 
          placeholder="Type a message..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-icon"><Send size={18} /></button>
      </form>
    </div>
  );
}
