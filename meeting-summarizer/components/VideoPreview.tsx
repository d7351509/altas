import React, { useEffect, useRef } from 'react';
import { VideoIcon, MicIcon, ScreenIcon, SpeakerIcon } from './IconComponents';
import { RecordingType, AudioSource, VideoSource } from '../types';

interface VideoPreviewProps {
  stream: MediaStream | null;
  type: RecordingType;
  source: AudioSource | VideoSource;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ stream, type, source }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const showVideo = type === 'video' && stream;

  const getPlaceholder = () => {
    switch (source) {
      case 'camera':
        return (
          <>
            <VideoIcon className="w-16 h-16 mx-auto mb-4 text-[#BDB2C9]" />
            <h3 className="text-lg font-semibold text-[#5C5470]">攝影機預覽</h3>
            <p className="text-[#988DAA]">開始錄製後，您的攝影機畫面將會顯示在此。</p>
          </>
        );
      case 'tab':
        return (
          <>
            <ScreenIcon className="w-16 h-16 mx-auto mb-4 text-[#BDB2C9]" />
            <h3 className="text-lg font-semibold text-[#5C5470]">分頁預覽</h3>
            <p className="text-[#988DAA]">開始錄製後，您選擇的分頁畫面將會顯示在此。</p>
          </>
        );
      case 'system':
        return (
          <>
            <SpeakerIcon className="w-16 h-16 mx-auto mb-4 text-[#BDB2C9]" />
            <h3 className="text-lg font-semibold text-[#5C5470]">系統音訊模式</h3>
            <p className="text-[#988DAA]">將會錄製您電腦播放的任何音訊。</p>
          </>
        );
      case 'microphone':
      default:
        return (
          <>
            <MicIcon className="w-16 h-16 mx-auto mb-4 text-[#BDB2C9]" />
            <h3 className="text-lg font-semibold text-[#5C5470]">麥克風模式</h3>
            <p className="text-[#988DAA]">僅會錄製您的麥克風音訊。</p>
          </>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl aspect-video flex items-center justify-center p-4 border-2 border-dashed border-[#F7E9DE] relative overflow-hidden shadow-inner-lg shadow-[#FDF8F4]">
      {showVideo ? (
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          className={`w-full h-full object-cover rounded-lg ${source === 'camera' ? 'transform scale-x-[-1]' : ''}`}
        ></video>
      ) : (
        <div className="text-center">
          {getPlaceholder()}
        </div>
      )}
    </div>
  );
};