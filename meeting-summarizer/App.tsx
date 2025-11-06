import React, { useState, useRef, useCallback } from 'react';
import { RecordingControls } from './components/RecordingControls';
import { VideoPreview } from './components/VideoPreview';
import { ResultsDisplay } from './components/ResultsDisplay';
import { StatusIndicator } from './components/StatusIndicator';
import { Header } from './components/Header';
import { transcribeAudio, summarizeText } from './services/geminiService';
import { AppStatus, RecordingType, AudioSource, VideoSource } from './types';

export default function App() {
  const [appStatus, setAppStatus] = useState<AppStatus>('idle');
  const [recordingType, setRecordingType] = useState<RecordingType>('audio');
  const [audioSource, setAudioSource] = useState<AudioSource>('microphone');
  const [videoSource, setVideoSource] = useState<VideoSource>('camera');
  const [subject, setSubject] = useState<string>('');

  const [transcript, setTranscript] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // For audio loopback
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioSourceNodeRef.current) {
      audioSourceNodeRef.current.disconnect();
      audioSourceNodeRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setTranscript('');
    setSummary('');
    setAppStatus('permission');

    const currentSource = recordingType === 'audio' ? audioSource : videoSource;
    const isVideo = recordingType === 'video';

    try {
      let stream: MediaStream;
      let streamToRecord: MediaStream;

      if (currentSource === 'microphone') {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamToRecord = stream;
      } else if (currentSource === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        streamToRecord = stream;
      } else { // 'system' or 'tab'
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        const audioTracks = displayStream.getAudioTracks();
        if (audioTracks.length === 0) {
            displayStream.getTracks().forEach(track => track.stop());
            setErrorMessage("未分享音訊。請務必在瀏覽器提示中勾選分享音訊的選項。");
            setAppStatus('error');
            return;
        }

        // Create audio loopback to hear what's being recorded
        // Fix for TypeScript error on line 81: Property 'webkitAudioContext' does not exist on type 'Window & typeof globalThis'.
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const sourceNode = audioCtx.createMediaStreamSource(new MediaStream(audioTracks));
        sourceNode.connect(audioCtx.destination);
        audioContextRef.current = audioCtx;
        audioSourceNodeRef.current = sourceNode;
        
        if (currentSource === 'system') {
          streamToRecord = new MediaStream(audioTracks);
        } else { // 'tab'
          streamToRecord = displayStream;
        }
        stream = displayStream;
      }

      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.log('Stream ended by user action.');
          stopRecording();
        };
      });
      
      mediaStreamRef.current = stream;
      setAppStatus('recording');

      let options = {};
      if (isVideo) {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          options = { mimeType: 'video/webm;codecs=vp8,opus' };
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          options = { mimeType: 'video/webm' };
        }
      } else {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
           options = { mimeType: 'audio/webm;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
           options = { mimeType: 'audio/webm' };
        }
      }

      const recorder = new MediaRecorder(streamToRecord, options);
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setAppStatus('processing');
        const blobType = isVideo ? 'video/webm' : 'audio/webm';
        const recordedBlob = new Blob(recordedChunksRef.current, { type: blobType });
        recordedChunksRef.current = [];

        try {
          const generatedTranscript = await transcribeAudio(recordedBlob);
          setTranscript(generatedTranscript);
          
          if (generatedTranscript.trim()) {
            const generatedSummary = await summarizeText(generatedTranscript, subject);
            setSummary(generatedSummary);
          } else {
             setSummary("逐字稿為空，無法生成摘要。");
          }
          
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
        if (currentSource === 'tab' || currentSource === 'system') {
          userMessage = "無法開始錄製。您可能已取消或拒絕權限請求。";
        }
      }
      
      setErrorMessage(userMessage);
      setAppStatus('error');
    }
  }, [recordingType, audioSource, videoSource, stopRecording, subject]);

  const handleTypeChange = (type: RecordingType) => {
    if (appStatus === 'recording') return;
    setRecordingType(type);
  }

  const currentSource = recordingType === 'audio' ? audioSource : videoSource;

  return (
    <div className="min-h-screen bg-[#FFFBF7] text-[#5C5470] font-sans flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/2 flex flex-col gap-6">
          <RecordingControls
            status={appStatus}
            type={recordingType}
            audioSource={audioSource}
            videoSource={videoSource}
            subject={subject}
            onSubjectChange={setSubject}
            onTypeChange={handleTypeChange}
            onAudioSourceChange={setAudioSource}
            onVideoSourceChange={setVideoSource}
            onStart={startRecording}
            onStop={stopRecording}
          />
          <StatusIndicator status={appStatus} error={errorMessage} />
          <VideoPreview stream={mediaStreamRef.current} type={recordingType} source={currentSource} />
        </div>
        <div className="lg:w-1/2 flex flex-col">
            <ResultsDisplay 
                transcript={transcript} 
                summary={summary}
                isLoading={appStatus === 'processing'}
            />
        </div>
      </main>
    </div>
  );
}