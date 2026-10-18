import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Play,
  Pause,
  Upload,
  Sparkles,
  Wand2,
  Volume2,
  VolumeX,
  RotateCcw,
  Download,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Film,
  Camera,
  Layers,
  Clock,
  Sliders,
  User,
  Mic,
  Square,
  CheckCircle2,
} from 'lucide-react';
import { VoiceProfile, VideoAlignmentResult } from '../types/tts';
import { extractAudioFromVideoBlob } from '../utils/audioExtractor';

interface VideoVoiceStudioProps {
  currentProfile: VoiceProfile;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  onAudioSynthesized?: (audioBase64: string, duration: number) => void;
  onSaveClonedProfile?: (profile: VoiceProfile) => void;
  onOpenVoiceForge?: () => void;
}

const SAMPLE_VIDEOS = [
  {
    id: 'sample-nature',
    title: 'Scenic Mountains (وادیِ کوہسار)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    desc: 'Cinematic landscape vista',
  },
  {
    id: 'sample-tech',
    title: 'Visual Journey (جدید سفر)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    desc: 'Dynamic pacing with camera motion',
  },
  {
    id: 'sample-wildlife',
    title: 'Wildlife Story (حیاتیات)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    desc: 'Nature and action narrative',
  },
];

export const VideoVoiceStudio: React.FC<VideoVoiceStudioProps> = ({
  currentProfile,
  selectedLanguage,
  onSelectLanguage,
  onAudioSynthesized,
  onSaveClonedProfile,
  onOpenVoiceForge,
}) => {
  const [videoUrl, setVideoUrl] = useState<string>(SAMPLE_VIDEOS[0].url);
  const [videoFileName, setVideoFileName] = useState<string>(SAMPLE_VIDEOS[0].title);
  const [videoDuration, setVideoDuration] = useState<number>(15);
  const [userScript, setUserScript] = useState<string>('');

  // Voice Alignment Mode: Align voice to user's speech in the video vs selected persona
  const [alignToUserVoice, setAlignToUserVoice] = useState<boolean>(true);
  const [userVideoAudioBase64, setUserVideoAudioBase64] = useState<string | null>(null);
  const [isExtractingAudio, setIsExtractingAudio] = useState<boolean>(false);
  const [detectedVoice, setDetectedVoice] = useState<VoiceProfile | null>(null);
  const [voiceSavedNotice, setVoiceSavedNotice] = useState<boolean>(false);

  // Subtitle Display: Option to hide appearing text on the screen (User request)
  const [showSubtitlesOnScreen, setShowSubtitlesOnScreen] = useState<boolean>(true);

  // Dual playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoVolume, setVideoVolume] = useState<number>(0.2); // keep background video low
  const [voiceVolume, setVoiceVolume] = useState<number>(1.0); // voice loud and clear
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);

  // Live Camera Recording Mode ("Speak anything into camera")
  const [isRecordingCamera, setIsRecordingCamera] = useState<boolean>(false);
  const [cameraSecs, setCameraSecs] = useState<number>(0);
  const cameraVideoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraChunksRef = useRef<Blob[]>([]);
  const cameraTimerRef = useRef<any>(null);

  // AI Alignment state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStage, setAnalysisStage] = useState<string>('');
  const [alignmentResult, setAlignmentResult] = useState<VideoAlignmentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up camera stream if component unmounts
  useEffect(() => {
    return () => {
      stopCameraRecording();
    };
  }, []);

  // When alignment result arrives, convert master aligned audio to Blob URL
  useEffect(() => {
    if (!alignmentResult?.masterAlignedAudioBase64) {
      setVoiceAudioUrl(null);
      return;
    }

    try {
      const binary = atob(alignmentResult.masterAlignedAudioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/wav' });
      const objectUrl = URL.createObjectURL(blob);
      setVoiceAudioUrl(objectUrl);

      if (alignmentResult.detectedSpeakerVoice) {
        setDetectedVoice(alignmentResult.detectedSpeakerVoice);
      }

      if (onAudioSynthesized) {
        onAudioSynthesized(alignmentResult.masterAlignedAudioBase64, alignmentResult.masterDuration);
      }

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    } catch (e) {
      console.warn('Voice blob conversion note:', e);
    }
  }, [alignmentResult]);

  // Sync video and voice volumes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isVideoMuted ? 0 : videoVolume;
    }
  }, [videoVolume, isVideoMuted]);

  useEffect(() => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.volume = voiceVolume;
    }
  }, [voiceVolume]);

  // Master Play/Pause toggle in lockstep
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      if (voiceAudioRef.current) voiceAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          if (voiceAudioRef.current && voiceAudioUrl) {
            voiceAudioRef.current.currentTime = videoRef.current!.currentTime;
            voiceAudioRef.current.play().catch(() => {});
          }
        })
        .catch((err) => console.warn('Video play note:', err));
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);

      // Keep voice audio strictly synchronized to within 0.15s
      if (voiceAudioRef.current && voiceAudioUrl && isPlaying) {
        const drift = Math.abs(voiceAudioRef.current.currentTime - cur);
        if (drift > 0.18) {
          voiceAudioRef.current.currentTime = cur;
        }
      }
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    if (voiceAudioRef.current) {
      voiceAudioRef.current.currentTime = time;
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current && videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  /**
   * Handle user uploading a video file
   * Automatically extracts the user's speech audio so AI can align voice to them!
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoFileName(file.name);
    setAlignmentResult(null);
    setIsPlaying(false);
    setDetectedVoice(null);

    // Extract speech audio from user's uploaded video
    setIsExtractingAudio(true);
    try {
      const extracted = await extractAudioFromVideoBlob(file, 25);
      if (extracted?.audioBase64) {
        setUserVideoAudioBase64(extracted.audioBase64);
        setAlignToUserVoice(true);
      } else {
        setUserVideoAudioBase64(null);
      }
    } catch (err) {
      console.warn('Video audio extract note:', err);
      setUserVideoAudioBase64(null);
    } finally {
      setIsExtractingAudio(false);
    }
  };

  /**
   * Start recording directly from user's camera + microphone
   */
  const startCameraRecording = async () => {
    setErrorMessage(null);
    cameraChunksRef.current = [];

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Camera / microphone is not accessible in this window. Please upload a video file instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraStreamRef.current = stream;

      if (cameraVideoPreviewRef.current) {
        cameraVideoPreviewRef.current.srcObject = stream;
        cameraVideoPreviewRef.current.play().catch(() => {});
      }

      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType: mime });
      cameraRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) cameraChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const videoBlob = new Blob(cameraChunksRef.current, { type: mime });
        const videoObjectUrl = URL.createObjectURL(videoBlob);
        setVideoUrl(videoObjectUrl);
        setVideoFileName('My_Camera_Video.webm');
        setAlignmentResult(null);
        setDetectedVoice(null);

        // Extract audio from recorded webcam video
        setIsExtractingAudio(true);
        try {
          const extracted = await extractAudioFromVideoBlob(videoBlob, 25);
          if (extracted?.audioBase64) {
            setUserVideoAudioBase64(extracted.audioBase64);
            setAlignToUserVoice(true);
          }
        } catch (err) {
          console.warn('Webcam audio extraction note:', err);
        } finally {
          setIsExtractingAudio(false);
        }

        stopCameraStream();
      };

      recorder.start(200);
      setIsRecordingCamera(true);
      setCameraSecs(0);

      cameraTimerRef.current = setInterval(() => {
        setCameraSecs((s) => {
          if (s >= 30) {
            stopCameraRecording();
            return 30;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Camera error:', err);
      setErrorMessage('Camera or microphone permission was denied. You can easily upload an MP4/WebM video file instead.');
    }
  };

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
  };

  const stopCameraRecording = () => {
    if (cameraRecorderRef.current && isRecordingCamera) {
      try {
        cameraRecorderRef.current.stop();
      } catch (e) {}
      setIsRecordingCamera(false);
      if (cameraTimerRef.current) clearInterval(cameraTimerRef.current);
    } else {
      stopCameraStream();
    }
  };

  /**
   * Extract 5 keyframe snapshots across the video duration
   */
  const extractVideoFrames = async (): Promise<{ timestamp: number; imageBase64: string }[]> => {
    const video = videoRef.current;
    if (!video) return [];

    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 270;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    const duration = Math.min(video.duration || videoDuration, 30);
    const sampleCount = 5;
    const interval = duration / (sampleCount + 1);
    const frames: { timestamp: number; imageBase64: string }[] = [];

    const wasPlaying = !video.paused;
    if (wasPlaying) video.pause();

    const originalTime = video.currentTime;

    for (let i = 1; i <= sampleCount; i++) {
      const targetTime = i * interval;
      video.currentTime = targetTime;

      await new Promise((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve(true);
        };
        video.addEventListener('seeked', onSeeked);
      });

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      const base64 = dataUrl.split(',')[1];

      frames.push({
        timestamp: Number(targetTime.toFixed(1)),
        imageBase64: base64,
      });
    }

    video.currentTime = originalTime;
    return frames;
  };

  /**
   * Trigger AI Video Visual Analysis & Voice Alignment to the user
   */
  const handleAnalyzeAndAlign = async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysisStage('Extracting visual video scene keyframes...');

    try {
      const frames = await extractVideoFrames();

      setAnalysisStage(
        alignToUserVoice && userVideoAudioBase64
          ? 'Cloning your voice signature from video speech and analyzing scene timing...'
          : 'Gemini Vision analyzing video cinematography and synchronizing script...'
      );

      const response = await fetch('/api/video/analyze-and-align', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames,
          videoDuration: videoRef.current?.duration || videoDuration,
          userScript,
          language: selectedLanguage,
          voice: currentProfile.baseVoice,
          userAudioBase64: userVideoAudioBase64,
          userAudioMimeType: 'audio/wav',
          alignToUserVoice: Boolean(alignToUserVoice && userVideoAudioBase64),
          emotion: 'Cinematic, engaging and authentic',
          voiceCloneProfile: currentProfile.isCloned ? currentProfile : null,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Video visual alignment failed.');
      }

      setAnalysisStage('Assembling master synchronized audio track in sync with video...');
      setAlignmentResult(data);

      if (data.detectedSpeakerVoice) {
        setDetectedVoice(data.detectedSpeakerVoice);
      }

      // If user had left script blank and AI transcribed speech or wrote story, update script preview
      if (!userScript && data.scenes?.length > 0) {
        const fullScript = data.scenes.map((s: any) => s.script).join(' ');
        setUserScript(fullScript);
      }

      // Start playing in lockstep
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 500);
    } catch (err: any) {
      console.warn('Video align error:', err);
      setErrorMessage(err.message || 'Failed to align voice to video. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage('');
    }
  };

  const handleSaveDetectedVoice = () => {
    if (detectedVoice && onSaveClonedProfile) {
      onSaveClonedProfile(detectedVoice);
      setVoiceSavedNotice(true);
      setTimeout(() => setVoiceSavedNotice(false), 3000);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-950/70 via-purple-950/50 to-slate-900 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">
                Video Voice Aligner & Cloner
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                ALIGN VOICE TO ME
              </span>
              <span className="text-[11px] font-nastaliq text-purple-200">
                ویڈیو دیکھ کر آپ کی آواز کی ہم آہنگی
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Speak anything in your video, write your custom script, and AI will clone your voice & align it perfectly to the video!
            </p>
          </div>
        </div>

        {/* Video Source Chips & Camera Trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400 font-mono">Video:</span>
          {SAMPLE_VIDEOS.map((sv) => (
            <button
              key={sv.id}
              onClick={() => {
                setVideoUrl(sv.url);
                setVideoFileName(sv.title);
                setAlignmentResult(null);
                setIsPlaying(false);
                setUserVideoAudioBase64(null);
                setDetectedVoice(null);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs transition-all ${
                videoUrl === sv.url
                  ? 'bg-indigo-600 text-white font-semibold shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {sv.title.split(' ')[0]}
            </button>
          ))}

          {/* Upload Video Button */}
          <label className="cursor-pointer px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors border border-slate-700">
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Upload My Video</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Record Live Camera Video Button */}
          {!isRecordingCamera ? (
            <button
              onClick={startCameraRecording}
              className="px-2.5 py-1 rounded-xl bg-pink-600/30 hover:bg-pink-600 text-pink-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors border border-pink-500/40"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Record Live Video</span>
            </button>
          ) : (
            <button
              onClick={stopCameraRecording}
              className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs flex items-center gap-1.5 animate-pulse"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop Recording ({cameraSecs}s)</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Camera Recording Overlay if active */}
      {isRecordingCamera && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 flex flex-col sm:flex-row items-center gap-4">
          <video
            ref={cameraVideoPreviewRef}
            muted
            playsInline
            className="w-48 h-32 rounded-xl object-cover bg-black border border-rose-500/60 shadow-lg"
          />
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span>Speak Anything into Camera & Mic... ({cameraSecs}s / 30s)</span>
            </div>
            <p className="text-xs text-slate-300">
              Speak naturally for 5 to 20 seconds. AI will automatically extract your voice signature and align it to your written text!
            </p>
            <button
              onClick={stopCameraRecording}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs inline-flex items-center gap-1.5 mt-1"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Finish & Load Video</span>
            </button>
          </div>
        </div>
      )}

      {/* Audio Extracting Indicator */}
      {isExtractingAudio && (
        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2.5">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Extracting spoken vocal track from video to clone your voice...</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Studio Viewport: Dual Video & Synchronized Voiceover Player */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Video Player with Scene Marker Timeline & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative rounded-3xl overflow-hidden bg-black border border-indigo-500/20 shadow-2xl group">
            {/* HTML5 Video element */}
            <video
              ref={videoRef}
              src={videoUrl}
              crossOrigin="anonymous"
              playsInline
              onLoadedMetadata={handleVideoLoaded}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              className="w-full h-auto aspect-video object-cover block cursor-pointer"
              onClick={togglePlay}
            />

            {/* Hidden Voiceover Audio synced in lockstep with video */}
            <audio
              ref={voiceAudioRef}
              src={voiceAudioUrl || undefined}
              onEnded={() => {}}
            />

            {/* Subtitles Overlay: Conditional on showSubtitlesOnScreen */}
            {showSubtitlesOnScreen && alignmentResult && isPlaying && (
              <div className="absolute bottom-16 inset-x-4 p-3 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 text-center animate-in fade-in duration-150 shadow-2xl">
                {(() => {
                  const currentScene = alignmentResult.scenes.find(
                    (s) => currentTime >= s.startTime && currentTime <= s.endTime
                  );
                  if (!currentScene) return null;
                  const isUrdu =
                    selectedLanguage.toLowerCase().includes('urdu') ||
                    /[\u0600-\u06FF]/.test(currentScene.script);

                  return (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block">
                        Scene {currentScene.sceneIndex} • {currentScene.visualDescription}
                      </span>
                      <p
                        className={`text-white text-sm sm:text-base font-semibold drop-shadow ${
                          isUrdu ? 'font-nastaliq leading-[2.2]' : ''
                        }`}
                        dir={isUrdu ? 'rtl' : 'ltr'}
                      >
                        {currentScene.script}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Bottom Overlay Video Controls */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-3 pt-6 flex flex-col gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
              {/* Scrub Timeline with Scene Markers */}
              <div className="relative w-full flex items-center">
                <input
                  type="range"
                  min={0}
                  max={videoDuration || 1}
                  step={0.05}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 z-10"
                />

                {/* Visual Scene Boundary Pins */}
                {alignmentResult?.scenes.map((s) => {
                  const leftPercent = (s.startTime / videoDuration) * 100;
                  return (
                    <div
                      key={s.sceneIndex}
                      style={{ left: `${leftPercent}%` }}
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80 pointer-events-none z-0"
                      title={`Scene ${s.sceneIndex} start`}
                    />
                  );
                })}
              </div>

              {/* Playback Controls Row */}
              <div className="flex items-center justify-between text-xs text-white">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md transition-transform active:scale-95"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  <span className="font-mono text-[11px] text-slate-300">
                    {formatTime(currentTime)} / {formatTime(videoDuration)}
                  </span>
                </div>

                {/* Subtitle Toggle + Audio Mixer Balance */}
                <div className="flex items-center gap-3 text-[11px]">
                  {/* Option to hide appearing text on the screen */}
                  <button
                    onClick={() => setShowSubtitlesOnScreen(!showSubtitlesOnScreen)}
                    className={`px-2 py-1 rounded-lg border text-[11px] flex items-center gap-1 transition-colors ${
                      showSubtitlesOnScreen
                        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                    title={showSubtitlesOnScreen ? 'Hide text appearing on screen' : 'Show text on screen'}
                  >
                    {showSubtitlesOnScreen ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{showSubtitlesOnScreen ? 'Hide Screen Text' : 'Show Screen Text'}</span>
                  </button>

                  {/* Video Volume */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsVideoMuted(!isVideoMuted)}
                      className="text-slate-400 hover:text-white"
                      title="Toggle Video BGM"
                    >
                      {isVideoMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                    <span className="text-slate-400 hidden sm:inline">BGM:</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isVideoMuted ? 0 : videoVolume}
                      onChange={(e) => {
                        setVideoVolume(parseFloat(e.target.value));
                        setIsVideoMuted(false);
                      }}
                      className="w-12 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-slate-400"
                    />
                  </div>

                  {/* AI Voice Volume */}
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-indigo-300 font-semibold hidden sm:inline">Voice:</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={voiceVolume}
                      onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                      className="w-14 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Card */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <Wand2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  {alignToUserVoice && userVideoAudioBase64
                    ? 'Align Voice to ME & Video'
                    : 'Synchronize Voice to Video'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {alignToUserVoice && userVideoAudioBase64 ? (
                    <span className="text-emerald-400 font-medium">
                      ✓ Clones your voice signature from video speech
                    </span>
                  ) : (
                    <span>
                      Voice: <strong className="text-indigo-300">{currentProfile.name}</strong> • Language:{' '}
                      <strong className="text-purple-300">{selectedLanguage}</strong>
                    </span>
                  )}
                </span>
              </div>
            </div>

            <button
              onClick={handleAnalyzeAndAlign}
              disabled={isAnalyzing}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
                isAnalyzing
                  ? 'bg-indigo-600/50 text-indigo-200 cursor-wait'
                  : 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white shadow-indigo-600/30 active:scale-95'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{analysisStage}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    {alignToUserVoice && userVideoAudioBase64
                      ? 'Align Voice to Me & Video'
                      : 'Watch Video & Synthesize Aligned Voice'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Detected User Cloned Voice Banner */}
          {detectedVoice && (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${detectedVoice.avatarColor} flex items-center justify-center text-white font-bold text-xs shadow-md`}
                >
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{detectedVoice.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                      CLONED FROM VIDEO
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {detectedVoice.timbreDescription}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSaveDetectedVoice}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{voiceSavedNotice ? 'Saved to Voices!' : 'Save My Voice to Library'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: User Script, Scene Breakdown & Voice Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Voice Mode Selector: Align to ME vs Persona */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Mic className="w-3.5 h-3.5 text-pink-400" />
                <span>Voice Alignment Mode</span>
              </span>
              {onOpenVoiceForge && (
                <button
                  onClick={onOpenVoiceForge}
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Unlimited Voice Forge</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAlignToUserVoice(true)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  alignToUserVoice
                    ? 'bg-pink-950/40 border-pink-500 text-white font-bold shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-pink-400" />
                  <span>Align to ME</span>
                </div>
                <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                  {userVideoAudioBase64
                    ? 'Clones your voice from video'
                    : 'Upload video with your speech'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAlignToUserVoice(false)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  !alignToUserVoice
                    ? 'bg-indigo-950/40 border-indigo-500 text-white font-bold shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Use Voice Persona</span>
                </div>
                <span className="text-[10px] text-slate-400 block font-normal mt-0.5 truncate">
                  {currentProfile.name}
                </span>
              </button>
            </div>
          </div>

          {/* User Script Input */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Write Your Script / Text</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-nastaliq">
                اپنی تحریر درج کریں
              </span>
            </div>

            <textarea
              value={userScript}
              onChange={(e) => setUserScript(e.target.value)}
              rows={4}
              placeholder="Type or paste any text or story here. The AI will align the speech to the video and voice it as you..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>{userScript.length} characters • {userScript.split(/\s+/).filter(Boolean).length} words</span>
              {userScript && (
                <button
                  onClick={() => setUserScript('')}
                  className="text-slate-500 hover:text-slate-300"
                >
                  Clear Text
                </button>
              )}
            </div>
          </div>

          {/* Visual Scene Alignment Results */}
          {alignmentResult ? (
            <div className="p-4 rounded-2xl bg-slate-900/95 border border-indigo-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Visual Scenes Synchronized</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {alignmentResult.videoSummary}
                  </p>
                </div>

                <a
                  href={`data:audio/wav;base64,${alignmentResult.masterAlignedAudioBase64}`}
                  download={`Aligned_Voiceover_${Date.now()}.wav`}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/40 text-[11px] font-medium flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download WAV</span>
                </a>
              </div>

              {/* Scene Cards List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {alignmentResult.scenes.map((scene) => {
                  const isCurrent = currentTime >= scene.startTime && currentTime <= scene.endTime;
                  const isUrdu =
                    selectedLanguage.toLowerCase().includes('urdu') ||
                    /[\u0600-\u06FF]/.test(scene.script);

                  return (
                    <div
                      key={scene.sceneIndex}
                      onClick={() => handleSeek(scene.startTime)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-indigo-950/50 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className="font-bold text-indigo-300">
                          Scene {scene.sceneIndex} • {formatTime(scene.startTime)} - {formatTime(scene.endTime)}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          Speed: {scene.recommendedSpeed || 1.0}x
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 mb-1.5 italic">
                        Visual: {scene.visualDescription}
                      </p>

                      <p
                        className={`text-xs text-white font-medium ${
                          isUrdu ? 'font-nastaliq leading-[2.2] text-sm' : ''
                        }`}
                        dir={isUrdu ? 'rtl' : 'ltr'}
                      >
                        {scene.script}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">No Synchronized Voiceover Yet</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1">
                  Upload or record your video, write your text, and click{' '}
                  <strong className="text-indigo-300">Align Voice to Me & Video</strong> to synchronize.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
