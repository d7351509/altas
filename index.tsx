
import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';

// From types.ts
type AppStatus = 'idle' | 'permission' | 'recording' | 'processing' | 'complete' | 'error';
type RecordingType = 'audio' | 'video';
type AudioSource = 'microphone' | 'system';
type VideoSource = 'camera' | 'tab';

// From services/geminiService.ts
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

function blobToBase64(blob: globalThis.Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error("Failed to read blob as a data URL."));
      }
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
}

async function transcribeAudio(audioBlob: globalThis.Blob): Promise<string> {
  try {
    const base64Audio = await blobToBase64(audioBlob);
    const audioPart = {
      inlineData: {
        mimeType: audioBlob.type,
        data: base64Audio,
      },
    };
    const textPart = {
      text: "請將此音訊轉錄為逐字稿文字。",
    };
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: [audioPart, textPart] },
    });
    return response.text;
  } catch (error) {
    console.error("Transcription failed:", error);
    throw new Error('轉錄過程中發生錯誤。');
  }
}

async function summarizeText(transcript: string, subject: string, notes: string): Promise<string> {
    if (!transcript || transcript.trim().length === 0) {
        return "逐字稿為空，沒有可用的摘要。";
    }
    try {
        const today = new Date().toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const prompt = `
會議主旨：${subject || '未提供'}
會議日期：${today}
${notes.trim() ? `---
額外筆記：
${notes}
---` : ''}

請從以下會議逐字稿中總結重點、決策和待辦事項。為每個部分使用清晰的標題（例如，“重點摘要”、“達成的決策”、“待辦事項”）。
**重要：** 在生成摘要時，請務必參考並整合上述的“額外筆記”內容，確保筆記中的要點被反映在最終的摘要中。

逐字稿：
${transcript}
`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        
        const finalSummary = `**會議主旨：** ${subject || '未提供'}\n**會議日期：** ${today}\n\n${response.text}`;
        return finalSummary;

    } catch (error) {
        console.error("Summarization failed:", error);
        return "因 API 錯誤而無法生成摘要。";
    }
}

// From components/IconComponents.tsx
const MicIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" x2="12" y1="19" y2="22"></line>
  </svg>
);
const VideoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m22 8-6 4 6 4V8Z"></path>
    <rect width="14" height="12" x="2" y="6" rx="2" ry="2"></rect>
  </svg>
);
const ScreenIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3"></path>
    <path d="M21 14h-4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1Z"></path>
    <path d="M8 21h8"></path><path d="M12 17v4"></path>
  </svg>
);
const SpeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  </svg>
);
const StopIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
     <rect width="18" height="18" x="3" y="3" rx="2" ry="2" fill="currentColor"></rect>
  </svg>
);
const CopyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
    </svg>
);
const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" x2="12" y1="15" y2="3"></line>
    </svg>
);

