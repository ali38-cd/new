import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Sliders,
  Check,
  Copy,
  Gauge,
  Sparkles,
  Music,
  Share2,
} from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';

interface AudioPlayerBarProps {
  audioBase64: string | null;
  mimeType?: string;
  durationSeconds?: number;
  voiceName?: string;
  emotion?: string;
  language?: string;
  pitch: number;
  onPitchChange: (newPitch: number) => void;
  speed: number;
  onSpeedChange: (newSpeed: number) => void;
  onDownloadWav?: () => void;
  isGenerating?: boolean;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  audioBase64,
  mimeType = 'audio/wav',
  durationSeconds = 0,
  voiceName = 'Kore',
  emotion = 'Natural',
  language = 'Urdu',
  pitch,
  onPitchChange,
  speed,
  onSpeedChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(durationSeconds);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDspPanel, setShowDspPanel] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Helper to convert base64 to Blob without browser data URI truncation
  const base64ToBlob = (base64: string, type = 'audio/wav'): Blob => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  };

  // Update audio URL as Blob ObjectURL when audioBase64 changes
  useEffect(() => {
    if (!audioBase64) {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(null);
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    let objectUrl = '';
    try {
      const blob = base64ToBlob(audioBase64, mimeType);
      objectUrl = URL.createObjectURL(blob);
      setAudioUrl(objectUrl);
    } catch (e) {
      // Fallback
      objectUrl = `data:${mimeType};base64,${audioBase64}`;
      setAudioUrl(objectUrl);
    }

    setCurrentTime(0);
    setIsPlaying(false);

    if (audioRef.current) {
      audioRef.current.load();
    }

    return () => {
      if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [audioBase64, mimeType]);

  // Sync totalDuration whenever durationSeconds prop updates from synthesis
  useEffect(() => {
    if (durationSeconds > 0) {
      setTotalDuration(durationSeconds);
    }
  }, [durationSeconds]);

  // Sync playback rate with speed prop
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Sync volume with muted state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn('Play error:', err));
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
      setTotalDuration(audioRef.current.duration);
    } else if (durationSeconds > 0) {
      setTotalDuration(durationSeconds);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
        setTotalDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleDownload = () => {
    if (!audioBase64) return;
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${audioBase64}`;
    link.download = `AuraVoice_${language}_${voiceName}_${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = () => {
    if (!audioBase64) return;
    navigator.clipboard.writeText(`data:${mimeType};base64,${audioBase64}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!audioBase64) {
    return (
      <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center backdrop-blur-md">
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Music className="w-4 h-4 text-indigo-400" />
          <span>Enter text and click <strong className="text-indigo-300">Generate Speech</strong> to hear natural synthesized audio</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 md:p-5 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl relative overflow-hidden transition-all">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onCanPlay={handleLoadedMetadata}
      />

      <div className="space-y-4 relative z-10">
        {/* Header track info & badges */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white tracking-wide text-sm md:text-base">{voiceName}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {language}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {emotion}
                </span>
                {totalDuration > 20 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Complete Story
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Master 24kHz Mono WAV • {formatTime(totalDuration)} Total Story Duration
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDspPanel(!showDspPanel)}
              className={`p-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                showDspPanel
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
              }`}
              title="DSP Pitch & Speed Modulator"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pitch & Speed DSP</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs transition-colors flex items-center gap-1.5"
              title="Copy audio data URI"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download WAV</span>
            </button>
          </div>
        </div>

        {/* Audio Visualizer component */}
        <AudioVisualizer audioElement={audioRef.current} isPlaying={isPlaying} />

        {/* Progress scrub bar */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={totalDuration || 1}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
          />
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Playback Controls Rack */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Replay */}
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play();
                  setIsPlaying(true);
                }
              }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Restart from beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Quick Speed Chips */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 px-2 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-indigo-400" /> Speed:
            </span>
            {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-0.5 rounded-lg text-xs font-mono transition-all ${
                  speed === s
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Expandable DSP Modulation Rack */}
        {showDspPanel && (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/20 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Live Pitch Modulator */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Fine Pitch Tuning:
                </span>
                <span className="font-mono text-indigo-300 font-bold">
                  {pitch > 0 ? `+${pitch}` : pitch} semitones {pitch === 0 ? '(Default)' : pitch > 0 ? '(Higher)' : '(Deeper)'}
                </span>
              </div>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={pitch}
                onChange={(e) => onPitchChange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-12 (Deep Bass)</span>
                <button
                  onClick={() => onPitchChange(0)}
                  className="text-slate-400 hover:text-indigo-300 underline"
                >
                  Reset Pitch (0)
                </button>
                <span>+12 (Soprano)</span>
              </div>
            </div>

            {/* Custom Speed Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-300 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-purple-400" /> Continuous Tempo / Speed:
                </span>
                <span className="font-mono text-purple-300 font-bold">{speed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.2}
                step={0.05}
                value={speed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.5x (Slow)</span>
                <button
                  onClick={() => onSpeedChange(1.0)}
                  className="text-slate-400 hover:text-purple-300 underline"
                >
                  Reset Speed (1.0x)
                </button>
                <span>2.2x (Brisk)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
