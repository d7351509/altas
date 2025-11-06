import React from 'react';
import { AppStatus } from '../types';

interface StatusIndicatorProps {
  status: AppStatus;
  error: string | null;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, error }) => {
  const getStatusMessage = () => {
    switch (status) {
      case 'idle':
        return '準備錄製。請選擇模式並按下「開始」。';
      case 'permission':
        return '正在請求權限，請在瀏覽器提示中允許...';
      case 'recording':
        return (
          <div className="flex items-center justify-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff8fab] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff7499]"></span>
            </span>
            <span>錄製中...</span>
          </div>
        );
      case 'processing':
        return (
          <div className="flex items-center justify-center gap-2">
             <svg className="animate-spin h-5 w-5 text-[#FFC8DD]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>正在處理錄音，請稍候...</span>
          </div>
        );
      case 'complete':
        return '處理完成！請查看摘要與逐字稿。';
      case 'error':
        return error || '發生未知錯誤。';
      default:
        return '';
    }
  };
  
  const getStatusColor = () => {
    switch (status) {
        case 'recording':
            return 'text-[#e55375] bg-[#ffe4e9] border-[#ffc5d1]';
        case 'error':
            return 'text-red-700 bg-red-100 border-red-300';
        case 'complete':
            return 'text-green-700 bg-green-100 border-green-300';
        default:
            return 'text-gray-600 bg-white border-gray-200';
    }
  }

  return (
    <div className={`p-4 rounded-xl text-center text-sm font-medium border ${getStatusColor()}`}>
      {getStatusMessage()}
    </div>
  );
};