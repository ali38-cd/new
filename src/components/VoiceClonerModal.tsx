import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Upload,
  Sparkles,
  X,
  Play,
  Pause,
  Check,
  AlertCircle,
  Loader2,
  Wand2,
  Volume2,
  Activity,
  Layers,
  Radio,
  Music,
  ArrowRight,
} from 'lucide-react';
import { VoiceProfile } from '../types/tts';

interface VoiceClonerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (profile: VoiceProfile) => void;
}

export const VoiceClonerModal: React.FC<VoiceClonerModalProps> = ({
  isOpen,
  onClose,
  onSaveProfile,
}) => {
  const [tab, setTab] = useState<'record' | 'upload' | 'samples'>('record');
  const [voiceName, setVoiceName] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('Urdu (اردو)');

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioBase64, setRecordedAudioBase64] = useState<string | null>(null);
  const [recordedAudioMime, setRecordedAudioMime] = useState<string>('audio/webm');

  // Upload & Sample state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedAudioBase64, setUploadedAudioBase64] = useState<string | null>(null);
  const [uploadedAudioMime, setUploadedAudioMime] = useState<string>('audio/wav');
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  // Cloning process state
  const [isCloning, setIsCloning] = useState(false);
  const [cloneStage, setCloneStage] = useState<string>('');
  const [clonedProfile, setClonedProfile] = useState<VoiceProfile | null>(null);
  const [previewAudioBase64, setPreviewAudioBase64] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up on modal close
  useEffect(() => {
    if (!isOpen) {
      if (isRecording) {
        stopRecording();
      }
      setErrorMessage(null);
      setIsCloning(false);
      setClonedProfile(null);
    }
  }, [isOpen]);

  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];

    // Check mediaDevices support in browser
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage(
        'Direct microphone recording is not permitted or supported in this browser window. You can upload an audio file or select an instant vocal sample below.'
      );
      setTab('samples');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      setRecordedAudioMime(mime);

      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        setRecordedAudioBlob(audioBlob);

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          setRecordedAudioBase64(base64String);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(150);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 45) {
            stopRecording();
            return 45;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      // Use console.warn instead of console.error to prevent false-positive app crashes on permission denial
      console.warn('Microphone permission info:', err?.name || err?.message || err);
      setErrorMessage(
        'Microphone permission was denied or is restricted in this window. You can easily upload an audio file or pick one of the demo vocal samples below.'
      );
      setTab('samples');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Stop recording note:', e);
      }
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds 25MB. Please upload a shorter reference clip.');
      return;
    }

    setUploadedFileName(file.name);
    setUploadedAudioMime(file.type || 'audio/wav');

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setUploadedAudioBase64(base64String);
    };
    reader.readAsDataURL(file);
  };

  // 1-Click Demo Vocal Samples
  const handleSelectDemoSample = async (sampleId: string) => {
    setIsLoadingSample(true);
    setErrorMessage(null);
    setSelectedSampleId(sampleId);

    try {
      let sampleText = '';
      let sampleVoice = 'Fenrir';
      let defaultName = 'Urdu Orator Clone';
      let lang = 'Urdu (اردو)';

      if (sampleId === 'urdu-poet') {
        sampleText = 'خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے خدا بندے سے خود پوچھے بتا تیری رضا کیا ہے۔';
        sampleVoice = 'Fenrir';
        defaultName = 'Urdu Poetic Clone';
        lang = 'Urdu (اردو)';
      } else if (sampleId === 'urdu-story') {
        sampleText = 'بہت زمانے پہلے کی بات ہے، جب وادیِ نیلم کے سرسبز پہاڑوں پر شام کا منظر بہت دلکش تھا۔';
        sampleVoice = 'Kore';
        defaultName = 'Urdu Storyteller Clone';
        lang = 'Urdu (اردو)';
      } else {
        sampleText = 'Welcome to the audio workstation. Vocal synthesis captures genuine acoustic timbre.';
        sampleVoice = 'Charon';
        defaultName = 'Global Narrator Clone';
        lang = 'English';
      }

      setVoiceName(defaultName);
      setTargetLanguage(lang);

      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          voice: sampleVoice,
          language: lang,
          pitch: sampleId === 'urdu-poet' ? -3 : 0,
          speed: 1.0,
          modelQuality: 'fast',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.audioBase64) {
        throw new Error(data.error || 'Failed to prepare demo vocal sample.');
      }

      setUploadedAudioBase64(data.audioBase64);
      setUploadedAudioMime('audio/wav');
      setUploadedFileName(`${defaultName}_Reference.wav`);
    } catch (err: any) {
      console.warn('Demo sample error:', err);
      setErrorMessage('Could not load sample. Please try uploading an audio file instead.');
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleCloneSubmit = async () => {
    const rawAudio = tab === 'record' ? recordedAudioBase64 : uploadedAudioBase64;
    const rawMime = tab === 'record' ? recordedAudioMime : uploadedAudioMime;

    if (!rawAudio) {
      setErrorMessage(
        tab === 'record'
          ? 'Please record at least 5 seconds of audio, or select a demo sample.'
          : 'Please select or upload an audio file first.'
      );
      return;
    }

    const nameToUse = voiceName.trim() || `Cloned Voice ${new Date().toLocaleDateString()}`;

    setIsCloning(true);
    setErrorMessage(null);
    setCloneStage('Scanning acoustic spectrum and formant resonance...');

    try {
      const stageTimer1 = setTimeout(() => {
        setCloneStage('Extracting vocal timbre, pitch baseline (F0), and breath cadence...');
      }, 1600);

      const stageTimer2 = setTimeout(() => {
        setCloneStage('Mapping phonetic dialect, articulation quirks, and synthesis steering...');
      }, 3400);

      const response = await fetch('/api/voice/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: rawAudio,
          mimeType: rawMime,
          name: nameToUse,
          language: targetLanguage,
        }),
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to clone voice.');
      }

      setCloneStage('Synthesizing high-fidelity audio preview...');
      const profile: VoiceProfile = {
        ...data.profile,
        isCloned: true,
        avatarColor: 'from-amber-500 via-rose-600 to-indigo-600',
        tags: ['Custom Clone', targetLanguage, data.profile.pitchBaseline || 'Dynamic'],
      };

      setClonedProfile(profile);
      if (profile.previewAudioBase64) {
        setPreviewAudioBase64(profile.previewAudioBase64);
      }
    } catch (err: any) {
      console.warn('Cloning notification:', err);
      setErrorMessage(err.message || 'Acoustic voice analysis failed. Please try again with clear speech.');
    } finally {
      setIsCloning(false);
    }
  };

  const handleApplyProfile = () => {
    if (clonedProfile) {
      onSaveProfile(clonedProfile);
      onClose();
    }
  };

  const togglePreviewAudio = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const hasAudioReady = tab === 'record' ? !!recordedAudioBase64 : !!uploadedAudioBase64;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl shadow-indigo-950/60 relative overflow-hidden max-h-[92vh] flex flex-col">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                AuraVoice AI Voice Cloner
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Multilingual Cloner
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Clone any voice from audio sample to synthesize speech in Urdu & all languages
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content (scrollable) */}
        <div className="overflow-y-auto flex-1 py-4 space-y-5 pr-1">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              {tab === 'record' && (
                <button
                  onClick={() => setTab('samples')}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold transition-colors"
                >
                  Use Demo Samples
                </button>
              )}
            </div>
          )}

          {/* If already cloned, show the resulting profile card with preview */}
          {clonedProfile ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/40 shadow-xl space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
                      {clonedProfile.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base flex items-center gap-2">
                        {clonedProfile.name}
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium">
                          Clone Ready
                        </span>
                      </h3>
                      <p className="text-xs text-indigo-300">{clonedProfile.timbreDescription}</p>
                    </div>
                  </div>
                </div>

                {/* Acoustic traits pills */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Dialect & Accent</span>
                    <span className="text-slate-200 font-medium">{clonedProfile.accentDialect || 'Urdu / Multilingual'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Cadence & Rhythm</span>
                    <span className="text-slate-200 font-medium">{clonedProfile.cadence || 'Natural conversational'}</span>
                  </div>
                </div>

                {/* Vocal traits tags */}
                {clonedProfile.vocalTraits && (
                  <div className="flex flex-wrap gap-1.5">
                    {clonedProfile.vocalTraits.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[11px] bg-slate-800/90 text-slate-300 border border-slate-700/80"
                      >
                        ✓ {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Preview player */}
                {previewAudioBase64 && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-500/30 flex items-center justify-between gap-3">
                    <audio
                      ref={previewAudioRef}
                      src={`data:audio/wav;base64,${previewAudioBase64}`}
                      onEnded={() => setIsPlayingPreview(false)}
                    />
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={togglePreviewAudio}
                        className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md transition-transform active:scale-95"
                      >
                        {isPlayingPreview ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      </button>
                      <div className="text-xs">
                        <span className="text-white font-medium block">Audition Cloned Voice</span>
                        <span className="text-[11px] text-slate-400 font-nastaliq">آواز کی آزمائش سنیں</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">
                      Sample Generated
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setClonedProfile(null);
                    setPreviewAudioBase64(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Clone Another Voice
                </button>
                <button
                  onClick={handleApplyProfile}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Activate Cloned Voice in Studio</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Profile Config Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Voice Profile Name
                  </label>
                  <input
                    type="text"
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    placeholder="e.g. My Urdu Voice, Allama Persona..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Target Primary Language
                  </label>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Urdu (اردو)">Urdu (اردو)</option>
                    <option value="English">English</option>
                    <option value="Arabic (العربية)">Arabic (العربية)</option>
                    <option value="Hindi (हिन्दी)">Hindi (हिन्दी)</option>
                    <option value="Multilingual Universal">Multilingual Universal</option>
                  </select>
                </div>
              </div>

              {/* 3 Tab Selectors: Record, Upload, Demo Samples */}
              <div className="flex rounded-xl bg-slate-800/60 p-1 border border-slate-800 text-xs">
                <button
                  onClick={() => setTab('record')}
                  className={`flex-1 py-2 font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    tab === 'record'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Microphone</span>
                </button>
                <button
                  onClick={() => setTab('upload')}
                  className={`flex-1 py-2 font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    tab === 'upload'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
                <button
                  onClick={() => setTab('samples')}
                  className={`flex-1 py-2 font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    tab === 'samples'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Demo Samples</span>
                </button>
              </div>

              {/* Record Tab Content */}
              {tab === 'record' && (
                <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-4">
                  {/* Recording Visual & Counter */}
                  <div className="relative inline-flex items-center justify-center">
                    {isRecording && (
                      <div className="absolute w-24 h-24 rounded-full bg-rose-500/20 animate-ping" />
                    )}
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center text-white transition-all transform active:scale-95 shadow-xl ${
                        isRecording
                          ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/40'
                          : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/40'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <Square className="w-6 h-6 fill-current mb-1" />
                          <span className="text-[10px] font-mono font-bold">Stop</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-6 h-6 mb-1" />
                          <span className="text-[10px] font-bold">Record</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="font-mono text-sm font-bold text-white">
                      {isRecording ? (
                        <span className="text-rose-400 flex items-center justify-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          Recording: {recordingSeconds}s / 45s
                        </span>
                      ) : recordedAudioBase64 ? (
                        <span className="text-emerald-400 flex items-center justify-center gap-1.5">
                          <Check className="w-4 h-4" /> Voice sample captured ({recordingSeconds}s)
                        </span>
                      ) : (
                        <span className="text-slate-400">Click Record and speak 5-15 seconds in any language</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      If your browser restricts mic permissions in the iframe, switch to "Demo Samples" or "Upload File".
                    </p>
                  </div>

                  {/* Sample script to read during recording */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-left">
                    <span className="text-[10px] uppercase font-mono text-indigo-400 block mb-1">
                      Suggested sample to read aloud:
                    </span>
                    <p className="text-xs text-slate-200 font-nastaliq leading-loose" dir="rtl">
                      "السلام علیکم! میرا نام ایک نیا سفر ہے اور ہر لفظ میں میرے جذبات کی صدا شامل ہے۔"
                    </p>
                  </div>
                </div>
              )}

              {/* Upload Tab Content */}
              {tab === 'upload' && (
                <div className="p-6 rounded-2xl bg-slate-950/60 border border-dashed border-slate-700/80 text-center space-y-4 hover:border-indigo-500/50 transition-colors">
                  <input
                    type="file"
                    id="voice-audio-file"
                    accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="voice-audio-file"
                    className="cursor-pointer block space-y-2"
                  >
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        {uploadedFileName || 'Drop audio sample or click to browse'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Supports MP3, WAV, M4A, OGG, WebM (clean speech recording of 5-60 seconds)
                      </span>
                    </div>
                  </label>

                  {uploadedAudioBase64 && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                      <Check className="w-3.5 h-3.5" /> File Loaded: {uploadedFileName}
                    </div>
                  )}
                </div>
              )}

              {/* Instant Demo Samples Tab Content */}
              {tab === 'samples' && (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-left">
                    <span className="text-xs font-semibold text-white block">
                      Instant Vocal Reference Samples
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Select a reference vocal sample to clone and personalize without recording:
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      {
                        id: 'urdu-poet',
                        title: 'Urdu Poetic Voice',
                        subtitle: 'علامہ اقبال ترنم',
                        desc: 'Deep classical baritone, poetic cadence & Urdu diction',
                        tag: 'Urdu Classical',
                      },
                      {
                        id: 'urdu-story',
                        title: 'Urdu Storyteller',
                        subtitle: 'زینب داستانی آواز',
                        desc: 'Warm feminine narrative with melodic inflection',
                        tag: 'Urdu Warm',
                      },
                      {
                        id: 'english-anchor',
                        title: 'Global Narrator',
                        subtitle: 'World Studio Voice',
                        desc: 'Articulate documentary delivery and balanced timbre',
                        tag: 'Multilingual',
                      },
                    ].map((sample) => {
                      const isSelected = selectedSampleId === sample.id;

                      return (
                        <button
                          key={sample.id}
                          disabled={isLoadingSample}
                          onClick={() => handleSelectDemoSample(sample.id)}
                          className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-white">{sample.title}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                            <span className="text-[11px] font-nastaliq text-indigo-300 block mb-1">
                              {sample.subtitle}
                            </span>
                            <p className="text-[10px] text-slate-400 leading-relaxed mb-2">
                              {sample.desc}
                            </p>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400 self-start font-mono">
                            {sample.tag}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {isLoadingSample && (
                    <div className="flex items-center justify-center gap-2 py-2 text-xs text-indigo-300 font-mono">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Loading reference vocal acoustics...</span>
                    </div>
                  )}

                  {uploadedAudioBase64 && !isLoadingSample && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                      <span className="flex items-center gap-1.5 font-mono">
                        <Check className="w-4 h-4" /> Ready to clone: {voiceName}
                      </span>
                      <span className="text-[10px] text-slate-400">Click synthesize below</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={handleCloneSubmit}
                  disabled={isCloning || !hasAudioReady}
                  className={`w-full py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xl ${
                    isCloning
                      ? 'bg-indigo-600/50 text-indigo-200 cursor-wait'
                      : hasAudioReady
                      ? 'bg-gradient-to-r from-amber-500 via-pink-600 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white shadow-indigo-600/30'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isCloning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{cloneStage}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Synthesize & Clone Voice Profile</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
