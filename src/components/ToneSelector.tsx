import React from 'react';
import { Sparkles, Target, Briefcase, GraduationCap, CheckCircle2 } from 'lucide-react';
import { ToneStyle } from '../types';
import { TONE_OPTIONS } from '../data/languages';

interface ToneSelectorProps {
  currentTone: ToneStyle;
  onChangeTone: (tone: ToneStyle) => void;
}

export const ToneSelector: React.FC<ToneSelectorProps> = ({ currentTone, onChangeTone }) => {
  const getIcon = (id: ToneStyle) => {
    switch (id) {
      case 'natural':
        return Sparkles;
      case 'literal':
        return Target;
      case 'formal':
        return Briefcase;
      case 'academic':
        return GraduationCap;
      case 'simplified':
        return CheckCircle2;
      default:
        return Sparkles;
    }
  };

  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-[#0c152e]/80 border border-indigo-500/20 rounded-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-300">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
        <span>Style & Tonalité :</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {TONE_OPTIONS.map((tone) => {
          const Icon = getIcon(tone.id);
          const isSelected = currentTone === tone.id;
          return (
            <button
              key={tone.id}
              id={`btn-tone-${tone.id}`}
              onClick={() => onChangeTone(tone.id)}
              title={tone.description}
              className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                isSelected
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/50'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400 group-hover:text-indigo-300'}`} />
              <span className="whitespace-nowrap">{tone.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
