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
    <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 theme-card rounded-2xl">
      <div className="flex items-center gap-2 px-2 text-xs font-semibold theme-text-muted shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
        <span>Style & Tonalité :</span>
      </div>

      <div className="grid grid-cols-2 xs:grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 w-full sm:w-auto">
        {TONE_OPTIONS.map((tone) => {
          const Icon = getIcon(tone.id);
          const isSelected = currentTone === tone.id;
          return (
            <button
              key={tone.id}
              id={`btn-tone-${tone.id}`}
              onClick={() => onChangeTone(tone.id)}
              title={tone.description}
              className={`group relative flex items-center justify-center sm:justify-start gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                isSelected
                  ? 'theme-accent-btn shadow-md ring-1 ring-white/20'
                  : 'theme-card-subtle theme-text-muted hover:theme-text-primary border'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'theme-text-muted group-hover:text-indigo-300'}`} />
              <span className="truncate">{tone.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
