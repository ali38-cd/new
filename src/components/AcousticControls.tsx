import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Smile,
  Flame,
  Feather,
  Radio,
  Heart,
  Wind,
  BookOpen,
  Gauge,
  Volume2,
  Globe,
  Settings2,
  Wand2,
} from 'lucide-react';
import { EMOTION_PRESETS, SUPPORTED_LANGUAGES } from '../constants/voicesAndPresets';

interface AcousticControlsProps {
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  selectedEmotion: string;
  onSelectEmotion: (emotion: string) => void;
  customEmotion: string;
  onCustomEmotionChange: (val: string) => void;
  pitch: number;
  onPitchChange: (val: number) => void;
  speed: number;
  onSpeedChange: (val: number) => void;
  modelQuality: 'studio' | 'fast';
  onModelQualityChange: (quality: 'studio' | 'fast') => void;
}

export const AcousticControls: React.FC<AcousticControlsProps> = ({
  selectedLanguage,
  onSelectLanguage,
  selectedEmotion,
  onSelectEmotion,
  customEmotion,
  onCustomEmotionChange,
  pitch,
  onPitchChange,
  speed,
  onSpeedChange,
  modelQuality,
  onModelQualityChange,
}) => {
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const getEmotionIcon = (iconName: string) => {
    switch (iconName) {
      case 'Smile': return <Smile className="w-3.5 h-3.5" />;
      case 'Flame': return <Flame className="w-3.5 h-3.5" />;
      case 'Feather': return <Feather className="w-3.5 h-3.5" />;
      case 'Radio': return <Radio className="w-3.5 h-3.5" />;
      case 'Heart': return <Heart className="w-3.5 h-3.5" />;
      case 'Wind': return <Wind className="w-3.5 h-3.5" />;
      case 'BookOpen': return <BookOpen className="w-3.5 h-3.5" />;
      default: return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  const getPitchLabel = (p: number) => {
    if (p <= -8) return 'Deep Sub-Bass';
    if (p <= -4) return 'Resonant Baritone';
    if (p < 0) return 'Warm Low';
    if (p === 0) return 'Standard Baseline';
    if (p <= 4) return 'Bright Tenor';
    if (p <= 8) return 'High Mezzo';
    return 'Luminous Soprano';
  };

  return (
    <div className="space-y-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80">
      {/* Top Header & Language Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Acoustic & Emotion Matrix</h3>
          <span className="text-[11px] font-mono text-slate-400 font-nastaliq">آواز اور جذبات کی ترتیبات</span>
        </div>

        {/* Language selector & Quality toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <Globe className="w-3.5 h-3.5 text-indigo-400 ml-1.5" />
            <select
              value={selectedLanguage}
              onChange={(e) => onSelectLanguage(e.target.value)}
              className="bg-transparent text-xs text-white pr-2 py-0.5 focus:outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.name} className="bg-slate-900 text-white">
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>

          <div className="flex rounded-xl bg-slate-950 p-0.5 border border-slate-800 text-[10px] font-mono">
            <button
              onClick={() => onModelQualityChange('studio')}
              className={`px-2 py-1 rounded-lg transition-all ${
                modelQuality === 'studio'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Gemini 3.8 Flash TTS: Voice Design & Nuanced Prosody"
            >
              Studio TTS
            </button>
            <button
              onClick={() => onModelQualityChange('fast')}
              className={`px-2 py-1 rounded-lg transition-all ${
                modelQuality === 'fast'
                  ? 'bg-slate-700 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Gemini 3.8 Flash Lite TTS: High Speed"
            >
              Lite Fast
            </button>
          </div>
        </div>
      </div>

      {/* Emotion Presets Grid */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Vocal Emotion & Delivery Tone:
          </span>
          <button
            onClick={() => setIsCustomOpen(!isCustomOpen)}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline"
          >
            <Wand2 className="w-3 h-3" />
            {isCustomOpen ? 'Hide Custom Prompt' : 'Custom Emotion Prompt'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {EMOTION_PRESETS.map((preset) => {
            const isSelected = selectedEmotion === preset.id && !customEmotion;

            return (
              <button
                key={preset.id}
                onClick={() => {
                  onSelectEmotion(preset.id);
                  onCustomEmotionChange('');
                }}
                className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500/40'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={`p-1 rounded-lg ${isSelected ? 'text-indigo-300 bg-indigo-500/20' : 'text-slate-400'}`}>
                    {getEmotionIcon(preset.icon)}
                  </span>
                  <span className="text-[10px] font-nastaliq text-slate-400">
                    {preset.urduLabel}
                  </span>
                </div>
                <div className="text-xs font-semibold block truncate">
                  {preset.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Optional Custom Emotion Directives */}
        {isCustomOpen && (
          <div className="pt-2 animate-in fade-in duration-150">
            <label className="block text-[11px] font-mono text-indigo-300 mb-1">
              Custom Nuance / Atmosphere Directive:
            </label>
            <input
              type="text"
              value={customEmotion}
              onChange={(e) => onCustomEmotionChange(e.target.value)}
              placeholder="e.g. Poetic Urdu Sufi kalam with gentle warmth and contemplative pauses..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-indigo-500/40 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
            />
          </div>
        )}
      </div>

      {/* Pitch and Speed Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Pitch Control */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Pitch Modulation:
            </span>
            <span className="font-mono text-indigo-300 font-bold text-[11px]">
              {pitch > 0 ? `+${pitch}` : pitch} semitones ({getPitchLabel(pitch)})
            </span>
          </div>

          <input
            type="range"
            min={-12}
            max={12}
            step={1}
            value={pitch}
            onChange={(e) => onPitchChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-12 (Deep Bass)</span>
            <button
              onClick={() => onPitchChange(0)}
              className="text-slate-400 hover:text-indigo-300 underline"
            >
              Reset (0)
            </button>
            <span>+12 (Soprano)</span>
          </div>
        </div>

        {/* Speed / Cadence Control */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-purple-400" /> Speed & Cadence:
            </span>
            <span className="font-mono text-purple-300 font-bold text-[11px]">
              {speed.toFixed(2)}x {speed === 1.0 ? '(Normal)' : speed < 1.0 ? '(Deliberate)' : '(Brisk)'}
            </span>
          </div>

          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.05}
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.5x (Slow)</span>
            <div className="flex gap-1.5">
              {[0.75, 1.0, 1.25, 1.5].map((s) => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={`hover:text-purple-300 ${speed === s ? 'text-purple-400 font-bold' : 'text-slate-400'}`}
                >
                  {s}x
                </button>
              ))}
            </div>
            <span>2.0x (Fast)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
