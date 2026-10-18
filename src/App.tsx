import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  Mic,
  Volume2,
  Layers,
  Globe,
  Sliders,
  Play,
  RotateCw,
  AlertCircle,
  HelpCircle,
  Radio,
  Music,
  CheckCircle2,
  Loader2,
  Film,
  Video,
} from 'lucide-react';

import { VoiceProfile, GenerationHistoryItem } from './types/tts';
import { BUILTIN_VOICE_PROFILES, EMOTION_PRESETS, SAMPLE_TEXT_PRESETS } from './constants/voicesAndPresets';
import { TextEditor } from './components/TextEditor';
import { VoiceSelector } from './components/VoiceSelector';
import { AcousticControls } from './components/AcousticControls';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { VoiceClonerModal } from './components/VoiceClonerModal';
import { GenerationHistory } from './components/GenerationHistory';
import { VideoVoiceStudio } from './components/VideoVoiceStudio';

const LOCAL_STORAGE_CLONES_KEY = 'auravoice_cloned_profiles_v1';
const LOCAL_STORAGE_HISTORY_KEY = 'auravoice_history_v1';

export default function App() {
  // Profiles state
  const [profiles, setProfiles] = useState<VoiceProfile[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CLONES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return [...BUILTIN_VOICE_PROFILES, ...parsed];
      }
    } catch (e) {
      console.warn('Failed to load cloned voices from storage:', e);
    }
    return BUILTIN_VOICE_PROFILES;
  });

  const [selectedProfileId, setSelectedProfileId] = useState<string>('urdu-tariq');
  const [isClonerModalOpen, setIsClonerModalOpen] = useState(false);
  const [clonerDefaultTab, setClonerDefaultTab] = useState<'generator' | 'video' | 'record' | 'upload' | 'samples'>('generator');
  const [studioMode, setStudioMode] = useState<'tts' | 'video'>('tts');

  // Script & Language state
  const [text, setText] = useState<string>(SAMPLE_TEXT_PRESETS[0].text);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Urdu (اردو)');

  // Acoustic & Emotion state
  const [selectedEmotion, setSelectedEmotion] = useState<string>('natural');
  const [customEmotion, setCustomEmotion] = useState<string>('');
  const [pitch, setPitch] = useState<number>(0); // -12 to +12
  const [speed, setSpeed] = useState<number>(1.0); // 0.5 to 2.0
  const [modelQuality, setModelQuality] = useState<'studio' | 'fast'>('studio');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [activeAudioBase64, setActiveAudioBase64] = useState<string | null>(null);
  const [activeDuration, setActiveDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Vault history state
  const [history, setHistory] = useState<GenerationHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load history:', e);
    }
    return [];
  });

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }, [history]);

  // Current selected profile
  const currentProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];

  // Save a new cloned profile or AI-generated voice
  const handleSaveClonedProfile = (newProfile: VoiceProfile) => {
    const withoutExisting = profiles.filter((p) => p.id !== newProfile.id);
    const updatedProfiles = [newProfile, ...withoutExisting];
    setProfiles(updatedProfiles);
    setSelectedProfileId(newProfile.id);

    try {
      const existingClones = updatedProfiles.filter((p) => p.isCloned || p.isAiGenerated);
      localStorage.setItem(LOCAL_STORAGE_CLONES_KEY, JSON.stringify(existingClones));
    } catch (e) {
      console.warn('Failed to save clone to storage:', e);
    }

    if (newProfile.previewAudioBase64) {
      setActiveAudioBase64(newProfile.previewAudioBase64);
      setActiveDuration(5);
    }
  };

  // Delete a cloned profile
  const handleDeleteClonedProfile = (profileId: string) => {
    const remaining = profiles.filter((p) => p.id !== profileId);
    setProfiles(remaining);
    if (selectedProfileId === profileId) {
      setSelectedProfileId(BUILTIN_VOICE_PROFILES[0].id);
    }
    try {
      const remainingClones = remaining.filter((p) => p.isCloned);
      localStorage.setItem(LOCAL_STORAGE_CLONES_KEY, JSON.stringify(remainingClones));
    } catch (e) {
      console.warn('Storage error on delete:', e);
    }
  };

  // Execute TTS Speech Synthesis
  const handleGenerateSpeech = async () => {
    if (!text || !text.trim()) {
      setErrorMessage('Please enter or paste text to synthesize speech.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setGenerationProgress('Preparing script and acoustic parameters...');

    try {
      const effectiveEmotion = customEmotion.trim() || selectedEmotion;
      const isUrdu = selectedLanguage.toLowerCase().includes('urdu') || /[\u0600-\u06FF]/.test(text);

      setGenerationProgress(
        isUrdu
          ? 'اردو صوتیات اور جذبات کی تشکیل جاری ہے...'
          : 'Synthesizing voice acoustics and prosody...'
      );

      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language: selectedLanguage,
          voice: currentProfile.baseVoice,
          pitch,
          speed,
          emotion: effectiveEmotion,
          stylePrompt: currentProfile.steeringPrompt || '',
          voiceCloneProfile: currentProfile.isCloned ? currentProfile : null,
          modelQuality,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to synthesize speech.');
      }

      setActiveAudioBase64(data.audioBase64);
      setActiveDuration(data.durationSeconds || 0);

      // Add to vault history
      const historyItem: GenerationHistoryItem = {
        id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        text: text.slice(0, 160),
        language: selectedLanguage,
        voiceName: currentProfile.name,
        isClonedVoice: currentProfile.isCloned,
        emotion: effectiveEmotion,
        pitch,
        speed,
        durationSeconds: data.durationSeconds,
        audioBase64: data.audioBase64,
        mimeType: 'audio/wav',
        chunksCount: data.chunksCount || 1,
        timestamp: Date.now(),
      };

      setHistory((prev) => [historyItem, ...prev]);
    } catch (err: any) {
      console.warn('Speech generation note:', err);
      setErrorMessage(err.message || 'Speech generation encountered an issue. Please try again.');
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500/30">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  AuraVoice AI
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-mono">
                  Unlimited TTS
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-nastaliq bg-purple-500/20 text-purple-200 border border-purple-500/30">
                  اردو اور تمام زبانیں
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Multilingual Speech Synthesis • Unlimited Chunks • Vocal Cloner & Acoustic Matrix
              </p>
            </div>
          </div>

          {/* Top Center Studio Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-inner">
            <button
              onClick={() => setStudioMode('tts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                studioMode === 'tts'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Story Studio</span>
            </button>
            <button
              onClick={() => setStudioMode('video')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                studioMode === 'video'
                  ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-pink-400" />
              <span>Video Voice Aligner</span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[9px] bg-pink-500/20 text-pink-300 font-mono">
                VISION AI
              </span>
            </button>
          </div>

          {/* Top Right Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                setClonerDefaultTab('generator');
                setIsClonerModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-pink-600 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-pink-600/20 transition-all transform active:scale-95"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-200" />
              <span>Unlimited Voices</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Error notification */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-white underline text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {studioMode === 'video' ? (
          <VideoVoiceStudio
            currentProfile={currentProfile}
            selectedLanguage={selectedLanguage}
            onSelectLanguage={setSelectedLanguage}
            onAudioSynthesized={(b64, dur) => {
              setActiveAudioBase64(b64);
              setActiveDuration(dur);
            }}
            onSaveClonedProfile={handleSaveClonedProfile}
            onOpenVoiceForge={() => {
              setClonerDefaultTab('generator');
              setIsClonerModalOpen(true);
            }}
          />
        ) : (
          <>
            {/* Top Floating Player Bar */}
            <AudioPlayerBar
              audioBase64={activeAudioBase64}
              durationSeconds={activeDuration}
              voiceName={currentProfile.name}
              emotion={customEmotion || selectedEmotion}
              language={selectedLanguage}
              pitch={pitch}
              onPitchChange={setPitch}
              speed={speed}
              onSpeedChange={setSpeed}
              isGenerating={isGenerating}
            />

            {/* Studio Grid: Left Pane (Script Editor) & Right Pane (Controls & Voices) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Script Editor & History (7 cols on large screens) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-5 rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm space-y-5 shadow-xl">
              <TextEditor
                text={text}
                onChange={setText}
                selectedLanguage={selectedLanguage}
                onSelectLanguage={setSelectedLanguage}
              />

              {/* Generate Speech Main Action Button */}
              <button
                onClick={handleGenerateSpeech}
                disabled={isGenerating || !text.trim()}
                className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl ${
                  isGenerating
                    ? 'bg-indigo-600/60 text-indigo-200 cursor-wait'
                    : text.trim()
                    ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-600 hover:to-pink-700 text-white shadow-indigo-600/30 transform active:scale-[0.99]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>{generationProgress || 'Synthesizing Audio...'}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" />
                    <span>Generate Natural Speech Audio</span>
                    <span className="text-xs opacity-80 font-nastaliq mr-1">(آواز تیار کریں)</span>
                  </>
                )}
              </button>
            </div>

            {/* Generation History Vault */}
            <GenerationHistory
              history={history}
              onSelectTrack={(item) => {
                setActiveAudioBase64(item.audioBase64);
                setActiveDuration(item.durationSeconds);
                setText(item.text);
                setSelectedLanguage(item.language);
              }}
              onClearHistory={() => setHistory([])}
              onDeleteTrack={(id) => setHistory((prev) => prev.filter((i) => i.id !== id))}
            />
          </div>

          {/* Right Column: Voice Personas & Acoustic Controls (5 cols on large screens) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Voice Personas & Clones */}
            <div className="p-5 rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm shadow-xl">
              <VoiceSelector
                profiles={profiles}
                selectedProfileId={selectedProfileId}
                onSelectProfile={(p) => setSelectedProfileId(p.id)}
                onOpenClonerModal={(tab) => {
                  setClonerDefaultTab(tab || 'generator');
                  setIsClonerModalOpen(true);
                }}
                onDeleteClonedProfile={handleDeleteClonedProfile}
              />
            </div>

            {/* Acoustic Matrix (Pitch, Speed, Emotion, Language) */}
            <AcousticControls
              selectedLanguage={selectedLanguage}
              onSelectLanguage={setSelectedLanguage}
              selectedEmotion={selectedEmotion}
              onSelectEmotion={setSelectedEmotion}
              customEmotion={customEmotion}
              onCustomEmotionChange={setCustomEmotion}
              pitch={pitch}
              onPitchChange={setPitch}
              speed={speed}
              onSpeedChange={setSpeed}
              modelQuality={modelQuality}
              onModelQualityChange={setModelQuality}
            />

            {/* Features Highlight Pill Card */}
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Unlimited Voices & Video Alignment Engine</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Generate unlimited AI voice personas with customized age, tone, and timbre, or upload any video where you speak anything to clone your voice and align your story.
              </p>
              </div>
            </div>
          </div>
        </>
      )}
      </main>

      {/* Voice Cloner & Unlimited Voice Forge Modal */}
      <VoiceClonerModal
        isOpen={isClonerModalOpen}
        onClose={() => setIsClonerModalOpen(false)}
        onSaveProfile={handleSaveClonedProfile}
        defaultTab={clonerDefaultTab}
      />
    </div>
  );
}
