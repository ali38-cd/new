import React, { useRef, useMemo } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  Sparkles,
  Layers,
  Clock,
  BookOpen,
  AlignRight,
  AlignLeft,
  ChevronDown,
} from 'lucide-react';
import { SAMPLE_TEXT_PRESETS } from '../constants/voicesAndPresets';

interface TextEditorProps {
  text: string;
  onChange: (val: string) => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  text,
  onChange,
  selectedLanguage,
  onSelectLanguage,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-detect Urdu / Arabic script
  const isRtl = useMemo(() => {
    if (!text) return selectedLanguage.toLowerCase().includes('urdu') || selectedLanguage.toLowerCase().includes('arabic');
    const rtlChars = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return rtlChars.test(text);
  }, [text, selectedLanguage]);

  // Statistics for "No Limits" indicator
  const stats = useMemo(() => {
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    // Average speech rate is ~130 words per minute
    const estimatedMinutes = words / 130;
    const estSec = Math.round(estimatedMinutes * 60);
    const estM = Math.floor(estSec / 60);
    const estS = estSec % 60;
    const estTimeStr = `${estM}m ${estS}s`;

    // Adaptive chunk count matching server (chunks up to 480 chars to ensure zero output cutoffs)
    const chunks = Math.max(1, Math.ceil(chars / 480));

    return { chars, words, estTimeStr, chunks };
  }, [text]);

  const insertTag = (tag: string) => {
    if (!textareaRef.current) {
      onChange(text + ' ' + tag + ' ');
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newText = text.substring(0, start) + ' ' + tag + ' ' + text.substring(end);
    onChange(newText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = start + tag.length + 2;
        textareaRef.current.selectionEnd = start + tag.length + 2;
      }
    }, 10);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handlePresetSelect = (preset: typeof SAMPLE_TEXT_PRESETS[0]) => {
    onChange(preset.text);
    if (preset.language === 'ur') {
      onSelectLanguage('Urdu (اردو)');
    } else if (preset.language === 'ar') {
      onSelectLanguage('Arabic (العربية)');
    } else if (preset.language === 'en') {
      onSelectLanguage('English');
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Editor Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Speech Script</h3>
          <span className="text-[11px] font-mono text-slate-400 font-nastaliq">متن و مکالمہ درج کریں</span>
        </div>

        {/* Action presets and tools */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sample Presets Dropdown */}
          <div className="relative group">
            <button className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Load Sample Script</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800 mb-1">
                Curated Scripts & Poetry
              </div>
              {SAMPLE_TEXT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetSelect(preset)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors flex flex-col"
                >
                  <span className="font-medium text-slate-200">{preset.title}</span>
                  <span className="text-[10px] text-slate-500">{preset.category}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Import Script File (.txt, .md) */}
          <label className="cursor-pointer px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Import File</span>
            <input
              type="file"
              accept=".txt,.md,.rtf,.srt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Clear text */}
          {text && (
            <button
              onClick={() => onChange('')}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Clear text"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expressive Burst Tags Inserter */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 px-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> Expressive Tags:
        </span>
        {[
          { label: '<breath>', desc: 'Natural intake' },
          { label: '<laugh>', desc: 'Vocal laughter' },
          { label: '<gasp>', desc: 'Surprise gasp' },
          { label: '|yeah|', desc: 'Backchannel' },
          { label: '|mhm|', desc: 'Agreement' },
          { label: '[pause 1s]', desc: 'Dramatic beat' },
        ].map((tag) => (
          <button
            key={tag.label}
            onClick={() => insertTag(tag.label)}
            className="px-2 py-0.5 rounded-lg text-[11px] font-mono bg-slate-800/80 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-slate-700/60 hover:border-indigo-500/50 transition-colors"
            title={`Insert ${tag.desc}`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          dir={isRtl ? 'rtl' : 'ltr'}
          rows={6}
          placeholder={
            isRtl
              ? 'یہاں اپنا اردو متن لکھیں یا پیسٹ کریں۔ بغیر کسی حد کے جتنا چاہیں طویل متن درج کریں...'
              : 'Enter any text in any language without limits. AuraVoice processes unlimited lengths with seamless acoustic stitching...'
          }
          className={`w-full p-4 rounded-2xl bg-slate-900/90 border border-slate-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 text-white placeholder:text-slate-500 focus:outline-none transition-all resize-y ${
            isRtl ? 'font-nastaliq text-base md:text-lg leading-[2.4]' : 'font-sans text-sm md:text-base leading-relaxed'
          }`}
        />

        {/* Direction Indicator */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-none">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-950/80 text-slate-400 border border-slate-800">
            {isRtl ? 'RTL • Urdu / Arabic' : 'LTR • Standard'}
          </span>
        </div>
      </div>

      {/* "No Limits" Stats & Stitching Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-3">
          <span>{stats.chars} Characters</span>
          <span>•</span>
          <span>{stats.words} Words</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-slate-300">
            <Clock className="w-3 h-3 text-indigo-400" /> Est. {stats.estTimeStr}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-indigo-300">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            {stats.chars <= 480
              ? 'Complete Story in 1 Continuous Session'
              : `${stats.chunks} Lossless Segments (Complete Full Story Guaranteed)`}
          </span>
        </div>
      </div>
    </div>
  );
};
