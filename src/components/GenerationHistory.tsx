import React from 'react';
import {
  History,
  Play,
  Download,
  Trash2,
  Clock,
  Sparkles,
  Volume2,
  RotateCcw,
} from 'lucide-react';
import { GenerationHistoryItem } from '../types/tts';

interface GenerationHistoryProps {
  history: GenerationHistoryItem[];
  onSelectTrack: (item: GenerationHistoryItem) => void;
  onClearHistory: () => void;
  onDeleteTrack: (id: string) => void;
}

export const GenerationHistory: React.FC<GenerationHistoryProps> = ({
  history,
  onSelectTrack,
  onClearHistory,
  onDeleteTrack,
}) => {
  if (history.length === 0) return null;

  return (
    <div className="space-y-3 p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Studio Audio Vault</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {history.length} {history.length === 1 ? 'Track' : 'Tracks'}
          </span>
        </div>

        <button
          onClick={onClearHistory}
          className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear Vault</span>
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {history.map((item) => {
          const isUrdu = item.language.toLowerCase().includes('urdu') || /[\u0600-\u06FF]/.test(item.text);

          return (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3 group"
            >
              <div
                onClick={() => onSelectTrack(item)}
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 group-hover:bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs text-white truncate font-medium ${
                      isUrdu ? 'font-nastaliq leading-loose' : 'font-sans'
                    }`}
                    dir={isUrdu ? 'rtl' : 'ltr'}
                  >
                    {item.text}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                    <span className="text-indigo-300 font-semibold">{item.voiceName}</span>
                    <span>•</span>
                    <span>{item.language}</span>
                    <span>•</span>
                    <span>{item.durationSeconds}s</span>
                    {item.chunksCount > 1 && (
                      <>
                        <span>•</span>
                        <span className="text-purple-300">{item.chunksCount} Stitched Chunks</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`data:${item.mimeType};base64,${item.audioBase64}`}
                  download={`AuraVoice_${item.voiceName}_${item.timestamp}.wav`}
                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Download WAV"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={() => onDeleteTrack(item.id)}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
                  title="Remove from history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
