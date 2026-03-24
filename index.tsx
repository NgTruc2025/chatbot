
import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Chat } from "@google/genai";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import "katex/dist/katex.min.css";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  Mic, 
  Settings, 
  Moon, 
  Sun, 
  GraduationCap, 
  ChevronLeft, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  Sparkles,
  BookOpen,
  MessageSquare,
  Info
} from "lucide-react";
import "./index.css";

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
 * Suggestions for each subject
 */
const SUBJECT_SUGGESTIONS: Record<string, string[]> = {
  "Toán học": ["Giải phương trình bậc 2 x² - 5x + 6 = 0", "Đạo hàm của hàm số sin(x) là gì?", "Công thức tính thể tích khối cầu?"],
  "Vật lý": ["Định luật bảo toàn năng lượng là gì?", "Giải thích hiện tượng tán sắc ánh sáng", "Công thức tính điện trở tương đương?"],
  "Hóa học": ["Cấu tạo nguyên tử gồm những gì?", "Cân bằng phương trình: Al + O₂ → Al₂O₃", "Đặc điểm của liên kết cộng hóa trị?"],
  "Sinh học": ["Quá trình quang hợp diễn ra như thế nào?", "Cấu trúc của phân tử DNA?", "Sự khác biệt giữa tế bào thực vật và động vật?"],
  "Ngữ văn": ["Phân tích giá trị nhân đạo trong Vợ nhặt", "Cách làm một bài văn nghị luận xã hội?", "Tóm tắt cốt truyện Truyện Kiều"],
  "Lịch sử": ["Nguyên nhân dẫn đến Chiến tranh thế giới thứ nhất?", "Ý nghĩa lịch sử của Cách mạng tháng Tám?", "Chiến dịch Điện Biên Phủ diễn ra năm nào?"],
  "Địa lý": ["Đặc điểm khí hậu nhiệt đới gió mùa?", "Tại sao có hiện tượng ngày và đêm?", "Các vùng kinh tế trọng điểm của Việt Nam?"],
  "Tiếng Anh": ["Cách dùng thì Hiện tại hoàn thành (Present Perfect)?", "Phân biệt 'Go', 'Went', 'Gone'?", "Viết một đoạn văn giới thiệu bản thân bằng tiếng Anh"],
  "Tin học": ["Ngôn ngữ lập trình Python là gì?", "Cách hoạt động của thuật toán tìm kiếm nhị phân?", "Cấu trúc của một mạng máy tính?"],
  "Giáo dục công dân": ["Quyền và nghĩa vụ của công dân là gì?", "Thế nào là vi phạm pháp luật dân sự?", "Tầm quan trọng của đạo đức trong đời sống?"],
  "Công nghệ": ["Nguyên lý làm việc của động cơ đốt trong?", "Quy trình thiết kế mạch điện gia đình?", "Cách sử dụng phần mềm AutoCAD cơ bản?"]
};

/**
 * System Instruction Template
 */
