import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, MessageSquarePlus, Mic, Trash2, Volume2, X } from 'lucide-react';
import './HealthChatbot.css';
import { useLanguage } from '../../context/LanguageContext.jsx';
import BrandMark from '../../components/layout/BrandMark.jsx';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';

const API_URL = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')}/api/chatbot`;
const imageMarker = '[Image attached]';
const maxImageBytes = 5 * 1024 * 1024;
const speechLocales = {
  en: 'en-US',
  hi: 'hi-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
};

const welcomeMessage = {
  sender: 'assistant',
  text: 'Hi! What health question is on your mind? I can explain general health topics or help you find features in GramHealthCareAI. I can’t diagnose or recommend treatment, but I’ll do my best to make the information clear and helpful.',
};

async function chatbotRequest(path, options = {}) {
  const token = localStorage.getItem('gramhealth-token');
  if (!token) throw new Error('Please log in to use the health assistant.');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Chatbot request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function readImageAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read the selected image.'));
        return;
      }
      resolve(reader.result.slice(reader.result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });
}

function mapStoredMessage(item) {
  const hasImage = item.sender === 'user' && item.content.startsWith(imageMarker);
  return {
    id: item.id,
    sender: item.sender,
    text: hasImage ? item.content.slice(imageMarker.length).trim() : item.content,
    hasImage,
  };
}