// From components/Header.tsx
const Header: React.FC = () => {
  return (
    <header className="bg-[#FFFCF9]/80 backdrop-blur-sm border-b border-[#F7E9DE] shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        <div className="bg-[#FFC8DD] p-2 rounded-lg shadow">
           <MicIcon className="w-6 h-6 text-white"/>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#352F44] sm:text-3xl">
          會議小記
        </h1>
      </div>
    </header>
  );
};

// From components/RecordingControls.tsx
interface RecordingControlsProps {
  status: AppStatus;
  type: RecordingType;
  audioSource: AudioSource;
  videoSource: VideoSource;
  subject: string;
  notes: string;
  onSubjectChange: (subject: string) => void;
  onNotesChange: (notes: string) => void;
  onTypeChange: (type: RecordingType) => void;
  onAudioSourceChange: (source: AudioSource) => void;
  onVideoSourceChange: (source: VideoSource) => void;
  onStart: () => void;
  onStop: () => void;
}

const ControlButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
  disabled: boolean;
  children: React.ReactNode;
}> = ({ onClick, isActive, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border ${
      isActive ? 'bg-[#FFC8DD] text-[#9A348E] border-[#FFAFCC]' : 'bg-white hover:bg-[#F7E9DE]/60 text-[#6D6381] border-transparent'
    } disabled:opacity-60 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
);

const RecordingControls: React.FC<RecordingControlsProps> = ({
  status, type, audioSource, videoSource, subject, notes, onSubjectChange, onNotesChange, onTypeChange, onAudioSourceChange, onVideoSourceChange, onStart, onStop,
}) => {
  const isRecording = status === 'recording';
  const isLoading = status === 'permission' || status === 'processing';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg shadow-[#F7E9DE] space-y-6">
      <div>
        <label htmlFor="subject" className="text-sm font-medium text-gray-500 mb-2 block">會議主旨 (錄製中可編輯)</label>
        <input type="text" id="subject" value={subject} onChange={(e) => onSubjectChange(e.target.value)} placeholder="請輸入會議主旨..." disabled={isLoading} className="w-full px-4 py-2 bg-[#FDF8F4] border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC8DD] transition placeholder:text-gray-400" />
      </div>
      <div>
        <label htmlFor="notes" className="text-sm font-medium text-gray-500 mb-2 block">會議筆記 (錄製中可編輯)</label>
        <textarea id="notes" value={notes} onChange={(e) => onNotesChange(e.target.value)} placeholder="您可以在此處記錄會議期間的重點、問題或想法..." disabled={isLoading} rows={4} className="w-full px-4 py-2 bg-[#FDF8F4] border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC8DD] transition placeholder:text-gray-400 resize-y" />
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-grow flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="sm:flex-1">
            <p className="text-sm font-medium text-gray-500 mb-2">錄製類型</p>
            <div className="flex items-center gap-2 p-1 bg-[#FDF8F4] rounded-xl">
              <ControlButton onClick={() => onTypeChange('audio')} isActive={type === 'audio'} disabled={isRecording || isLoading}>
                <MicIcon className="w-4 h-4" /> 錄音
              </ControlButton>
              <ControlButton onClick={() => onTypeChange('video')} isActive={type === 'video'} disabled={isRecording || isLoading}>
                <VideoIcon className="w-4 h-4" /> 錄影
              </ControlButton>
            </div>
          </div>
          <div className="sm:flex-1">
            <p className="text-sm font-medium text-gray-500 mb-2">來源</p>
            <div className="flex items-center gap-2 p-1 bg-[#FDF8F4] rounded-xl">
              {type === 'audio' ? (
                <>
                  <ControlButton onClick={() => onAudioSourceChange('microphone')} isActive={audioSource === 'microphone'} disabled={isRecording || isLoading}>
                    <MicIcon className="w-4 h-4" /> 麥克風
                  </ControlButton>
                  <ControlButton onClick={() => onAudioSourceChange('system')} isActive={audioSource === 'system'} disabled={isRecording || isLoading}>
                    <SpeakerIcon className="w-4 h-4" /> 系統音訊
                  </ControlButton>
                </>
              ) : (
                <>
                  <ControlButton onClick={() => onVideoSourceChange('camera')} isActive={videoSource === 'camera'} disabled={isRecording || isLoading}>
                    <VideoIcon className="w-4 h-4" /> 攝影機
                  </ControlButton>
                  <ControlButton onClick={() => onVideoSourceChange('tab')} isActive={videoSource === 'tab'} disabled={isRecording || isLoading}>
                    <ScreenIcon className="w-4 h-4" /> 分頁
                  </ControlButton>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="w-full md:w-auto flex-shrink-0">
          {isRecording ? (
            <button onClick={onStop} className="w-full sm:w-auto bg-[#FFAFCC] hover:bg-[#FFC8DD] text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-transform transform hover:scale-105 shadow-md shadow-[#F7E9DE]">
              <StopIcon className="w-5 h-5" /> 停止錄製
            </button>
          ) : (
            <button onClick={onStart} disabled={isLoading} className="w-full sm:w-auto bg-[#A2D2FF] hover:bg-[#BDE0FE] text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-transform transform hover:scale-105 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md shadow-[#D3E5F5]">
              <MicIcon className="w-5 h-5" /> 開始錄製
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// From components/VideoPreview.tsx
interface VideoPreviewProps {
  stream: MediaStream | null;
  type: RecordingType;
  source: AudioSource | VideoSource;
}
const VideoPreview: React.FC<VideoPreviewProps> = ({ stream, type, source }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const showVideo = type === 'video' && stream;
  const getPlaceholder = () => {
    switch (source) {
      case 'camera': return (<><VideoIcon className="w-16 h-16 mx-auto mb-4 text-[#BDB2C9]" /><h3 className="text-lg font-semibold text-[#5C5470]">攝影機預覽</h3><p className="text-[#988DAA]">開始錄製後，您的攝影機畫面將會顯示在此。</p></>);
      case 'tab': return (<><ScreenIcon className="w-16 h-16 mx-auto mb-4 text-[#BDB2C9]" /><h3 className="text-lg font-semibold text-[#5C5470]">分頁預覽</h3><p className="text-[#988DAA]">開始錄製後，您選擇的分頁畫面將會顯示在此。</p></>);
      case 'system': return (<><SpeakerIcon className="w-16 h-16 mx-auto mb-4 text-[#BDB2C9]" /><h3 className="text-lg font-semibold text-[#5C5470]">系統音訊模式</h3><p className="text-[#988DAA]">將會錄製您電腦播放的任何音訊。</p></>);
      case 'microphone': default: return (<><MicIcon className="w-16 h-16 mx-auto mb-4 text-[#BDB2C9]" /><h3 className="text-lg font-semibold text-[#5C5470]">麥克風模式</h3><p className="text-[#988DAA]">僅會錄製您的麥克風音訊。</p></>);
    }
  };
  return (
    <div className="bg-white rounded-2xl aspect-video flex items-center justify-center p-4 border-2 border-dashed border-[#F7E9DE] relative overflow-hidden shadow-inner-lg shadow-[#FDF8F4]">
      {showVideo ? (
        <video ref={videoRef} autoPlay muted className={`w-full h-full object-cover rounded-lg ${source === 'camera' ? 'transform scale-x-[-1]' : ''}`}></video>
      ) : (
        <div className="text-center">{getPlaceholder()}</div>
      )}
    </div>
  );
};

// From components/ResultsDisplay.tsx
interface ResultsDisplayProps {
  transcript: string;
  summary: string;
  isLoading: boolean;
}
type Tab = 'summary' | 'transcript';
const LoadingSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-2"><div className="h-4 bg-gray-200 rounded w-full"></div><div className="h-4 bg-gray-200 rounded w-5/6"></div><div className="h-4 bg-gray-200 rounded w-full"></div></div>
        <div className="h-6 bg-gray-200 rounded w-1/3 mt-6"></div>
         <div className="space-y-2"><div className="h-4 bg-gray-200 rounded w-full"></div><div className="h-4 bg-gray-200 rounded w-3/4"></div></div>
    </div>
);
const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; 'aria-label': string }> = ({ onClick, children, ...props }) => (
    <button onClick={onClick} className="p-1.5 text-gray-400 hover:text-[#9A348E] hover:bg-[#FFC8DD]/30 rounded-full transition-colors duration-200" {...props}>
        {children}
    </button>
);
const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ transcript, summary, isLoading }) => {
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [copiedTab, setCopiedTab] = useState<Tab | null>(null);
  const handleCopy = (content: string, tab: Tab) => {
      if (!navigator.clipboard) { alert("您的瀏覽器不支援複製功能。"); return; }
      navigator.clipboard.writeText(content).then(() => {
          setCopiedTab(tab);
          setTimeout(() => setCopiedTab(null), 2000);
      }).catch(err => { console.error("無法複製文字: ", err); alert("複製失敗。"); });
  };
  const handleDownload = (content: string, tab: Tab) => {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tab}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };
  const renderContent = () => {
    if (isLoading) { return <LoadingSkeleton />; }
    const content = activeTab === 'summary' ? summary : transcript;
    if (!content) { return <p className="text-gray-400">{activeTab === 'summary' ? '處理完成後，摘要將會顯示在此。' : '處理完成後，完整的逐字稿將會顯示在此。'}</p>; }
    if (activeTab === 'summary') {
      return (
        <div className="prose prose-sm max-w-none prose-p:text-[#5C5470] prose-li:text-[#5C5470] prose-headings:text-[#9A348E] whitespace-pre-wrap">
          {content.split('\n').map((line, index) => {
             if (line.match(/^(重點摘要|達成的決策|待辦事項)[:：]/)) { return <h2 key={index} className="font-bold text-xl mt-4 mb-2">{line}</h2> }
            if (line.startsWith('**') && line.endsWith('**')) { return <p key={index} className="font-semibold text-base">{line.replaceAll('**', '')}</p> }
            if (line.startsWith('* ')) { return <li key={index} className="ml-4 list-disc">{line.substring(2)}</li> }
            return <p key={index}>{line}</p>;
          })}
        </div>
      );
    }
    return <p className="whitespace-pre-wrap text-[#5C5470]">{content}</p>;
  };
  const currentContent = activeTab === 'summary' ? summary : transcript;
  const canPerformActions = !isLoading && currentContent.length > 0;
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg shadow-[#F7E9DE] flex-grow flex flex-col min-h-[300px]">
        <div className="flex justify-between items-center border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button onClick={() => setActiveTab('summary')} className={`${activeTab === 'summary' ? 'border-[#FFC8DD] text-[#9A348E]' : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}>摘要</button>
                <button onClick={() => setActiveTab('transcript')} className={`${activeTab === 'transcript' ? 'border-[#FFC8DD] text-[#9A348E]' : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}>逐字稿</button>
            </nav>
            {canPerformActions && (
                <div className="flex items-center gap-2">
                    <ActionButton onClick={() => handleCopy(currentContent, activeTab)} aria-label="複製內容"><span className="relative w-5 h-5"><CopyIcon className={`w-5 h-5 transition-opacity duration-300 ${copiedTab === activeTab ? 'opacity-0' : 'opacity-100'}`} /><span className={`absolute top-0 left-0 text-xs text-[#9A348E] font-semibold transition-opacity duration-300 ${copiedTab === activeTab ? 'opacity-100' : 'opacity-0'}`}>✓</span></span></ActionButton>
                    <ActionButton onClick={() => handleDownload(currentContent, activeTab)} aria-label="下載內容"><DownloadIcon className="w-5 h-5" /></ActionButton>
                </div>
            )}
        </div>
      <div className="flex-grow overflow-y-auto pr-2">{renderContent()}</div>
    </div>
  );
};

// From components/StatusIndicator.tsx
interface StatusIndicatorProps {
  status: AppStatus;
  error: string | null;
}
const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, error }) => {
  const getStatusMessage = () => {
    switch (status) {
      case 'idle': return '準備錄製。請選擇模式並按下「開始」。';
      case 'permission': return '正在請求權限，請在瀏覽器提示中允許...';
      case 'recording': return (<div className="flex items-center justify-center gap-2"><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff8fab] opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff7499]"></span></span><span>錄製中...</span></div>);
      case 'processing': return (<div className="flex items-center justify-center gap-2"><svg className="animate-spin h-5 w-5 text-[#FFC8DD]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>正在處理錄音，請稍候...</span></div>);
      case 'complete': return '處理完成！請查看摘要與逐字稿。';
      case 'error': return error || '發生未知錯誤。';
      default: return '';
    }
  };
  const getStatusColor = () => {
    switch (status) {
        case 'recording': return 'text-[#e55375] bg-[#ffe4e9] border-[#ffc5d1]';
        case 'error': return 'text-red-700 bg-red-100 border-red-300';
        case 'complete': return 'text-green-700 bg-green-100 border-green-300';
        default: return 'text-gray-600 bg-white border-gray-200';
    }
  }
  return (<div className={`p-4 rounded-xl text-center text-sm font-medium border ${getStatusColor()}`}>{getStatusMessage()}</div>);
};