const getSystemInstruction = (subject: string) => `
Bạn là một Chatbot HỖ TRỢ CHUYÊN MÔN cho môn học: ${subject}.

Nhiệm vụ của bạn:
- Chỉ trả lời các câu hỏi LIÊN QUAN TRỰC TIẾP đến môn ${subject}.
- Nội dung trả lời phải chính xác, sư phạm, rõ ràng, phù hợp chương trình giáo dục phổ thông Việt Nam.
- Không suy đoán, không bịa đặt, không tạo thông tin khi không chắc chắn.
- **QUAN TRỌNG**: Bạn chỉ đóng vai trò là người hướng dẫn. Hãy giải thích các khái niệm, gợi ý các bước thực hiện và dẫn dắt người dùng tự tìm ra câu trả lời. 
- **TUYỆT ĐỐI KHÔNG** đưa ra đáp án cuối cùng ngay lập tức. Hãy chia nhỏ vấn đề và hướng dẫn từng bước một để người học tự tư duy.

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
- Giải thích khái niệm → Gợi ý bước thực hiện → Dẫn dắt người dùng tự giải quyết.
- Sử dụng Markdown để trình bày (in đậm, danh sách, khối mã) nếu cần thiết.
- **Lưu ý**: Sử dụng ký hiệu LaTeX (ví dụ: $x^2$, $\frac{a}{b}$) cho tất cả các công thức toán học, vật lý, hóa học để hiển thị đẹp hơn.

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
  background: theme === 'light' ? "#f8f9fa" : "#0f0f0f",
  surface: theme === 'light' ? "#ffffff" : "#1a1a1a",
  text: theme === 'light' ? "#1a1a1b" : "#e4e6eb",
  textSecondary: theme === 'light' ? "#65676b" : "#b0b3b8",
  border: theme === 'light' ? "#dee2e6" : "#303030",
  borderLight: theme === 'light' ? "#f0f2f5" : "#2a2a2a",
  inputBg: theme === 'light' ? "#f0f2f5" : "#2d2d2d",
  bubbleModel: theme === 'light' ? "#ffffff" : "#2d2d2d",
  bubbleModelText: theme === 'light' ? "#1a1a1b" : "#e4e6eb",
  shadow: theme === 'light' ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.3)",
  primary: "#0084ff",
  primaryHover: "#0073e6",
  suggestionBg: theme === 'light' ? "#e7f3ff" : "#26394a",
  suggestionText: theme === 'light' ? "#1877f2" : "#4599ff",
});

// --- Components ---

function LoadingIndicator({ theme }: { theme: Theme }) {
  const colors = getThemeColors(theme);
  return (
    <div style={{ display: "flex", padding: "12px 0", gap: "6px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: colors.primary,
          }}
        />
      ))}
    </div>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: Theme, onToggle: () => void }) {
  const colors = getThemeColors(theme);
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      style={{
        background: colors.inputBg,
        border: "none",
        cursor: "pointer",
        padding: "10px",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: colors.textSecondary,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      title={theme === 'light' ? "Chế độ tối" : "Chế độ sáng"}
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </motion.button>
  );
}

function App() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('custom_api_key') || "");
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('custom_api_key') && !process.env.API_KEY);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('subject_suggestions');
    return saved ? JSON.parse(saved) : SUBJECT_SUGGESTIONS;
  });
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
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
  }, [theme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (isSetup && subject) {
      localStorage.setItem(`chat_history_${subject}`, JSON.stringify(messages));
    }
  }, [messages, isSetup, subject]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
  };

  const handleStart = async () => {
    if (!subject.trim()) return;

    try {
      const effectiveKey = (apiKey || process.env.API_KEY || "").trim();
      if (!effectiveKey) {
        alert("Vui lòng cấu hình API Key trong phần cài đặt trước khi bắt đầu.");
        setIsSettingsOpen(true);
        return;
      }
      const ai = new GoogleGenAI({ apiKey: effectiveKey });
      aiClientRef.current = ai;
      
      chatRef.current = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: getSystemInstruction(subject),
          temperature: 0.5,
        },
      });

      setIsSetup(true);
      
      const savedHistory = localStorage.getItem(`chat_history_${subject}`);
      if (savedHistory) {
        setMessages(JSON.parse(savedHistory));
      } else {
        setMessages([
          {
            role: "model",
            text: `Xin chào! Tôi là trợ lý chuyên môn cho môn **${subject}**. Bạn có thắc mắc gì về môn học này cần tôi giải đáp không? Hãy chọn một gợi ý bên dưới hoặc đặt câu hỏi trực tiếp cho tôi nhé!`,
          },
        ]);
      }
    } catch (error) {
      console.error("Error initializing chat:", error);
      alert("Có lỗi khi khởi tạo. Vui lòng kiểm tra API Key.");
    }
  };

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !chatRef.current || isGenerating || isRecording || isTranscribing) return;

    const userMsg = textToSend.trim();
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
    } catch (error: any) {
      console.error("Error sending message:", error);
      let errorMsg = "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.";
      if (error?.message?.includes("429")) {
        errorMsg = "Hệ thống đang quá tải (Quota Exceeded). Vui lòng đợi một lát rồi thử lại.";
      }
      setMessages((prev) => [
        ...prev,
        { role: "model", text: errorMsg },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = () => sendMessage(inputText);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    if (confirm("Bạn có chắc chắn muốn thoát phiên học này và đổi môn học không?")) {
      setIsSetup(false);
      setSubject("");
      setMessages([]);
      chatRef.current = null;
    }
  };

  const handleClearHistory = () => {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện của môn học này không?")) {
      localStorage.removeItem(`chat_history_${subject}`);
      setMessages([
        {
          role: "model",
          text: `Lịch sử đã được xóa. Tôi là trợ lý chuyên môn cho môn **${subject}**. Bạn cần tôi giúp gì tiếp theo?`,
        },
      ]);
    }
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
      alert("Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.");
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
      const effectiveKey = (apiKey || process.env.API_KEY || "").trim();
      const ai = aiClientRef.current || new GoogleGenAI({ apiKey: effectiveKey });
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

  const saveApiKey = (key: string) => {
    const trimmedKey = key.trim();
    setApiKey(trimmedKey);
    localStorage.setItem('custom_api_key', trimmedKey);
    setIsSettingsOpen(false);
    setShowWelcome(false);
    // Re-initialize AI client if needed
    if (aiClientRef.current) {
      aiClientRef.current = new GoogleGenAI({ apiKey: trimmedKey || process.env.API_KEY || "" });
    }
  };

  const saveSuggestions = (newSuggestions: Record<string, string[]>) => {
    setSuggestions(newSuggestions);
    localStorage.setItem('subject_suggestions', JSON.stringify(newSuggestions));
  };

  const WelcomeScreen = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: '1rem'
      }}
    >
      <motion.div 
        initial={{ y: 20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        style={{
          backgroundColor: colors.surface, padding: '3rem 2rem', borderRadius: '32px',
          width: '100%', maxWidth: '500px', boxShadow: `0 30px 60px ${colors.shadow}`,
          textAlign: 'center', border: `1px solid ${colors.border}`
        }}
      >
        <motion.div 
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ fontSize: '4rem', marginBottom: '1.5rem' }}
        >
          <Sparkles size={64} color={colors.primary} style={{ margin: '0 auto' }} />
        </motion.div>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem' }}>Chào mừng bạn!</h1>
        <p style={{ color: colors.textSecondary, lineHeight: '1.6', marginBottom: '2rem' }}>
          Để bắt đầu sử dụng Trợ lý Học tập AI, bạn cần cấu hình Gemini API Key. 
          Đây là dịch vụ hoàn toàn miễn phí từ Google.
        </p>
        
        <div style={{ 
          textAlign: 'left', backgroundColor: colors.inputBg, padding: '1.5rem', 
          borderRadius: '20px', marginBottom: '2rem', border: `1px solid ${colors.border}` 
        }}>
          <h3 style={{ marginTop: 0, fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={18} color={colors.primary} /> Hướng dẫn lấy API Key:
          </h3>
          <ol style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', color: colors.text, lineHeight: '1.8' }}>
            <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: colors.primary, fontWeight: '700', textDecoration: 'none' }}>Google AI Studio</a>.</li>
            <li>Nhấn nút <b>"Create API key"</b>.</li>
            <li>Sao chép mã và dán vào ô bên dưới.</li>
          </ol>
        </div>

        <input 
          type="password"
          placeholder="Dán API Key của bạn tại đây..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{
            width: '100%', padding: '16px 20px', borderRadius: '16px',
            border: `2px solid ${colors.border}`, backgroundColor: colors.inputBg,
            color: colors.text, marginBottom: '1.5rem', outline: 'none', fontSize: '1rem',
            transition: 'border-color 0.2s'
          }}
        />

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => saveApiKey(apiKey)}
          disabled={!apiKey.trim()}
          style={{
            width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
            backgroundColor: colors.primary, color: 'white', cursor: apiKey.trim() ? 'pointer' : 'not-allowed', 
            fontWeight: '700', fontSize: '1.1rem', opacity: apiKey.trim() ? 1 : 0.6,
            boxShadow: apiKey.trim() ? `0 10px 20px ${colors.primary}44` : 'none',
          }}
        >
          Bắt đầu sử dụng
        </motion.button>
        
        {process.env.API_KEY && (
          <button 
            onClick={() => setShowWelcome(false)}
            style={{
              marginTop: '1rem', background: 'none', border: 'none', color: colors.textSecondary,
              cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline'
            }}
          >
            Sử dụng Key hệ thống
          </button>
        )}
      </motion.div>
    </motion.div>
  );

  const SettingsModal = () => {
    const [activeTab, setActiveTab] = useState<'api' | 'suggestions'>('api');
    const [selectedSubject, setSelectedSubject] = useState(subject || SUBJECT_LIST[0]);
    const [newSuggestion, setNewSuggestion] = useState("");
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editingText, setEditingText] = useState("");

    const currentSuggestions = suggestions[selectedSubject] || [];

    const handleAddSuggestion = () => {
      if (!newSuggestion.trim()) return;
      const updated = {
        ...suggestions,
        [selectedSubject]: [...currentSuggestions, newSuggestion.trim()]
      };
      saveSuggestions(updated);
      setNewSuggestion("");
    };

    const handleDeleteSuggestion = (idx: number) => {
      const updatedList = currentSuggestions.filter((_, i) => i !== idx);
      const updated = {
        ...suggestions,
        [selectedSubject]: updatedList
      };
      saveSuggestions(updated);
    };

    const handleStartEdit = (idx: number, text: string) => {
      setEditingIdx(idx);
      setEditingText(text);
    };

    const handleSaveEdit = (idx: number) => {
      if (!editingText.trim()) return;
      const updatedList = [...currentSuggestions];
      updatedList[idx] = editingText.trim();
      const updated = {
        ...suggestions,
        [selectedSubject]: updatedList
      };
      saveSuggestions(updated);
      setEditingIdx(null);
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3000, backdropFilter: 'blur(12px)', padding: '1rem'
        }}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          style={{
            backgroundColor: colors.surface, borderRadius: '28px',
            width: '100%', maxWidth: '500px', maxHeight: '85vh', overflow: 'hidden',
            boxShadow: `0 25px 50px ${colors.shadow}`, display: 'flex', flexDirection: 'column',
            border: `1px solid ${colors.border}`
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.inputBg + '44' }}>
            <button 
              onClick={() => setActiveTab('api')}
              style={{
                flex: 1, padding: '1.2rem', border: 'none', background: 'none',
                color: activeTab === 'api' ? colors.primary : colors.textSecondary,
                fontWeight: '800', cursor: 'pointer', borderBottom: activeTab === 'api' ? `3px solid ${colors.primary}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em'
              }}
            >
              <Settings size={18} /> API Key
            </button>
            <button 
              onClick={() => setActiveTab('suggestions')}
              style={{
                flex: 1, padding: '1.2rem', border: 'none', background: 'none',
                color: activeTab === 'suggestions' ? colors.primary : colors.textSecondary,
                fontWeight: '800', cursor: 'pointer', borderBottom: activeTab === 'suggestions' ? `3px solid ${colors.primary}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em'
              }}
            >
              <MessageSquare size={18} /> Gợi ý
            </button>
          </div>

          <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
            {activeTab === 'api' ? (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '800' }}>Cấu hình API Key</h2>
                <p style={{ color: colors.textSecondary, fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  Nhập Gemini API Key của bạn để sử dụng ứng dụng. Key sẽ được lưu an toàn trong trình duyệt của bạn.
                </p>
                <input 
                  type="password"
                  placeholder="Nhập API Key tại đây..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{
                    width: '100%', padding: '14px 18px', borderRadius: '14px',
                    border: `2px solid ${colors.border}`, backgroundColor: colors.inputBg,
                    color: colors.text, marginBottom: '1.5rem', outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => saveApiKey(apiKey)}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                    backgroundColor: colors.primary, color: 'white', cursor: 'pointer', fontWeight: '700',
                    boxShadow: `0 4px 12px ${colors.primary}33`
                  }}
                >Lưu API Key</motion.button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '800' }}>Quản lý câu hỏi gợi ý</h2>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' }}>Chọn môn học:</label>
                  <select 
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '12px',
                      border: `2px solid ${colors.border}`, backgroundColor: colors.inputBg,
                      color: colors.text, outline: 'none', cursor: 'pointer'
                    }}
                  >
                    {SUBJECT_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' }}>Thêm gợi ý mới:</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text"
                      placeholder="Nhập câu hỏi gợi ý..."
                      value={newSuggestion}
                      onChange={(e) => setNewSuggestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSuggestion()}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '12px',
                        border: `2px solid ${colors.border}`, backgroundColor: colors.inputBg,
                        color: colors.text, outline: 'none'
                      }}
                    />
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAddSuggestion}
                      style={{
                        width: '44px', height: '44px', borderRadius: '12px', border: 'none',
                        backgroundColor: colors.primary, color: 'white', cursor: 'pointer', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    ><Plus size={20} /></motion.button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <AnimatePresence>
                    {currentSuggestions.map((s, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                          padding: '12px 16px', borderRadius: '14px', backgroundColor: colors.inputBg,
                          border: `1px solid ${colors.border}`, display: 'flex', gap: '10px', alignItems: 'center'
                        }}
                      >
                        {editingIdx === i ? (
                          <input 
                            autoFocus
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => handleSaveEdit(i)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(i)}
                            style={{ flex: 1, background: 'none', border: 'none', color: colors.text, outline: 'none', fontSize: '0.9rem' }}
                          />
                        ) : (
                          <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: '500' }}>{s}</span>
                        )}
                        
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <motion.button 
                            whileHover={{ scale: 1.1, color: colors.primary }}
                            onClick={() => editingIdx === i ? handleSaveEdit(i) : handleStartEdit(i, s)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary, padding: '6px' }}
                          >
                            {editingIdx === i ? <Check size={16} /> : <Edit2 size={16} />}
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1, color: '#ef4444' }}
                            onClick={() => handleDeleteSuggestion(i)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary, padding: '6px' }}
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {currentSuggestions.length === 0 && (
                    <div style={{ textAlign: 'center', color: colors.textSecondary, padding: '1.5rem', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      Chưa có câu hỏi gợi ý nào cho môn học này.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          <div style={{ padding: '1.2rem 2rem', borderTop: `1px solid ${colors.border}`, textAlign: 'right', backgroundColor: colors.inputBg + '22' }}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsSettingsOpen(false)}
              style={{
                padding: '10px 24px', borderRadius: '12px', border: `1px solid ${colors.border}`,
                backgroundColor: colors.surface, color: colors.text, cursor: 'pointer', fontWeight: '700',
                fontSize: '0.9rem'
              }}
            >Đóng</motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const containerStyle: React.CSSProperties = {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    backgroundColor: colors.background,
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    color: colors.text,
    transition: "background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  if (!isSetup) {
    return (
      <div style={containerStyle}>
        {showWelcome && <WelcomeScreen />}
        {isSettingsOpen && <SettingsModal />}
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '12px', zIndex: 10 }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSettingsOpen(true)}
            style={{
              background: colors.inputBg, cursor: "pointer",
              padding: "10px", borderRadius: "12px", display: "flex",
              alignItems: "center", justifyContent: "center", color: colors.textSecondary,
              border: `1px solid ${colors.border}`
            }}
            title="Cấu hình API Key"
          >
            <Settings size={20} />
          </motion.button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: "3rem 2.5rem",
              backgroundColor: colors.surface,
              borderRadius: "32px",
              boxShadow: `0 20px 50px ${colors.shadow}`,
              maxWidth: "450px",
              width: "100%",
              textAlign: "center",
              border: `1px solid ${colors.border}`
            }}
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              style={{ 
                width: '100px', height: '100px', 
                backgroundColor: colors.primary + '11', 
                borderRadius: '30px', margin: '0 auto 1.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: colors.primary
              }}
            >
              <GraduationCap size={56} />
            </motion.div>
            <h1 style={{ marginBottom: "0.5rem", color: colors.text, fontSize: "2rem", fontWeight: "800", letterSpacing: '-0.03em' }}>Trợ lý Học tập</h1>
            <p style={{ marginBottom: '2.5rem', color: colors.textSecondary, lineHeight: '1.6', fontSize: '0.95rem' }}>
              Chọn môn học để bắt đầu hành trình chinh phục kiến thức cùng trí tuệ nhân tạo.
            </p>
            
            <div style={{ position: 'relative', textAlign: 'left' }}>
              <label style={{ 
                display: 'block', marginBottom: '0.6rem', fontSize: '0.85rem', 
                fontWeight: '700', color: colors.textSecondary, marginLeft: '4px',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>Lĩnh vực học tập</label>
              <select
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  borderRadius: "16px",
                  border: `2px solid ${colors.border}`,
                  marginBottom: "2rem",
                  fontSize: "1.05rem",
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  cursor: "pointer",
                  outline: "none",
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22${encodeURIComponent(colors.textSecondary)}%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 20px center",
                  backgroundSize: "20px",
                  transition: "all 0.2s",
                }}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                autoFocus
              >
                <option value="" disabled>-- Chọn một môn học --</option>
                {SUBJECT_LIST.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: "100%",
                padding: "18px",
                backgroundColor: colors.primary,
                color: "white",
                border: "none",
                borderRadius: "18px",
                fontSize: "1.1rem",
                cursor: subject ? "pointer" : "not-allowed",
                fontWeight: "700",
                opacity: subject ? 1 : 0.6,
                boxShadow: subject ? `0 8px 25px ${colors.primary}44` : "none",
              }} 
              onClick={handleStart}
              disabled={!subject}
            >
              Bắt đầu ngay
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {isSettingsOpen && <SettingsModal />}
      <style>{`
        @keyframes messageIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(217, 48, 37, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(217, 48, 37, 0); } 100% { box-shadow: 0 0 0 0 rgba(217, 48, 37, 0); } }
        .message-item { animation: messageIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .suggestion-pill:hover { filter: brightness(0.95); transform: translateY(-1px); }
        .suggestion-pill:active { transform: translateY(0); }
      `}</style>
      
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          padding: "0.75rem 1.5rem",
          backgroundColor: colors.surface + 'dd',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${colors.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: `0 4px 20px ${colors.shadow}`,
          zIndex: 100,
          transition: "all 0.3s",
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.div 
            whileHover={{ rotate: 15 }}
            style={{ 
              width: '40px', height: '40px', 
              borderRadius: '12px', 
              backgroundColor: colors.primary + '11',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: colors.primary
            }}
          >
            <BookOpen size={22} />
          </motion.div>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: "800", color: colors.text, letterSpacing: '-0.02em' }}>{subject}</div>
            <div style={{ fontSize: '0.7rem', color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={10} /> AI Chuyên gia
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSettingsOpen(true)}
            style={{
              background: colors.inputBg, cursor: "pointer",
              padding: "8px", borderRadius: "10px", display: "flex",
              alignItems: "center", justifyContent: "center", color: colors.textSecondary,
              border: `1px solid ${colors.border}`
            }}
            title="Cấu hình API Key"
          >
            <Settings size={18} />
          </motion.button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <div style={{ width: '1px', height: '20px', backgroundColor: colors.border, margin: '0 2px' }} />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClearHistory}
            style={{
              background: colors.inputBg, cursor: "pointer",
              padding: "8px", borderRadius: "10px", display: "flex",
              alignItems: "center", justifyContent: "center", color: "#ef4444",
              border: `1px solid ${colors.border}`
            }}
            title="Xóa lịch sử chat"
          >
            <Trash2 size={18} />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: colors.inputBg,
              border: `1px solid ${colors.border}`,
              padding: "8px 14px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "0.8rem",
              color: colors.textSecondary,
              fontWeight: "700",
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }} 
            onClick={handleReset}
          >
            <RotateCcw size={14} /> Đổi môn
          </motion.button>
        </div>
      </motion.div>

      {/* Chat Area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.2rem",
        scrollBehavior: 'smooth'
      }}>
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{
                maxWidth: "85%",
                padding: "12px 18px",
                borderRadius: "20px",
                lineHeight: "1.6",
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                backgroundColor: msg.role === "user" ? colors.primary : colors.bubbleModel,
                color: msg.role === "user" ? "#fff" : colors.bubbleModelText,
                borderBottomRightRadius: msg.role === "user" ? "4px" : "20px",
                borderBottomLeftRadius: msg.role === "model" ? "4px" : "20px",
                boxShadow: msg.role === "user" 
                  ? `0 4px 12px ${colors.primary}22` 
                  : `0 2px 10px ${colors.shadow}`,
                fontSize: "0.95rem",
                border: msg.role === "model" ? `1px solid ${colors.border}` : "none",
                position: 'relative'
              }}
            >
              {msg.text ? (
                <div className="markdown-body">
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath, remarkBreaks]} 
                    rehypePlugins={[rehypeKatex]}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              ) : (msg.role === "model" && isGenerating && idx === messages.length - 1 ? <LoadingIndicator theme={theme} /> : "")}
              
              {msg.role === "model" && !isGenerating && idx === messages.length - 1 && (
                <div style={{ position: 'absolute', bottom: '-20px', left: '4px', fontSize: '0.65rem', color: colors.textSecondary, fontWeight: '600' }}>
                  Trợ lý AI • Vừa xong
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Suggested Questions Section */}
        {messages.length === 1 && !isGenerating && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              marginTop: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem',
              alignItems: 'flex-start',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', marginLeft: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={12} color={colors.primary} /> Gợi ý cho bạn:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {(suggestions[subject] || []).map((suggestion, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.02, backgroundColor: colors.primary + '11' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => sendMessage(suggestion)}
                  style={{
                    backgroundColor: colors.suggestionBg,
                    color: colors.suggestionText,
                    border: `1px solid ${colors.primary}22`,
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textAlign: 'left',
                    maxWidth: '100%'
                  }}
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          padding: "1.2rem 1.5rem",
          backgroundColor: colors.surface + 'dd',
          backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${colors.border}`,
          boxShadow: `0 -10px 30px ${colors.shadow}`,
        }}
      >
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-end",
          backgroundColor: colors.inputBg,
          padding: '8px 12px',
          borderRadius: '28px',
          border: `1px solid ${isGenerating ? colors.primary + '66' : colors.border}`,
          transition: 'all 0.3s ease',
          boxShadow: isGenerating 
            ? `0 0 20px ${colors.primary}15` 
            : `0 4px 20px ${colors.shadow}`,
        }}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: "40px", height: "40px", borderRadius: "50%",
              backgroundColor: isRecording ? "#fee2e2" : "transparent",
              color: isRecording ? "#ef4444" : colors.textSecondary,
              border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
              transition: "all 0.2s",
            }}
            onClick={handleMicClick}
            disabled={isGenerating || isTranscribing}
            title="Ghi âm câu hỏi"
          >
             {isTranscribing ? <LoadingIndicator theme={theme} /> : (
               isRecording ? <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}><Mic size={20} /></motion.div> : <Mic size={20} />
             )}
          </motion.button>

          <textarea
            style={{
              flex: 1, 
              padding: "10px 4px", 
              borderRadius: "0", 
              border: `none`,
              fontSize: "0.95rem", 
              outline: "none", 
              resize: "none", 
              height: "24px", 
              minHeight: "24px", 
              maxHeight: "150px",
              fontFamily: "inherit", 
              backgroundColor: "transparent", 
              color: colors.text,
              lineHeight: '1.5'
            }}
            placeholder={isRecording ? "Đang lắng nghe..." : (isTranscribing ? "Đang chép lời..." : "Đặt câu hỏi cho tôi...")}
            value={inputText}
            onChange={handleInputResize}
            onKeyDown={handleKeyDown}
            disabled={isGenerating || isRecording || isTranscribing}
            rows={1}
          />
          
          <motion.button 
            whileHover={inputText.trim() && !isGenerating ? { scale: 1.05 } : {}}
            whileTap={inputText.trim() && !isGenerating ? { scale: 0.95 } : {}}
            style={{
              width: "40px", height: "40px", borderRadius: "14px",
              backgroundColor: colors.primary, color: "white",
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: inputText.trim() && !isGenerating ? "pointer" : "default",
              opacity: inputText.trim() && !isGenerating && !isRecording && !isTranscribing ? 1 : 0.4,
              boxShadow: inputText.trim() && !isGenerating ? `0 4px 12px ${colors.primary}44` : "none",
              transition: "all 0.2s",
            }} 
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isGenerating || isRecording || isTranscribing}
          >
            <Send size={18} />
          </motion.button>
        </div>
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.7rem', color: colors.textSecondary, fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Bản quyền thuộc về NTT_IT_GROUP
        </div>
      </motion.div>
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
