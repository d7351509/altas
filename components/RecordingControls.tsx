import React from 'react';
import { AppStatus, RecordingType, AudioSource, VideoSource } from '../types';
import { MicIcon, VideoIcon, StopIcon, ScreenIcon, SpeakerIcon } from './IconComponents';

interface RecordingControlsProps {
  status: AppStatus;
  type: RecordingType;
  audioSource: AudioSource;
  videoSource: VideoSource;
  subject: string;
  onSubjectChange: (subject: string) => void;
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


export const RecordingControls: React.FC<RecordingControlsProps> = ({
  status,
  type,
  audioSource,
  videoSource,
  subject,
  onSubjectChange,
  onTypeChange,
  onAudioSourceChange,
  onVideoSourceChange,
  onStart,
  onStop,
}) => {
  const isRecording = status === 'recording';
  const isLoading = status === 'permission' || status === 'processing';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg shadow-[#F7E9DE] space-y-6">
      <div>
        <label htmlFor="subject" className="text-sm font-medium text-gray-500 mb-2 block">會議主旨</label>
        <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="請輸入會議主旨..."
            disabled={isRecording || isLoading}
            className="w-full px-4 py-2 bg-[#FDF8F4] border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC8DD] transition placeholder:text-gray-400"
        />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-grow flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Type Selection */}
          <div className="sm:flex-1">
            <p className="text-sm font-medium text-gray-500 mb-2">錄製類型</p>
            <div className="flex items-center gap-2 p-1 bg-[#FDF8F4] rounded-xl">
              <ControlButton onClick={() => onTypeChange('audio')} isActive={type === 'audio'} disabled={isRecording || isLoading}>
                <MicIcon className="w-4 h-4" />
                錄音
              </ControlButton>
              <ControlButton onClick={() => onTypeChange('video')} isActive={type === 'video'} disabled={isRecording || isLoading}>
                <VideoIcon className="w-4 h-4" />
                錄影
              </ControlButton>
            </div>
          </div>

          {/* Source Selection */}
          <div className="sm:flex-1">
            <p className="text-sm font-medium text-gray-500 mb-2">來源</p>
            <div className="flex items-center gap-2 p-1 bg-[#FDF8F4] rounded-xl">
              {type === 'audio' ? (
                <>
                  <ControlButton onClick={() => onAudioSourceChange('microphone')} isActive={audioSource === 'microphone'} disabled={isRecording || isLoading}>
                    <MicIcon className="w-4 h-4" />
                    麥克風
                  </ControlButton>
                  <ControlButton onClick={() => onAudioSourceChange('system')} isActive={audioSource === 'system'} disabled={isRecording || isLoading}>
                    <SpeakerIcon className="w-4 h-4" />
                    系統音訊
                  </ControlButton>
                </>
              ) : (
                <>
                  <ControlButton onClick={() => onVideoSourceChange('camera')} isActive={videoSource === 'camera'} disabled={isRecording || isLoading}>
                    <VideoIcon className="w-4 h-4" />
                    攝影機
                  </ControlButton>
                  <ControlButton onClick={() => onVideoSourceChange('tab')} isActive={videoSource === 'tab'} disabled={isRecording || isLoading}>
                    <ScreenIcon className="w-4 h-4" />
                    分頁
                  </ControlButton>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Start/Stop Button */}
        <div className="w-full md:w-auto flex-shrink-0">
          {isRecording ? (
            <button
              onClick={onStop}
              className="w-full sm:w-auto bg-[#FFAFCC] hover:bg-[#FFC8DD] text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-transform transform hover:scale-105 shadow-md shadow-[#F7E9DE]"
            >
              <StopIcon className="w-5 h-5" />
              停止錄製
            </button>
          ) : (
            <button
              onClick={onStart}
              disabled={isLoading}
              className="w-full sm:w-auto bg-[#A2D2FF] hover:bg-[#BDE0FE] text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-transform transform hover:scale-105 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md shadow-[#D3E5F5]"
            >
              <MicIcon className="w-5 h-5" />
              開始錄製
            </button>
          )}
        </div>
      </div>
    </div>
  );
};