// From App.tsx
function App() {
  const [appStatus, setAppStatus] = useState<AppStatus>('idle');
  const [recordingType, setRecordingType] = useState<RecordingType>('audio');
  const [audioSource, setAudioSource] = useState<AudioSource>('microphone');
  const [videoSource, setVideoSource] = useState<VideoSource>('camera');
  const [subject, setSubject] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') { mediaRecorderRef.current.stop(); }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(track => track.stop()); mediaStreamRef.current = null; }
    if (audioSourceNodeRef.current) { audioSourceNodeRef.current.disconnect(); audioSourceNodeRef.current = null; }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') { audioContextRef.current.close(); audioContextRef.current = null; }
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMessage(null); setTranscript(''); setSummary(''); setAppStatus('permission');
    const currentSource = recordingType === 'audio' ? audioSource : videoSource;
    const isVideo = recordingType === 'video';
    try {
      let stream: MediaStream; let streamToRecord: MediaStream;
      if (currentSource === 'microphone') { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); streamToRecord = stream; }
      else if (currentSource === 'camera') { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }); streamToRecord = stream; }
      else {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const audioTracks = displayStream.getAudioTracks();
        if (audioTracks.length === 0) {
            displayStream.getTracks().forEach(track => track.stop());
            setErrorMessage("未分享音訊。請務必在瀏覽器提示中勾選分享音訊的選項。");
            setAppStatus('error'); return;
        }
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const sourceNode = audioCtx.createMediaStreamSource(new MediaStream(audioTracks));
        sourceNode.connect(audioCtx.destination);
        audioContextRef.current = audioCtx; audioSourceNodeRef.current = sourceNode;
        if (currentSource === 'system') { streamToRecord = new MediaStream(audioTracks); } else { streamToRecord = displayStream; }
        stream = displayStream;
      }
      stream.getTracks().forEach(track => { track.onended = () => { console.log('Stream ended by user action.'); stopRecording(); }; });
      mediaStreamRef.current = stream;
      setAppStatus('recording');
      let options = {};
      if (isVideo) {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) { options = { mimeType: 'video/webm;codecs=vp8,opus' }; }
        else if (MediaRecorder.isTypeSupported('video/webm')) { options = { mimeType: 'video/webm' }; }
      } else {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) { options = { mimeType: 'audio/webm;codecs=opus' }; }
        else if (MediaRecorder.isTypeSupported('audio/webm')) { options = { mimeType: 'audio/webm' }; }
      }
      const recorder = new MediaRecorder(streamToRecord, options);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) { recordedChunksRef.current.push(event.data); } };
      recorder.onstop = async () => {
        setAppStatus('processing');
        const blobType = isVideo ? 'video/webm' : 'audio/webm';
        const recordedBlob = new Blob(recordedChunksRef.current, { type: blobType });
        recordedChunksRef.current = [];
        try {
          const generatedTranscript = await transcribeAudio(recordedBlob);
          setTranscript(generatedTranscript);
          if (generatedTranscript.trim()) {
            const generatedSummary = await summarizeText(generatedTranscript, subject, notes);
            setSummary(generatedSummary);
          } else { setSummary("逐字稿為空，無法生成摘要。"); }
          setAppStatus('complete');
        } catch (error) {
          console.error("Error during processing:", error);
          setErrorMessage("處理錄製失敗。請再試一次。");
          setAppStatus('error');
        }
      };
      recordedChunksRef.current = [];
      recorder.start();
    } catch (error) {
      console.error("Error starting recording:", error);
      const currentSource = recordingType === 'audio' ? audioSource : videoSource;
      let userMessage = "無法存取麥克風/攝影機。請檢查權限。";
      if ((error as Error).name === 'NotAllowedError' || (error as Error).name === 'NotFoundError') {
        if (currentSource === 'tab' || currentSource === 'system') { userMessage = "無法開始錄製。您可能已取消或拒絕權限請求。"; }
      }
      setErrorMessage(userMessage);
      setAppStatus('error');
    }
  }, [recordingType, audioSource, videoSource, stopRecording, subject, notes]);

  const handleTypeChange = (type: RecordingType) => { if (appStatus === 'recording') return; setRecordingType(type); }
  const currentSource = recordingType === 'audio' ? audioSource : videoSource;

  return (
    <div className="min-h-screen bg-[#FFFBF7] text-[#5C5470] font-sans flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/2 flex flex-col gap-6">
          <RecordingControls status={appStatus} type={recordingType} audioSource={audioSource} videoSource={videoSource} subject={subject} notes={notes} onSubjectChange={setSubject} onNotesChange={setNotes} onTypeChange={handleTypeChange} onAudioSourceChange={setAudioSource} onVideoSourceChange={setVideoSource} onStart={startRecording} onStop={stopRecording} />
          <StatusIndicator status={appStatus} error={errorMessage} />
          <VideoPreview stream={mediaStreamRef.current} type={recordingType} source={currentSource} />
        </div>
        <div className="lg:w-1/2 flex flex-col">
            <ResultsDisplay transcript={transcript} summary={summary} isLoading={appStatus === 'processing'} />
        </div>
      </main>
    </div>
  );
}


// Original index.tsx content
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
