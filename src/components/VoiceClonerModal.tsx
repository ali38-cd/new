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
  Video,
  Camera,
  Layers,
  Radio,
  Flame,
  Shuffle,
  Music,
  ArrowRight,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { VoiceProfile } from '../types/tts';
import { extractAudioFromVideoBlob } from '../utils/audioExtractor';

interface VoiceClonerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (profile: VoiceProfile) => void;
  defaultTab?: 'generator' | 'video' | 'record' | 'upload' | 'samples';
}

const CREATIVE_VOICE_IDEAS = [
  {
    name: 'Urdu Sufi Storyteller (صوفی داستان گو)',
    prompt: 'A gentle, wise 65-year-old Sufi narrator in Urdu with warm resonant chest depth, poetic pauses, and deep spiritual serenity.',
    gender: 'male' as const,
    language: 'Urdu',
    timbre: 'Deep warm resonant baritone',
  },
  {
    name: 'Zoya - Tech & Podcast Host (زویا پوڈکاسٹر)',
    prompt: 'A modern, vibrant 26-year-old female podcast host in Urdu and English with articulate, smiling, crystal-clear intonation.',
    gender: 'female' as const,
    language: 'Urdu',
    timbre: 'Bright, smiling, melodic feminine',
  },
  {
    name: 'Epic Movie Trailer Narrator',
    prompt: 'A thunderous, gravelly cinematic movie trailer narrator with profound bass rumble and dramatic theatrical pacing.',
    gender: 'male' as const,
    language: 'English',
    timbre: 'Gravelly deep sub-bass cinematic',
  },
  {
    name: 'Amina - Bedtime Tale Narrator (آمنہ لوری و کہانیاں)',
    prompt: 'A soothing, velvety motherly voice telling gentle bedtime stories in soft Urdu, whisper-soft and calming.',
    gender: 'female' as const,
    language: 'Urdu',
    timbre: 'Velvety soothing whisper-soft',
  },
  {
    name: 'Sheraz - Radio Anchor (شیراز نیوز اینکر)',
    prompt: 'An authoritative, crisp national broadcast radio anchor with commanding diction, rapid precision, and balanced bass.',
    gender: 'male' as const,
    language: 'Urdu',
    timbre: 'Crisp authoritative broadcast baritone',
  },
  {
    name: 'Mystic Sci-Fi AI Synthesizer',
    prompt: 'An ethereal and serene synthetic entity with luminous modulation and cosmic clarity.',
    gender: 'neutral' as const,
    language: 'English',
    timbre: 'Luminous ethereal melodic',
  },
];

