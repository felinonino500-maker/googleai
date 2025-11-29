import React, { useState, useRef, useEffect } from 'react';
import { Attachment, Message, Role, MessageType, AppMode } from './types';
import { sendChatMessage, generateImage } from './services/geminiService';
import { fileToBase64, resizeImage } from './utils/fileHelpers';
import ChatMessage from './components/ChatMessage';
import CameraModal from './components/CameraModal';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: Role.MODEL,
      type: MessageType.TEXT,
      content: 'Halo! Saya Gemini. Anda bisa chat dengan saya, mengirim gambar untuk dianalisis, atau meminta saya membuat gambar.',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAttachments: Attachment[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        try {
          // If image, resize it to save bandwidth/tokens
          let base64 = "";
          if (file.type.startsWith('image/')) {
              base64 = await resizeImage(file);
          } else {
              base64 = await fileToBase64(file);
          }
          
          newAttachments.push({
            file,
            previewUrl: URL.createObjectURL(file),
            base64,
            mimeType: file.type
          });
        } catch (err) {
          console.error("Failed to process file", err);
        }
      }
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCameraCapture = async (file: File) => {
      try {
        const base64 = await resizeImage(file);
        setAttachments(prev => [...prev, {
            file,
            previewUrl: URL.createObjectURL(file),
            base64,
            mimeType: file.type
        }]);
      } catch (err) {
          console.error("Failed to process capture", err);
      }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const currentUserMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      type: MessageType.TEXT,
      content: input,
      attachments: [...attachments],
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, currentUserMsg]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      if (mode === AppMode.GENERATE_IMAGE) {
        // Image Generation Mode
        const imageBase64 = await generateImage(currentUserMsg.content);
        const modelMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: Role.MODEL,
          type: MessageType.IMAGE_GENERATION_RESULT,
          content: imageBase64,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, modelMsg]);
      } else {
        // Chat / Analysis Mode
        const responseText = await sendChatMessage(
          currentUserMsg.content, 
          currentUserMsg.attachments || [],
          [] // History handling simplified for this component
        );
        const modelMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: Role.MODEL,
          type: MessageType.TEXT,
          content: responseText,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, modelMsg]);
      }
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: Role.MODEL,
        type: MessageType.ERROR,
        content: "Maaf, terjadi kesalahan saat memproses permintaan Anda.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 overflow-hidden font-inter">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </div>
            <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                    Gemini Omni
                </h1>
                <p className="text-xs text-slate-400">Chat • Vision • GenAI</p>
            </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-slate-700 p-1 rounded-lg">
            <button
                onClick={() => setMode(AppMode.CHAT)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    mode === AppMode.CHAT 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
            >
                Chat / Vision
            </button>
            <button
                onClick={() => setMode(AppMode.GENERATE_IMAGE)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    mode === AppMode.GENERATE_IMAGE 
                    ? 'bg-purple-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
            >
                Buat Gambar
            </button>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (
            <div className="flex justify-start w-full mb-6 animate-pulse">
                 <div className="flex items-center space-x-2 bg-slate-700 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-600">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                 </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="bg-slate-800 border-t border-slate-700 p-3 sm:p-4 z-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
            
            {/* Attachments Preview */}
            {attachments.length > 0 && (
                <div className="flex gap-3 overflow-x-auto py-2">
                    {attachments.map((att, idx) => (
                        <div key={idx} className="relative group shrink-0">
                            {att.mimeType.startsWith('image/') ? (
                                <img src={att.previewUrl} alt="preview" className="h-16 w-16 object-cover rounded-lg border border-slate-500" />
                            ) : (
                                <div className="h-16 w-16 bg-slate-600 rounded-lg flex items-center justify-center border border-slate-500">
                                    <span className="text-xs text-slate-300 truncate px-1">{att.file.name.slice(-4)}</span>
                                </div>
                            )}
                            <button 
                                onClick={() => removeAttachment(idx)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-end gap-2 bg-slate-700/50 p-2 rounded-2xl border border-slate-600 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                
                {/* Tools (Only show in Chat Mode) */}
                {mode === AppMode.CHAT && (
                    <div className="flex gap-1 mb-1">
                         <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-full transition-colors"
                            title="Upload File/Image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </button>
                         <button 
                            type="button"
                            onClick={() => setIsCameraOpen(true)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-full transition-colors"
                            title="Gunakan Kamera"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>
                )}

                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileSelect} 
                    accept={mode === AppMode.CHAT ? "*/*" : ""}
                    disabled={mode === AppMode.GENERATE_IMAGE}
                    multiple 
                />

                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={mode === AppMode.CHAT ? "Ketik pesan..." : "Deskripsikan gambar yang ingin dibuat..."}
                    className="w-full bg-transparent text-white placeholder-slate-400 border-none outline-none resize-none py-3 px-2 max-h-32 min-h-[44px]"
                    rows={1}
                />

                <button 
                    onClick={() => handleSubmit()}
                    disabled={isLoading || (!input.trim() && attachments.length === 0)}
                    className={`p-2 rounded-xl mb-1 transition-all ${
                        isLoading || (!input.trim() && attachments.length === 0)
                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        : mode === AppMode.CHAT 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                </button>
            </div>
        </div>
      </footer>

      {/* Camera Modal */}
      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={handleCameraCapture} 
      />
    </div>
  );
};

export default App;
