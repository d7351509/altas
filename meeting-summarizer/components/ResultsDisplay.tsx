import React, { useState } from 'react';
import { CopyIcon, DownloadIcon } from './IconComponents';

interface ResultsDisplayProps {
  transcript: string;
  summary: string;
  isLoading: boolean;
}

type Tab = 'summary' | 'transcript';

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded w-1/3 mt-6"></div>
         <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
    </div>
);

const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; 'aria-label': string }> = ({ onClick, children, ...props }) => (
    <button
        onClick={onClick}
        className="p-1.5 text-gray-400 hover:text-[#9A348E] hover:bg-[#FFC8DD]/30 rounded-full transition-colors duration-200"
        {...props}
    >
        {children}
    </button>
);


export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ transcript, summary, isLoading }) => {
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [copiedTab, setCopiedTab] = useState<Tab | null>(null);

  const handleCopy = (content: string, tab: Tab) => {
      if (!navigator.clipboard) {
          alert("您的瀏覽器不支援複製功能。");
          return;
      }
      navigator.clipboard.writeText(content).then(() => {
          setCopiedTab(tab);
          setTimeout(() => setCopiedTab(null), 2000);
      }).catch(err => {
          console.error("無法複製文字: ", err);
          alert("複製失敗。");
      });
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
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    const content = activeTab === 'summary' ? summary : transcript;

    if (!content) {
         return <p className="text-gray-400">{activeTab === 'summary' ? '處理完成後，摘要將會顯示在此。' : '處理完成後，完整的逐字稿將會顯示在此。'}</p>;
    }

    if (activeTab === 'summary') {
      return (
        <div className="prose prose-sm max-w-none prose-p:text-[#5C5470] prose-li:text-[#5C5470] prose-headings:text-[#9A348E] whitespace-pre-wrap">
          {content.split('\n').map((line, index) => {
             if (line.match(/^(重點摘要|達成的決策|待辦事項)[:：]/)) {
                return <h2 key={index} className="font-bold text-xl mt-4 mb-2">{line}</h2>
            }
            if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={index} className="font-semibold text-base">{line.replaceAll('**', '')}</p>
            }
            if (line.startsWith('* ')) {
                return <li key={index} className="ml-4 list-disc">{line.substring(2)}</li>
            }
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
                <button
                onClick={() => setActiveTab('summary')}
                className={`${
                    activeTab === 'summary'
                    ? 'border-[#FFC8DD] text-[#9A348E]'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                摘要
                </button>
                <button
                onClick={() => setActiveTab('transcript')}
                className={`${
                    activeTab === 'transcript'
                    ? 'border-[#FFC8DD] text-[#9A348E]'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                逐字稿
                </button>
            </nav>
            {canPerformActions && (
                <div className="flex items-center gap-2">
                    <ActionButton onClick={() => handleCopy(currentContent, activeTab)} aria-label="複製內容">
                        <span className="relative w-5 h-5">
                            <CopyIcon className={`w-5 h-5 transition-opacity duration-300 ${copiedTab === activeTab ? 'opacity-0' : 'opacity-100'}`} />
                            <span className={`absolute top-0 left-0 text-xs text-[#9A348E] font-semibold transition-opacity duration-300 ${copiedTab === activeTab ? 'opacity-100' : 'opacity-0'}`}>
                                ✓
                            </span>
                        </span>
                    </ActionButton>
                    <ActionButton onClick={() => handleDownload(currentContent, activeTab)} aria-label="下載內容">
                        <DownloadIcon className="w-5 h-5" />
                    </ActionButton>
                </div>
            )}
        </div>
      <div className="flex-grow overflow-y-auto pr-2">
        {renderContent()}
      </div>
    </div>
  );
};