export const VoiceClonerModal: React.FC<VoiceClonerModalProps> = ({
  isOpen,
  onClose,
  onSaveProfile,
  defaultTab = 'generator',
}) => {
  const [tab, setTab] = useState<'generator' | 'video' | 'record' | 'upload' | 'samples'>(defaultTab);

  // Unlimited Voice Generator State
  const [generatorPrompt, setGeneratorPrompt] = useState('');
  const [generatorName, setGeneratorName] = useState('');
  const [generatorGender, setGeneratorGender] = useState<'male' | 'female' | 'neutral'>('male');
  const [generatorAge, setGeneratorAge] = useState<'young' | 'adult' | 'senior'>('adult');
  const [generatorTimbre, setGeneratorTimbre] = useState('Warm & Expressive');
  const [generatorLang, setGeneratorLang] = useState('Urdu (اردو)');

  // Video Voice Extraction State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [videoAudioBase64, setVideoAudioBase64] = useState<string | null>(null);
  const [isExtractingVideoAudio, setIsExtractingVideoAudio] = useState(false);

  // Direct Webcam Video Recording State
  const [isRecordingWebcam, setIsRecordingWebcam] = useState(false);
  const [webcamSecs, setWebcamSecs] = useState(0);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const webcamRecorderRef = useRef<MediaRecorder | null>(null);
  const webcamChunksRef = useRef<Blob[]>([]);

  // Mic Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBase64, setRecordedAudioBase64] = useState<string | null>(null);
  const [recordedAudioMime, setRecordedAudioMime] = useState('audio/webm');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Audio File Upload & Sample State
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedAudioBase64, setUploadedAudioBase64] = useState<string | null>(null);
  const [uploadedAudioMime, setUploadedAudioMime] = useState('audio/wav');
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  // Execution & Output Profile State
  const [voiceName, setVoiceName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [activeProfile, setActiveProfile] = useState<VoiceProfile | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTab(defaultTab);
      setErrorMessage(null);
      setActiveProfile(null);
    } else {
      stopRecording();
      stopWebcamRecording();
    }
  }, [isOpen, defaultTab]);

  // Clean up media on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      stopWebcamRecording();
    };
  }, []);

  const handlePickRandomIdea = () => {
    const random = CREATIVE_VOICE_IDEAS[Math.floor(Math.random() * CREATIVE_VOICE_IDEAS.length)];
    setGeneratorName(random.name);
    setGeneratorPrompt(random.prompt);
    setGeneratorGender(random.gender);
    setGeneratorLang(random.language === 'Urdu' ? 'Urdu (اردو)' : 'English');
    setGeneratorTimbre(random.timbre);
  };

  /**
   * Action 1: Generate Unlimited Custom Voice
   */
  const handleGenerateVoice = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStage('Acoustic designer synthesizing voice matrix with Gemini...');

    try {
      const response = await fetch('/api/voice/generate-voice-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: generatorPrompt.trim() || `${generatorGender} ${generatorAge} voice with ${generatorTimbre} timbre`,
          name: generatorName.trim(),
          gender: generatorGender,
          ageGroup: generatorAge,
          timbreStyle: generatorTimbre,
          language: generatorLang,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to design voice persona.');
      }

      setActiveProfile(data.profile);
    } catch (err: any) {
      console.warn('Voice generator error:', err);
      setErrorMessage(err.message || 'Voice generation failed. Please try a different description.');
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  /**
   * Action 2: Clone Voice from Audio or Video
   */
  const handleCloneVoice = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStage('Analyzing acoustic signature, pitch, timbre & prosody...');

    let sourceAudioBase64 = '';
    let sourceMime = 'audio/wav';
    let chosenName = voiceName.trim() || 'My Cloned Voice';

    if (tab === 'video') {
      sourceAudioBase64 = videoAudioBase64 || '';
      sourceMime = 'audio/wav';
      chosenName = voiceName.trim() || 'My Video Voice';
    } else if (tab === 'record') {
      sourceAudioBase64 = recordedAudioBase64 || '';
      sourceMime = recordedAudioMime;
    } else if (tab === 'upload' || tab === 'samples') {
      sourceAudioBase64 = uploadedAudioBase64 || '';
      sourceMime = uploadedAudioMime;
    }

    if (!sourceAudioBase64) {
      setIsProcessing(false);
      setErrorMessage('Please provide an audio or video recording first to clone a voice.');
      return;
    }

    try {
      const response = await fetch('/api/voice/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: sourceAudioBase64,
          mimeType: sourceMime,
          name: chosenName,
          language: generatorLang,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Voice cloning failed.');
      }

      setActiveProfile(data.profile);
    } catch (err: any) {
      console.warn('Voice cloning error:', err);
      setErrorMessage(err.message || 'Voice cloning analysis failed.');
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  /**
   * Video File Upload & Audio Extraction
   */
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoFile(file);
    setVideoFileName(file.name);
    setIsExtractingVideoAudio(true);

    try {
      const extracted = await extractAudioFromVideoBlob(file, 25);
      if (extracted && extracted.audioBase64) {
        setVideoAudioBase64(extracted.audioBase64);
      } else {
        setErrorMessage('Could not find an audible spoken track in this video. Please upload a video where you speak.');
      }
    } catch (err) {
      console.warn('Video extract error:', err);
      setErrorMessage('Could not extract audio track from video file.');
    } finally {
      setIsExtractingVideoAudio(false);
    }
  };

  /**
   * Live Webcam & Mic Video Recording
   */
  const startWebcamRecording = async () => {
    setErrorMessage(null);
    webcamChunksRef.current = [];

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Camera and microphone access is restricted in this window.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      webcamStreamRef.current = stream;

      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        webcamVideoRef.current.play().catch(() => {});
      }

      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType: mime });
      webcamRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) webcamChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const videoBlob = new Blob(webcamChunksRef.current, { type: mime });
        setVideoFileName('Webcam_Recording.webm');
        setIsExtractingVideoAudio(true);
        try {
          const extracted = await extractAudioFromVideoBlob(videoBlob, 25);
          if (extracted?.audioBase64) {
            setVideoAudioBase64(extracted.audioBase64);
          }
        } catch (err) {
          console.warn('Webcam audio extraction note:', err);
        } finally {
          setIsExtractingVideoAudio(false);
        }
        stopWebcamStream();
      };

      recorder.start(200);
      setIsRecordingWebcam(true);
      setWebcamSecs(0);

      timerRef.current = setInterval(() => {
        setWebcamSecs((s) => {
          if (s >= 30) {
            stopWebcamRecording();
            return 30;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Webcam note:', err?.message || err);
      setErrorMessage('Camera/Microphone permission denied. You can upload any video or audio file below.');
    }
  };

  const stopWebcamStream = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((t) => t.stop());
      webcamStreamRef.current = null;
    }
  };

  const stopWebcamRecording = () => {
    if (webcamRecorderRef.current && isRecordingWebcam) {
      try {
        webcamRecorderRef.current.stop();
      } catch (e) {}
      setIsRecordingWebcam(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      stopWebcamStream();
    }
  };

  /**
   * Direct Microphone Audio Recording
   */
  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Microphone access is not supported or restricted in this environment.');
      setTab('samples');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      setRecordedAudioMime(mime);

      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = (reader.result as string).split(',')[1];
          setRecordedAudioBase64(b64);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(150);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 40) {
            stopRecording();
            return 40;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone note:', err?.message || err);
      setErrorMessage('Microphone permission was denied. You can easily upload an audio/video file or use demo vocal samples.');
      setTab('samples');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  /**
   * Audio File Upload
   */
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadedAudioMime(file.type || 'audio/wav');

    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = (reader.result as string).split(',')[1];
      setUploadedAudioBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Preview Sample Toggle
   */
  const togglePlayPreview = () => {
    if (!activeProfile?.previewAudioBase64) return;
    if (isPlayingPreview) {
      previewAudioRef.current?.pause();
      setIsPlayingPreview(false);
    } else {
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio(`data:audio/wav;base64,${activeProfile.previewAudioBase64}`);
        previewAudioRef.current.onended = () => setIsPlayingPreview(false);
      }
      previewAudioRef.current.play().then(() => setIsPlayingPreview(true)).catch(() => {});
    }
  };

  const handleSaveAndUse = () => {
    if (activeProfile) {
      onSaveProfile(activeProfile);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-pink-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Unlimited Voice Forge & Cloner</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-bold">
                  UNLIMITED
                </span>
                <span className="text-[11px] font-nastaliq text-purple-200">لامحدود آوازوں کا مرکز</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Generate infinite new voice personas, clone from video speech, or replicate any voice
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-950/70 border-b border-slate-800/80 overflow-x-auto text-xs">
          <button
            onClick={() => setTab('generator')}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              tab === 'generator'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Generate Unlimited Voices</span>
          </button>

          <button
            onClick={() => setTab('video')}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              tab === 'video'
                ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-pink-400" />
            <span>Clone From Video Speech</span>
          </button>

          <button
            onClick={() => setTab('upload')}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              tab === 'upload' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Audio File</span>
          </button>

          <button
            onClick={() => setTab('record')}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              tab === 'record' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Microphone</span>
          </button>

          <button
            onClick={() => setTab('samples')}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              tab === 'samples' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Demo Vocals</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: GENERATE UNLIMITED VOICES */}
          {tab === 'generator' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>AI Voice Architect</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Describe any voice characteristics, and Gemini will generate a custom acoustic model and voice profile.
                  </p>
                </div>

                <button
                  onClick={handlePickRandomIdea}
                  type="button"
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs flex items-center gap-1 border border-slate-700 transition-colors"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>Random Idea</span>
                </button>
              </div>

              {/* Prompt Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Voice Persona Concept / Description:
                </label>
                <textarea
                  value={generatorPrompt}
                  onChange={(e) => setGeneratorPrompt(e.target.value)}
                  rows={2}
                  placeholder="e.g., A warm 50-year-old Urdu documentary storyteller with deep resonant baritone and poetic cadence..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Quick Parameter Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Gender</label>
                  <select
                    value={generatorGender}
                    onChange={(e: any) => setGeneratorGender(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                  >
                    <option value="male">Male (مردانہ)</option>
                    <option value="female">Female (زنانہ)</option>
                    <option value="neutral">Neutral / Artistic</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Age Group</label>
                  <select
                    value={generatorAge}
                    onChange={(e: any) => setGeneratorAge(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                  >
                    <option value="young">Youthful (20-30)</option>
                    <option value="adult">Mature Adult (30-50)</option>
                    <option value="senior">Elderly / Wise (50+)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Timbre Profile</label>
                  <select
                    value={generatorTimbre}
                    onChange={(e) => setGeneratorTimbre(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                  >
                    <option value="Warm & Resonant">Warm & Resonant</option>
                    <option value="Deep Cinematic Bass">Deep Cinematic Bass</option>
                    <option value="Bright & Expressive">Bright & Expressive</option>
                    <option value="Velvety & Soothing">Velvety & Soothing</option>
                    <option value="Crisp Broadcast">Crisp Broadcast</option>
                    <option value="Whispery & Soft">Whispery & Soft</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Language Diction</label>
                  <select
                    value={generatorLang}
                    onChange={(e) => setGeneratorLang(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                  >
                    <option value="Urdu (اردو)">Urdu (اردو)</option>
                    <option value="English">English</option>
                    <option value="Arabic (العربية)">Arabic (العربية)</option>
                    <option value="Hindi (हिन्दी)">Hindi</option>
                  </select>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateVoice}
                disabled={isProcessing}
                className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isProcessing
                    ? 'bg-indigo-600/50 text-indigo-200 cursor-wait'
                    : 'bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white shadow-indigo-600/30'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{processingStage || 'Designing Voice...'}</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate New Voice Profile & Test Audio</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: CLONE FROM VIDEO */}
          {tab === 'video' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-pink-400" />
                  <span>Extract & Clone Voice from Video</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Upload a video or record directly from your camera where you speak anything. AI will extract your vocal traits!
                </p>
              </div>

              {/* Video upload and webcam toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Upload MP4/WebM video */}
                <label className="p-4 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 hover:bg-slate-950 cursor-pointer flex flex-col items-center justify-center text-center transition-all group">
                  <Upload className="w-7 h-7 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">Upload Video File</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">MP4, WebM, MOV with your speech</span>
                  {videoFileName && (
                    <span className="mt-2 text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <Check className="w-3 h-3" /> {videoFileName}
                    </span>
                  )}
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>

                {/* Live Webcam & Mic Recording */}
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 flex flex-col items-center justify-center text-center">
                  <video
                    ref={webcamVideoRef}
                    muted
                    playsInline
                    className={`w-full h-24 object-cover rounded-xl bg-black mb-2 ${
                      isRecordingWebcam ? 'block' : 'hidden'
                    }`}
                  />

                  {!isRecordingWebcam ? (
                    <>
                      <Camera className="w-7 h-7 text-pink-400 mb-2" />
                      <button
                        onClick={startWebcamRecording}
                        className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Record With Camera (Speak)</span>
                      </button>
                      <span className="text-[10px] text-slate-400 mt-1">Direct webcam & microphone</span>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                        <span>Recording Video... {webcamSecs}s / 30s</span>
                      </div>
                      <button
                        onClick={stopWebcamRecording}
                        className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop & Extract Voice</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isExtractingVideoAudio && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Extracting spoken vocal track from video...</span>
                </div>
              )}

              {videoAudioBase64 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Voice extracted from video! Ready to clone.</span>
                  </div>
                  <button
                    onClick={handleCloneVoice}
                    disabled={isProcessing}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    Clone My Voice
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUDIO UPLOAD */}
          {tab === 'upload' && (
            <div className="space-y-4">
              <label className="p-6 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 hover:bg-slate-950 cursor-pointer flex flex-col items-center justify-center text-center transition-all group">
                <Upload className="w-8 h-8 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white">Upload Audio Reference</span>
                <span className="text-[11px] text-slate-400 mt-0.5">MP3, WAV, AAC, M4A with clear speech</span>
                {uploadedFileName && (
                  <span className="mt-2 text-xs text-emerald-400 font-mono flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {uploadedFileName}
                  </span>
                )}
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
              </label>

              {uploadedAudioBase64 && (
                <button
                  onClick={handleCloneVoice}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Clone Vocal Acoustic Profile</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 4: DIRECT MIC RECORDING */}
          {tab === 'record' && (
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Mic className={`w-8 h-8 ${isRecording ? 'text-rose-500 animate-pulse' : ''}`} />
              </div>

              {!isRecording ? (
                <div>
                  <button
                    onClick={startRecording}
                    className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-transform active:scale-95"
                  >
                    Start Microphone Recording
                  </button>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Read or speak naturally in Urdu or English for 10-20 seconds
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-rose-400 font-mono text-sm font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span>Listening... {recordingSeconds}s / 40s</span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 mx-auto"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop Recording</span>
                  </button>
                </div>
              )}

              {recordedAudioBase64 && !isRecording && (
                <button
                  onClick={handleCloneVoice}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 mt-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Clone Vocal Acoustic Profile</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 5: DEMO SAMPLES */}
          {tab === 'samples' && (
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-slate-400">
                Pick a reference voice demo to clone:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {CREATIVE_VOICE_IDEAS.slice(0, 3).map((idea, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setGeneratorPrompt(idea.prompt);
                      setGeneratorName(idea.name);
                      setGeneratorGender(idea.gender);
                      setTab('generator');
                      handleGenerateVoice();
                    }}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-indigo-500 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <span className="text-xs font-bold text-white group-hover:text-indigo-300">
                        {idea.name.split(' ')[0]}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{idea.timbre}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* GENERATED / CLONED PROFILE RESULT CARD */}
          {activeProfile && (
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/50 shadow-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${activeProfile.avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-md`}
                  >
                    {activeProfile.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{activeProfile.name}</h4>
                      {activeProfile.nativeName && (
                        <span className="text-xs font-nastaliq text-purple-200">
                          {activeProfile.nativeName}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        READY
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 capitalize">
                      {activeProfile.gender} • {activeProfile.baseVoice} Base • {activeProfile.timbreDescription}
                    </span>
                  </div>
                </div>

                {activeProfile.previewAudioBase64 && (
                  <button
                    onClick={togglePlayPreview}
                    className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-transform active:scale-95"
                    title="Play Vocal Sample"
                  >
                    {isPlayingPreview ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Vocal Traits Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeProfile.vocalTraits?.map((trait, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-900 text-slate-300 border border-slate-700"
                  >
                    {trait}
                  </span>
                ))}
              </div>

              {/* Save & Use Button */}
              <button
                onClick={handleSaveAndUse}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
              >
                <Check className="w-4 h-4" />
                <span>Save to Unlimited Voice Library & Use Now</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
