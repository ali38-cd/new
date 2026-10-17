import React, { useState } from 'react';
import {
  Mic,
  User,
  Sparkles,
  Trash2,
  Volume2,
  Check,
  Plus,
  Globe,
  Radio,
  Flame,
} from 'lucide-react';
import { VoiceProfile } from '../types/tts';

interface VoiceSelectorProps {
  profiles: VoiceProfile[];
  selectedProfileId: string;
  onSelectProfile: (profile: VoiceProfile) => void;
  onOpenClonerModal: () => void;
  onDeleteClonedProfile: (profileId: string) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onOpenClonerModal,
  onDeleteClonedProfile,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'urdu' | 'global' | 'cloned'>('all');

  const urduProfiles = profiles.filter((p) => p.id.startsWith('urdu-'));
  const globalProfiles = profiles.filter((p) => p.id.startsWith('global-'));
  const clonedProfiles = profiles.filter((p) => p.isCloned);

  const displayedProfiles =
    filterTab === 'urdu'
      ? urduProfiles
      : filterTab === 'global'
      ? globalProfiles
      : filterTab === 'cloned'
      ? clonedProfiles
      : profiles;

  return (
    <div className="space-y-3">
      {/* Header and Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Voice Personas & Clones</h3>
          <span className="text-[11px] font-mono text-slate-400 font-nastaliq">آوازوں کا انتخاب</span>
        </div>

        {/* Filter Pills */}
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
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              filterTab === 'urdu'
                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Urdu (اردو)</span>
          </button>
          <button
            onClick={() => setFilterTab('global')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterTab === 'global'
                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Global Studio
          </button>
          <button
            onClick={() => setFilterTab('cloned')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              filterTab === 'cloned'
                ? 'bg-amber-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Cloned</span>
            {clonedProfiles.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-400 text-slate-950 font-bold">
                {clonedProfiles.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Voice Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {/* Clone Voice CTA Card */}
        <button
          onClick={onOpenClonerModal}
          className="p-3.5 rounded-2xl border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 bg-indigo-950/20 hover:bg-indigo-950/40 text-left transition-all group flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
              VOICE CLONER
            </span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
              <span>Clone Any Voice</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Record or upload audio to clone vocal identity and synthesis profile
            </p>
          </div>
        </button>

        {/* List of Voices */}
        {displayedProfiles.map((profile) => {
          const isSelected = profile.id === selectedProfileId;

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
                        {profile.isCloned ? (
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
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    {profile.isCloned && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete cloned profile "${profile.name}"?`)) {
                            onDeleteClonedProfile(profile.id);
                          }
                        }}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Cloned Voice"
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