function HealthChatbot() {
  const { t, language, locale } = useLanguage();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const imagePreview = selectedImage?.previewUrl || '';
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageKey, setSpeakingMessageKey] = useState(null);
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => {
    if (selectedImage?.previewUrl) URL.revokeObjectURL(selectedImage.previewUrl);
  }, [selectedImage]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    let active = true;

    async function loadChat() {
      try {
        const data = await chatbotRequest('/conversations');
        if (!active) return;
        setConversations(data.conversations || []);

        let conversation = data.conversations?.[0];
        if (!conversation) {
          const created = await chatbotRequest('/conversations', { method: 'POST' });
          if (!active) return;
          conversation = created.conversation;
          setConversations([conversation]);
        }

        const history = await chatbotRequest(`/conversations/${conversation.id}/messages`);
        if (!active) return;
        setConversationId(conversation.id);
        setMessages((history.messages || []).map(mapStoredMessage));
      } catch (error) {
        if (!active) return;
        console.error('Load chatbot history error:', error.message);
        setNotice('Could not load your chat history.');
        if (error.status === 401) {
          localStorage.removeItem('gramhealth-token');
          localStorage.removeItem('gramhealth-authenticated');
          navigate('/login', { replace: true });
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadChat();
    return () => { active = false; };
  }, [navigate, t]);

  async function startNewChat() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    window.speechSynthesis?.cancel();
    setSpeakingMessageKey(null);
    setNotice('');
    setIsLoadingMessages(true);
    try {
      const data = await chatbotRequest('/conversations', { method: 'POST' });
      const conversation = data.conversation;
      setConversations((current) => [conversation, ...current]);
      setConversationId(conversation.id);
      setMessages([]);
      setInput('');
      setSelectedImage(null);
      setNotice('');
    } catch (error) {
      console.error('Start chatbot conversation error:', error.message);
      setNotice('Unable to start a new chat.');
      if (error.status === 401) navigate('/login', { replace: true });
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function clearChatHistory() {
    if (!conversations.length) return;
    const confirmed = window.confirm(t('Clear all saved chat history? This cannot be undone.'));
    if (!confirmed) return;

    setNotice('');
    setIsLoadingMessages(true);
    try {
      await chatbotRequest('/conversations', { method: 'DELETE' });
      const data = await chatbotRequest('/conversations', { method: 'POST' });
      const conversation = data.conversation;
      setConversations([conversation]);
      setConversationId(conversation.id);
      setMessages([]);
      setInput('');
      setSelectedImage(null);
    } catch (error) {
      console.error('Clear chatbot history error:', error.message);
      setNotice('Unable to clear your chat history.');
      if (error.status === 401) navigate('/login', { replace: true });
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function openConversation(conversation) {
    if (conversation.id === conversationId || isLoadingMessages || isSending) return;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    window.speechSynthesis?.cancel();
    setSpeakingMessageKey(null);
    setNotice('');
    setIsLoadingMessages(true);
    setConversationId(conversation.id);
    setMessages([]);
    setInput('');
    setSelectedImage(null);
    try {
      const data = await chatbotRequest(`/conversations/${conversation.id}/messages`);
      setMessages((data.messages || []).map(mapStoredMessage));
    } catch (error) {
      console.error('Load chatbot conversation error:', error.message);
      setNotice('Unable to load this conversation.');
      if (error.status === 401) navigate('/login', { replace: true });
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function sendMessage(text = input) {
    const trimmedText = text.trim();
    if ((!trimmedText && !selectedImage) || isSending || isLoadingMessages || !conversationId) return;

    setNotice('');
    setIsSending(true);
    let optimisticId = '';

    try {
      const image = selectedImage
        ? { mimeType: selectedImage.file.type, data: await readImageAsBase64(selectedImage.file) }
        : null;
      const messageImageData = image ? `data:${image.mimeType};base64,${image.data}` : '';
      optimisticId = `pending-${Date.now()}`;
      setMessages((current) => [...current, {
        id: optimisticId,
        sender: 'user',
        text: trimmedText,
        hasImage: Boolean(image),
        imageData: messageImageData,
      }]);
      const data = await chatbotRequest(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: trimmedText, language, ...(image ? { image } : {}) }),
      });
      setMessages((current) => [...current, { sender: 'assistant', text: data.reply }]);
      setInput('');
      setSelectedImage(null);
      setConversations((current) => current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, title: data.title || conversation.title, updated_at: new Date().toISOString() }
          : conversation
      ).sort((first, second) => new Date(second.updated_at) - new Date(first.updated_at)));
    } catch (error) {
      if (optimisticId) {
        setMessages((current) => current.filter((item) => item.id !== optimisticId));
      }
      console.error('Send chatbot message error:', error.message);
      setNotice('Could not reach the chatbot service. Please try again.');
      if (error.status === 401) navigate('/login', { replace: true });
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage();
  }

  function handleImageSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size === 0) {
      setNotice('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > maxImageBytes) {
      setNotice('Images must be smaller than 5 MB.');
      return;
    }
    setNotice('');
    setSelectedImage({ file, previewUrl: URL.createObjectURL(file) });
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice('Voice input is not supported by this browser. You can type your message instead.');
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = speechLocales[language] || navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setInput((current) => `${current}${current ? ' ' : ''}${transcript}`.slice(0, 500));
      }
    };
    recognition.onerror = () => {
      setNotice('Voice input could not be captured. Please try again or type your message.');
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    setNotice('');
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setNotice('Voice input could not be started. Please try again or type your message.');
    }
  }

  function speakReply(text, key) {
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance === 'undefined') {
      setNotice('Spoken replies are not supported by this browser.');
      return;
    }
    if (speakingMessageKey === key) {
      window.speechSynthesis.cancel();
      setSpeakingMessageKey(null);
      return;
    }
    window.speechSynthesis.cancel();
    setSpeakingMessageKey(key);
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = speechLocales[language] || navigator.language || 'en-US';
    utterance.onend = () => setSpeakingMessageKey(null);
    utterance.onerror = (event) => {
      setSpeakingMessageKey(null);
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        setNotice('Could not read the reply aloud. Please try again.');
      }
    };
    window.speechSynthesis.speak(utterance);
  }

  const visibleMessages = messages.length ? messages : [welcomeMessage];

  return (
    <main className="chatbot-page">
      <header className="chatbot-header">
        <a className="chatbot-brand" href="/" aria-label={t('Go to home page')}>
          <span className="chatbot-brand-icon"><BrandMark size={20} /></span>
          <span>GramHealthCareAI</span>
        </a>
        <div className="theme-header-actions">
          <ThemeToggle />
          <a className="chatbot-back-link" href="/dashboard">{t('Dashboard')}</a>
        </div>
      </header>

      <section className="chatbot-layout" aria-labelledby="chatbot-title">
        <div className="chatbot-heading">
          <p className="chatbot-eyebrow">{t('YOUR HEALTH ASSISTANT')}</p>
          <h1 id="chatbot-title">{t('Health Chatbot')}</h1>
          <p>{t('Ask any health-related question or get help with the health features in this app.')}</p>
        </div>

        <div className="chatbot-workspace">
          <aside className="chatbot-sidebar" aria-label={t('Chat history')}>
            <div className="chatbot-sidebar-actions">
              <button
                className="chatbot-new-chat"
                type="button"
                onClick={startNewChat}
                disabled={isLoading || isLoadingMessages || isSending}
              >
                <MessageSquarePlus size={18} aria-hidden="true" />
                {t('New chat')}
              </button>
              <button
                className="chatbot-clear-history"
                type="button"
                onClick={clearChatHistory}
                disabled={isLoading || isLoadingMessages || isSending || !conversations.length}
              >
                <Trash2 size={16} aria-hidden="true" />
                {t('Clear history')}
              </button>
            </div>
            <h2>{t('Recent chats')}</h2>
            <nav className="chatbot-conversation-list" aria-label={t('Previous conversations')}>
              {conversations.map((conversation) => (
                <button
                  className={`chatbot-conversation${conversation.id === conversationId ? ' active' : ''}`}
                  type="button"
                  key={conversation.id}
                  onClick={() => openConversation(conversation)}
                  disabled={isLoading || isLoadingMessages || isSending}
                  aria-current={conversation.id === conversationId ? 'page' : undefined}
                >
                  <span>{conversation.title}</span>
                  <small>
                    {conversation.updated_at
                      ? new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(conversation.updated_at))
                      : ''}
                  </small>
                </button>
              ))}
              {!isLoading && !conversations.length && (
                <p className="chatbot-empty-history">{t('Your conversations will appear here.')}</p>
              )}
            </nav>
          </aside>

          <div className="chatbot-panel">
            <div className="chatbot-status">
              <span className="chatbot-status-dot" aria-hidden="true" />
              {t('AI health assistant')}
            </div>

            <div className="chatbot-messages" aria-live="polite" aria-busy={isLoading || isLoadingMessages}>
              {isLoading || isLoadingMessages
                ? <p className="chatbot-loading">{t('Loading conversation…')}</p>
                : visibleMessages.map((message, index) => (
                  <div
                    className={`chatbot-message ${message.sender}`}
                    key={message.id || `${message.sender}-${index}`}
                  >
                    <span className="chatbot-avatar" aria-hidden="true">
                      {message.sender === 'assistant' ? <BrandMark size={18} /> : t('You')}
                    </span>
                    <div className="chatbot-bubble">
                      {message.hasImage && (
                        message.imageData
                          ? <img className="chatbot-message-image" src={message.imageData} alt={t('Image attached')} />
                          : <span className="chatbot-image-history"><ImagePlus size={15} aria-hidden="true" />{t('Image attached')}</span>
                      )}
                      {message.text && <p>{message.text}</p>}
                      {message.sender === 'assistant' && (
                        <button
                          className={`chatbot-speak${speakingMessageKey === (message.id || `${message.sender}-${index}`) ? ' active' : ''}`}
                          type="button"
                          onClick={() => speakReply(message.text, message.id || `${message.sender}-${index}`)}
                          aria-label={t(speakingMessageKey === (message.id || `${message.sender}-${index}`) ? 'Stop speaking' : 'Read reply aloud')}
                          title={t(speakingMessageKey === (message.id || `${message.sender}-${index}`) ? 'Stop speaking' : 'Read reply aloud')}
                        >
                          <Volume2 size={16} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              <div ref={messagesEndRef} />
            </div>

            {notice && <p className="chatbot-notice" role="alert">{t(notice)}</p>}

            {selectedImage && (
              <div className="chatbot-image-preview">
                <img src={imagePreview} alt={t('Selected image preview')} />
                <span>{selectedImage.file.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  aria-label={t('Remove selected image')}
                  title={t('Remove selected image')}
                  disabled={isSending}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            )}

            <form className="chatbot-form" onSubmit={handleSubmit}>
              <input
                ref={imageInputRef}
                className="chatbot-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelected}
                aria-label={t('Attach an image')}
              />
              <button
                className="chatbot-tool-button"
                type="button"
                onClick={() => imageInputRef.current?.click()}
                aria-label={t('Attach an image')}
                title={t('Attach an image')}
                disabled={isLoading || isLoadingMessages || isSending || !conversationId}
              >
                <ImagePlus size={20} aria-hidden="true" />
              </button>
              <label className="sr-only" htmlFor="chatbot-input">
                {t('Type your message')}
              </label>
              <input
                id="chatbot-input"
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t('Ask any health question…')}
                maxLength={500}
                disabled={isLoading || isLoadingMessages || isSending || !conversationId}
              />
              <button
                className={`chatbot-tool-button${isListening ? ' listening' : ''}`}
                type="button"
                onClick={startVoiceInput}
                aria-label={isListening ? t('Stop voice input') : t('Speak your message')}
                title={isListening ? t('Stop voice input') : t('Speak your message')}
                disabled={isLoading || isLoadingMessages || isSending || !conversationId}
              >
                <Mic size={20} aria-hidden="true" />
              </button>
              <button type="submit" disabled={(!input.trim() && !selectedImage) || isSending || isLoadingMessages || !conversationId}>
                {isSending ? t('Sending…') : t('Send')}
              </button>
            </form>

            <p className="chatbot-disclaimer">
              {t('AI responses are for general information only. The assistant cannot diagnose, assess emergencies, or recommend treatment or medication. Do not enter private medical or personal information.')}
              {' '}{t('Messages are sent to an AI service and saved to your account so you can return to this conversation.')}
              {' '}{t('Voice dictation uses your browser speech service. Audio is not saved by this app.')}
              {' '}{t('Attached images are sent to the AI service for analysis but are not saved in chat history. Image-based replies are general information, not a diagnosis.')}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default HealthChatbot;
