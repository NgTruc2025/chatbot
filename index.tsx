
import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Chat } from "@google/genai";

/**
 * List of standard subjects for the dropdown
 */
const SUBJECT_LIST = [
  "Toán học",
  "Vật lý",
  "Hóa học",
  "Sinh học",
  "Ngữ văn",
  "Lịch sử",
  "Địa lý",
  "Tiếng Anh",
  "Tin học",
  "Giáo dục công dân",
  "Công nghệ"
];

/**
 * System Instruction Template
 */
const getSystemInstruction = (subject: string) => `
Bạn là một Chatbot HỖ TRỢ CHUYÊN MÔN cho môn học: ${subject}.

Nhiệm vụ của bạn:
- Chỉ trả lời các câu hỏi LIÊN QUAN TRỰC TIẾP đến môn ${subject}.
- Nội dung trả lời phải chính xác, sư phạm, rõ ràng, phù hợp chương trình giáo dục phổ thông Việt Nam.
- Không suy đoán, không bịa đặt, không tạo thông tin khi không chắc chắn.

Nguyên tắc bắt buộc:
1. Nếu câu hỏi KHÔNG thuộc phạm vi môn ${subject}:
   → Trả lời: "Câu hỏi này nằm ngoài phạm vi hỗ trợ của môn ${subject}. Tôi không thể trả lời."
2. Nếu câu hỏi mơ hồ, thiếu dữ kiện:
   → Yêu cầu người dùng cung cấp thêm thông tin cụ thể.
3. Nếu kiến thức chưa chắc chắn hoặc vượt quá chương trình:
   → Trả lời trung thực: "Nội dung này vượt ngoài phạm vi chương trình/không đủ cơ sở xác thực để trả lời chính xác."
4. Không trả lời các nội dung trái đạo đức, chính trị, y tế, hoặc không phục vụ học tập.

Phong cách trả lời:
- Ngắn gọn – đúng trọng tâm – sư phạm.
- Giải thích khái niệm → Ví dụ → Ghi nhớ.

Bạn KHÔNG phải là trợ lý đa năng. Bạn CHỈ là trợ lý cho môn: ${subject}.
`;

// --- Helpers ---

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64 = base64String.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// --- Types ---

interface Message {
  role: "user" | "model";
  text: string;
}

type Theme = 'light' | 'dark';

// --- Dynamic Styles Generator ---

const getThemeColors = (theme: Theme) => ({
  background: theme === 'light' ? "#f0f2f5" : "#121212",
  surface: theme === 'light' ? "white" : "#1e1e1e",
  text: theme === 'light' ? "#202124" : "#e8eaed",
  textSecondary: theme === 'light' ? "#5f6368" : "#9aa0a6",
  border: theme === 'light' ? "#e0e0e0" : "#333",
  borderLight: theme === 'light' ? "#eee" : "#2d2d2d",
  inputBg: theme === 'light' ? "#fafafa" : "#2d2d2d",
  inputBgHeader: theme === 'light' ? "#f8f9fa" : "#303134",
  bubbleModel: theme === 'light' ? "white" : "#2d2d2d",
  bubbleModelText: theme === 'light' ? "#202124" : "#e8eaed",
  shadow: theme === 'light' ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.4)",
  primary: "#1a73e8",
});

// --- Components ---

function LoadingIndicator({ theme }: { theme: Theme }) {
  const colors = getThemeColors(theme);
  return (
    <div style={{ display: "flex", padding: "8px" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            display: "inline-block",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: colors.textSecondary,
            margin: "0 2px",
            animation: `bounce 1.4s infinite ease-in-out both ${i * -0.16}s`,
          }}
        />
      ))}
      <style>
        {`@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }`}
      </style>
    </div>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: Theme, onToggle: () => void }) {
  const colors = getThemeColors(theme);
  return (
    <button
      onClick={onToggle}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "8px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: colors.textSecondary,
        transition: "background 0.2s",
      }}
      title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
    >
      {theme === 'light' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      )}
    </button>
  );
}

