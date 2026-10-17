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
  Film,
  Layers,
  Clock,
  Sliders,
} from 'lucide-react';
import { VoiceProfile, VideoScene, VideoAlignmentResult } from '../types/tts';

interface VideoVoiceStudioProps {
  currentProfile: VoiceProfile;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  onAudioSynthesized?: (audioBase64: string, duration: number) => void;
}

const SAMPLE_VIDEOS = [
  {
    id: 'sample-nature',
    title: 'Scenic Mountain Vista (وادیِ کوہسار)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    desc: 'Cinematic drone landscape with peaks and rivers',
  },
  {
    id: 'sample-tech',
    title: 'Futuristic AI Horizon (جدید ٹیکنالوجی)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    desc: 'Dynamic visual travel with vibrant camera movements',
  },
  {
    id: 'sample-wildlife',
    title: 'Nature & Wildlife (قدرت اور حیاتیات)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    desc: 'Lively outdoor pacing with multiple action scenes',
  },
];

export const VideoVoiceStudio: React.FC<VideoVoiceStudioProps> = ({
  currentProfile,
  selectedLanguage,
  onSelectLanguage,
  onAudioSynthesized,
}) => {
  const [videoUrl, setVideoUrl] = useState<string>(SAMPLE_VIDEOS[0].url);
  const [videoFileName, setVideoFileName] = useState<string>(SAMPLE_VIDEOS[0].title);
  const [videoDuration, setVideoDuration] = useState<number>(15);
  const [userScript, setUserScript] = useState<string>('');

  // Dual playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoVolume, setVideoVolume] = useState<number>(0.2); // keep background video low
  const [voiceVolume, setVoiceVolume] = useState<number>(1.0); // voice loud and clear

  // AI Alignment state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStage, setAnalysisStage] = useState<string>('');
  const [alignmentResult, setAlignmentResult] = useState<VideoAlignmentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      videoRef.current.volume = videoVolume;
    }
  }, [videoVolume]);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoFileName(file.name);
    setAlignmentResult(null);
    setIsPlaying(false);
  };

  /**
   * Extract 6 keyframe visual snapshots across the video duration using HTML5 canvas
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

      // Wait for seek to complete
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
   * Trigger AI Video Visual Analysis & Synchronized Voiceover
   */
  const handleAnalyzeAndAlign = async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysisStage('Extracting visual keyframe scenes from video...');

    try {
      const frames = await extractVideoFrames();

      setAnalysisStage('Gemini Vision analyzing video cinematography, story beats & scene timings...');

      const response = await fetch('/api/video/analyze-and-align', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames,
          videoDuration: videoRef.current?.duration || videoDuration,
          userScript,
          language: selectedLanguage,
          voice: currentProfile.baseVoice,
          emotion: 'Cinematic, engaging and authentic',
          voiceCloneProfile: currentProfile.isCloned ? currentProfile : null,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Video visual alignment failed.');
      }

      setAnalysisStage('Assembling master synchronized voiceover track...');
      setAlignmentResult(data);

      // Start playing both in lockstep
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 500);
    } catch (err: any) {
      console.warn('Video align error:', err);
      setErrorMessage(err.message || 'Failed to align voice to video. Please try another video clip.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage('');
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
      <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">
                Video-to-Voice AI Studio
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Visual Alignment
              </span>
              <span className="text-[11px] font-nastaliq text-purple-200">
                ویڈیو دیکھ کر صوتی ہم آہنگی
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gemini Vision watches the video, detects scene cuts, and aligns natural voiceovers in Urdu & all languages
            </p>
          </div>
        </div>

        {/* Video selector chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400 font-mono">Sample Clips:</span>
          {SAMPLE_VIDEOS.map((sv) => (
            <button
              key={sv.id}
              onClick={() => {
                setVideoUrl(sv.url);
                setVideoFileName(sv.title);
                setAlignmentResult(null);
                setIsPlaying(false);
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
          <label className="cursor-pointer px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload MP4</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Studio Viewport: Dual Video & Synchronized Voiceover Player */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Video Player with Scene Marker Timeline (7 cols) */}
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

            {/* Hidden Voiceover Audio synced with video */}
            <audio
              ref={voiceAudioRef}
              src={voiceAudioUrl || undefined}
              onEnded={() => {}}
            />

            {/* Ambient Overlay Subtitle when synchronized voice is playing */}
            {alignmentResult && isPlaying && (
              <div className="absolute bottom-16 inset-x-4 p-3 rounded-2xl bg-black/75 backdrop-blur-md border border-white/10 text-center animate-in fade-in duration-150">
                {(() => {
                  const currentScene = alignmentResult.scenes.find(
                    (s) => currentTime >= s.startTime && currentTime <= s.endTime
                  );
                  if (!currentScene) return null;
                  const isUrdu = selectedLanguage.toLowerCase().includes('urdu') || /[\u0600-\u06FF]/.test(currentScene.script);

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
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6 flex flex-col gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
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

                {/* Render visual scene boundary pins along the timeline */}
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
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  <span className="font-mono text-[11px] text-slate-300">
                    {formatTime(currentTime)} / {formatTime(videoDuration)}
                  </span>
                </div>

                {/* Audio Mixer Balance: Video vs Voice */}
                <div className="flex items-center gap-4 text-[11px]">
                  {/* Video Volume */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Video BGM:</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={videoVolume}
                      onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                      className="w-14 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-slate-400"
                    />
                  </div>

                  {/* AI Voice Volume */}
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-indigo-300 font-semibold">AI Voice:</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={voiceVolume}
                      onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                      className="w-16 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Card */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Synchronize AI Voice to Video
                </span>
                <span className="text-[11px] text-slate-400">
                  Voice: <strong className="text-indigo-300">{currentProfile.name}</strong> • Language: <strong className="text-purple-300">{selectedLanguage}</strong>
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
                  <Wand2 className="w-4 h-4" />
                  <span>Watch Video & Synthesize Aligned Voice</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Scene Breakdown, Script & Synchronized Cues (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Optional User Script Input or Auto-Generate toggle */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Custom Script (Optional)
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-nastaliq">اختیاری تحریر</span>
            </div>
            <textarea
              value={userScript}
              onChange={(e) => setUserScript(e.target.value)}
              rows={2}
              placeholder="Leave blank to let AI watch the video and write the story automatically, or paste your script to align to scenes..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Visual Scene Alignment Results */}
          {alignmentResult ? (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/40 shadow-xl space-y-3">
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
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {alignmentResult.scenes.map((scene) => {
                  const isCurrent = currentTime >= scene.startTime && currentTime <= scene.endTime;
                  const isUrdu = selectedLanguage.toLowerCase().includes('urdu') || /[\u0600-\u06FF]/.test(scene.script);

                  return (
                    <div
                      key={scene.sceneIndex}
                      onClick={() => handleSeek(scene.startTime)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
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
                <h4 className="text-xs font-bold text-white">No Voiceover Aligned Yet</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1">
                  Click <strong className="text-indigo-300">Watch Video & Synthesize Aligned Voice</strong> to extract visual scenes and generate timed voiceovers in sync.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
