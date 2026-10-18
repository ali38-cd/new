import React, { useState, useRef } from 'react';
import {
  Mic,
  User,
  Sparkles,
  Trash2,
  Volume2,
  Check,
  Plus,
  Wand2,
  Play,
  Pause,
  Video,
} from 'lucide-react';
import { VoiceProfile } from '../types/tts';

interface VoiceSelectorProps {
  profiles: VoiceProfile[];
  selectedProfileId: string;
  onSelectProfile: (profile: VoiceProfile) => void;
  onOpenClonerModal: (defaultTab?: 'generator' | 'video' | 'record' | 'upload' | 'samples') => void;
  onDeleteClonedProfile: (profileId: string) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onOpenClonerModal,
  onDeleteClonedProfile,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'urdu' | 'custom' | 'global'>('all');
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const audioSampleRef = useRef<HTMLAudioElement | null>(null);

  const urduProfiles = profiles.filter((p) => p.id.startsWith('urdu-') || p.tags.includes('Urdu Native'));
  const globalProfiles = profiles.filter((p) => p.id.startsWith('global-'));
  const customProfiles = profiles.filter((p) => p.isCloned || p.isAiGenerated);

  const displayedProfiles =
    filterTab === 'urdu'
      ? urduProfiles
      : filterTab === 'global'
      ? globalProfiles
      : filterTab === 'custom'
      ? customProfiles
      : profiles;

  const togglePlaySample = (e: React.MouseEvent, profile: VoiceProfile) => {
    e.stopPropagation();
    if (!profile.previewAudioBase64) return;

    if (playingSampleId === profile.id) {
      audioSampleRef.current?.pause();
      setPlayingSampleId(null);
    } else {
      if (audioSampleRef.current) {
        audioSampleRef.current.pause();
      }
      audioSampleRef.current = new Audio(`data:audio/wav;base64,${profile.previewAudioBase64}`);
      audioSampleRef.current.onended = () => setPlayingSampleId(null);
      audioSampleRef.current.play().then(() => setPlayingSampleId(profile.id)).catch(() => {});
    }
  };

  return (
    <div className="space-y-3">
      {/* Header and Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Voice Library ({profiles.length})
          </h3>
          <span className="text-[11px] font-mono text-slate-400 font-nastaliq">لامحدود آوازیں</span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[11px]">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterTab === 'all'
                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({profiles.length})
          </button>
          <button
            onClick={() => setFilterTab('urdu')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterTab === 'urdu'
                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Urdu (اردو)
          </button>
          <button
            onClick={() => setFilterTab('custom')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              filterTab === 'custom'
                ? 'bg-amber-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Custom / Cloned</span>
            {customProfiles.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-400 text-slate-950 font-bold">
                {customProfiles.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterTab('global')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterTab === 'global'
                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Global
          </button>
        </div>
      </div>

      {/* Action Bar: Generate Unlimited Voice or Clone Voice */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Generate Unlimited Voice CTA */}
        <button
          onClick={() => onOpenClonerModal('generator')}
          className="p-3 rounded-2xl border border-indigo-500/40 hover:border-indigo-400 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 hover:from-indigo-950/60 text-left transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Wand2 className="w-4 h-4 text-amber-200" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1">
                <span>Generate Unlimited Voice</span>
                <Sparkles className="w-3 h-3 text-amber-400" />
              </h4>
              <p className="text-[10px] text-slate-400">Design any voice with prompt or traits</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
            AI FORGE
          </span>
        </button>

        {/* Clone Voice CTA */}
        <button
          onClick={() => onOpenClonerModal('video')}
          className="p-3 rounded-2xl border border-pink-500/40 hover:border-pink-400 bg-gradient-to-r from-pink-950/30 via-purple-950/30 to-slate-900 hover:from-pink-950/50 text-left transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Video className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors flex items-center gap-1">
                <span>Clone Voice from Video / Audio</span>
                <Mic className="w-3 h-3 text-pink-400" />
              </h4>
              <p className="text-[10px] text-slate-400">Speak or upload video to clone yourself</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase">
            CLONE
          </span>
        </button>
      </div>

      {/* Voice Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
        {displayedProfiles.map((profile) => {
          const isSelected = profile.id === selectedProfileId;
          const isPlayingSample = playingSampleId === profile.id;

          return (
            <div
              key={profile.id}
              onClick={() => onSelectProfile(profile)}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all relative flex flex-col justify-between group ${
                isSelected
                  ? 'bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${profile.avatarColor} flex items-center justify-center text-white font-bold text-xs shadow-md`}
                    >
                      {profile.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {profile.name}
                        </span>
                        {profile.isAiGenerated ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            AI
                          </span>
                        ) : profile.isCloned ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            CLONED
                          </span>
                        ) : profile.nativeName ? (
                          <span className="text-[11px] font-nastaliq text-indigo-300 font-medium">
                            {profile.nativeName}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono capitalize">
                        {profile.gender} • {profile.baseVoice} Base
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {profile.previewAudioBase64 && (
                      <button
                        onClick={(e) => togglePlaySample(e, profile)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isPlayingSample
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Play Voice Preview"
                      >
                        {isPlayingSample ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </button>
                    )}

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3" />
                      </div>
                    )}

                    {(profile.isCloned || profile.isAiGenerated) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete voice "${profile.name}"?`)) {
                            onDeleteClonedProfile(profile.id);
                          }
                        }}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Custom Voice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                  {profile.description || profile.timbreDescription}
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-auto pt-1 border-t border-slate-800/60">
                {profile.tags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800/80 text-slate-300 border border-slate-700/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