function App() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [subject, setSubject] = useState("");
  const [isSetup, setIsSetup] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiClientRef = useRef<GoogleGenAI | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const colors = getThemeColors(theme);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
  };

  const handleStart = async () => {
    if (!subject.trim()) return;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      aiClientRef.current = ai;
      
      chatRef.current = ai.chats.create({
        model: "gemini-3-pro-preview",
        config: {
          systemInstruction: getSystemInstruction(subject),
          temperature: 0.5,
        },
      });

      setIsSetup(true);
      setMessages([
        {
          role: "model",
          text: `Xin chào! Tôi là trợ lý chuyên môn cho môn **${subject}**. Bạn có thắc mắc gì về môn học này cần tôi giải đáp không?`,
        },
      ]);
    } catch (error) {
      console.error("Error initializing chat:", error);
      alert("Có lỗi khi khởi tạo. Vui lòng kiểm tra API Key.");
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !chatRef.current || isGenerating || isRecording || isTranscribing) return;

    const userMsg = inputText.trim();
    setInputText("");
    setIsGenerating(true);

    const textarea = document.querySelector('textarea');
    if (textarea) textarea.style.height = '24px';

    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);

    try {
      const result = await chatRef.current.sendMessageStream({
        message: userMsg,
      });

      let fullResponseText = "";
      setMessages((prev) => [...prev, { role: "model", text: "" }]);

      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          fullResponseText += text;
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg.role === "model") {
              lastMsg.text = fullResponseText;
            }
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại." },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    setIsSetup(false);
    setSubject("");
    setMessages([]);
    chatRef.current = null;
  };

  const handleMicClick = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = transcribeAudio;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Không thể truy cập microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const transcribeAudio = async () => {
    if (audioChunksRef.current.length === 0) return;
    setIsTranscribing(true);
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const base64Audio = await blobToBase64(audioBlob);
      const ai = aiClientRef.current || new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        contents: {
          parts: [
            { inlineData: { mimeType: "audio/webm", data: base64Audio } },
            { text: "Chép lại chính xác lời nói trong đoạn ghi âm này thành văn bản tiếng Việt. Chỉ trả về nội dung văn bản." }
          ]
        }
      });
      const text = response.text;
      if (text) {
        setInputText(prev => (prev ? prev + " " + text : text).trim());
        setTimeout(() => {
          const textarea = document.querySelector('textarea');
          if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
          }
        }, 0);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsTranscribing(false);
      audioChunksRef.current = [];
    }
  };

  // Common Styles Wrapper
  const containerStyle: React.CSSProperties = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    backgroundColor: colors.background,
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    color: colors.text,
    transition: "background-color 0.3s, color 0.3s",
  };

  if (!isSetup) {
    return (
      <div style={containerStyle}>
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{
            padding: "2.5rem 2rem",
            backgroundColor: colors.surface,
            borderRadius: "16px",
            boxShadow: `0 10px 25px ${colors.shadow}`,
            maxWidth: "420px",
            width: "90%",
            textAlign: "center",
            transition: "background-color 0.3s",
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎓</div>
            <h1 style={{ marginBottom: "1.5rem", color: colors.primary, fontSize: "1.75rem", fontWeight: "700" }}>Trợ lý Học tập AI</h1>
            <p style={{ marginBottom: '2rem', color: colors.textSecondary, lineHeight: '1.6' }}>
              Chào mừng bạn! Vui lòng chọn môn học cần hỗ trợ chuyên môn để bắt đầu.
            </p>
            
            <select
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                border: `2px solid ${colors.border}`,
                marginBottom: "1.5rem",
                fontSize: "1rem",
                backgroundColor: colors.inputBg,
                color: colors.text,
                cursor: "pointer",
                outline: "none",
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22${encodeURIComponent(colors.textSecondary)}%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                backgroundSize: "18px",
              }}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              autoFocus
            >
              <option value="" disabled>-- Chọn môn học --</option>
              {SUBJECT_LIST.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <button 
              style={{
                width: "100%",
                padding: "14px",
                backgroundColor: colors.primary,
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "1rem",
                cursor: subject ? "pointer" : "not-allowed",
                fontWeight: "600",
                opacity: subject ? 1 : 0.5,
                boxShadow: subject ? `0 4px 6px ${colors.primary}33` : "none",
                transition: "all 0.2s",
              }} 
              onClick={handleStart}
              disabled={!subject}
            >
              Bắt đầu học ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(217, 48, 37, 0.4); }
          70% { box-shadow: 0 0 0 12px rgba(217, 48, 37, 0); }
          100% { box-shadow: 0 0 0 0 rgba(217, 48, 37, 0); }
        }
      `}</style>
      
      <div style={{
        padding: "1rem 1.5rem",
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.borderLight}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: `0 2px 4px ${colors.shadow}`,
        zIndex: 10,
        transition: "background-color 0.3s, border-color 0.3s",
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.75rem' }}>📚</span>
          <div>
            <div style={{ fontSize: "1.2rem", fontWeight: "700", color: colors.primary }}>{subject}</div>
            <div style={{ fontSize: '0.8rem', color: colors.textSecondary, fontWeight: '500' }}>AI Support Specialist</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button style={{
            background: colors.inputBgHeader,
            border: `1px solid ${colors.border}`,
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.85rem",
            color: colors.textSecondary,
            fontWeight: "500",
            transition: "all 0.2s",
          }} onClick={handleReset}>
            Đổi môn học
          </button>
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.2rem",
      }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            maxWidth: "85%",
            padding: "12px 18px",
            borderRadius: "18px",
            lineHeight: "1.6",
            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            backgroundColor: msg.role === "user" ? colors.primary : colors.bubbleModel,
            color: msg.role === "user" ? "white" : colors.bubbleModelText,
            borderTopRightRadius: msg.role === "user" ? "4px" : "18px",
            borderTopLeftRadius: msg.role === "model" ? "4px" : "18px",
            boxShadow: msg.role === "model" ? `0 2px 5px ${colors.shadow}` : "none",
            whiteSpace: "pre-wrap",
            fontSize: "0.95rem",
            transition: "background-color 0.3s",
          }}>
            {msg.text || (msg.role === "model" && isGenerating && idx === messages.length - 1 ? <LoadingIndicator theme={theme} /> : "")}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{
        padding: "1rem 1.5rem",
        backgroundColor: colors.surface,
        borderTop: `1px solid ${colors.borderLight}`,
        display: "flex",
        gap: "0.75rem",
        alignItems: "flex-end",
        transition: "background-color 0.3s",
      }}>
        <button
          style={{
            width: "48px", height: "48px", borderRadius: "50%",
            backgroundColor: isRecording ? "#fce8e6" : colors.inputBgHeader,
            color: isRecording ? "#d93025" : colors.textSecondary,
            border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
            animation: isRecording ? "pulse 1.5s infinite" : "none",
            transition: "all 0.2s",
          }}
          onClick={handleMicClick}
          disabled={isGenerating || isTranscribing}
          title="Nhập bằng giọng nói"
        >
           {isTranscribing ? <LoadingIndicator theme={theme} /> : (
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
               <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
               <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
               <line x1="12" y1="19" x2="12" y2="23"></line>
               <line x1="8" y1="23" x2="16" y2="23"></line>
             </svg>
           )}
        </button>

        <textarea
          style={{
            flex: 1, padding: "12px 18px", borderRadius: "26px", border: `1px solid ${colors.border}`,
            fontSize: "1rem", outline: "none", resize: "none", height: "24px", minHeight: "24px", maxHeight: "150px",
            fontFamily: "inherit", overflowY: "auto", backgroundColor: colors.inputBg, color: colors.text,
            transition: "background-color 0.3s, border-color 0.3s, color 0.3s",
          }}
          placeholder={isRecording ? "Đang lắng nghe..." : (isTranscribing ? "Đang xử lý giọng nói..." : "Hỏi trợ lý môn học...")}
          value={inputText}
          onChange={handleInputResize}
          onKeyDown={handleKeyDown}
          disabled={isGenerating || isRecording || isTranscribing}
          rows={1}
        />
        
        <button 
          style={{
            width: "48px", height: "48px", borderRadius: "50%",
            backgroundColor: colors.primary, color: "white",
            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: inputText.trim() && !isGenerating ? "pointer" : "default",
            opacity: inputText.trim() && !isGenerating && !isRecording && !isTranscribing ? 1 : 0.4,
            transform: inputText.trim() && !isGenerating ? 'scale(1)' : 'scale(0.95)',
            boxShadow: `0 2px 4px ${colors.primary}4d`,
            transition: "all 0.2s",
          }} 
          onClick={handleSendMessage}
          disabled={!inputText.trim() || isGenerating || isRecording || isTranscribing}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
}

// Fixed initialization to prevent Error #299
const container = document.getElementById("root");
if (container) {
  if (!(window as any)._reactRoot) {
    (window as any)._reactRoot = createRoot(container);
  }
  (window as any)._reactRoot.render(<App />);
} else {
  console.error("Failed to find the root element with id 'root'");
}
