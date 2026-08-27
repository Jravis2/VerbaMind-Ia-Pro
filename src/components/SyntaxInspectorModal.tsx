import React from 'react';
import { X, Sparkles, BookOpen, AlertCircle, ArrowRight, Layers, CheckCircle2, SplitSquareVertical } from 'lucide-react';
import { SyntaxAnalysisResponse } from '../types';

interface SyntaxInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: SyntaxAnalysisResponse | null;
  isLoading: boolean;
  sourceText: string;
  targetText: string;
  sourceLangName: string;
  targetLangName: string;
}

export const SyntaxInspectorModal: React.FC<SyntaxInspectorModalProps> = ({
  isOpen,
  onClose,
  analysis,
  isLoading,
  sourceText,
  targetText,
  sourceLangName,
  targetLangName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#0b1329] border border-indigo-500/30 rounded-2xl shadow-2xl shadow-indigo-950/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/80 bg-[#0e1938]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Inspecteur Syntaxique & Philologique</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                  Analyse IA Approfondie
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Décomposition de la structure grammaticale, intention, corrections et nuances stylistiques.
              </p>
            </div>
          </div>
          <button
            id="btn-close-syntax-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#0e1836] border border-slate-700/60">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                <span>Source ({sourceLangName})</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Brut</span>
              </div>
              <p className="text-sm text-slate-200 font-medium whitespace-pre-wrap">{sourceText}</p>
            </div>

            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40">
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1 flex items-center justify-between">
                <span>Traduction & Restructuration ({targetLangName})</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Corrigé & Fluidifié
                </span>
              </div>
              <p className="text-sm text-indigo-100 font-medium whitespace-pre-wrap">{targetText}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-indigo-200">Analyse linguistique et cartographie syntaxique en cours...</p>
            </div>
          ) : analysis ? (
            <>
              {/* Intent & Register */}
              <div className="p-4 rounded-xl bg-[#0f1d40] border border-indigo-500/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Compréhension de l&apos;Intention & Registre</span>
                </div>
                <p className="text-sm text-slate-200">
                  <span className="font-medium text-white">Intention détectée : </span>
                  {analysis.sourceAnalysis.intent}
                </p>
                <div className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700">
                  <span>Registre :</span>
                  <span className="font-semibold text-indigo-300">{analysis.sourceAnalysis.register}</span>
                </div>
              </div>

              {/* Identified errors & fixes */}
              {analysis.sourceAnalysis.identifiedErrors && analysis.sourceAnalysis.identifiedErrors.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>Corrections Grammaticales & Restructuration Appliquées</span>
                  </div>
                  <div className="space-y-2">
                    {analysis.sourceAnalysis.identifiedErrors.map((err, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="line-through text-red-400 font-mono bg-red-950/40 px-1.5 py-0.5 rounded">
                            {err.original}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-emerald-300 font-mono bg-emerald-950/40 px-1.5 py-0.5 rounded font-semibold">
                            {err.corrected}
                          </span>
                        </div>
                        <p className="text-slate-300 pt-1">{err.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Target Syntax & Nuance */}
              <div className="p-4 rounded-xl bg-[#0f1d40] border border-indigo-500/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Structure Syntaxique dans la Langue Cible</span>
                </div>
                <p className="text-xs text-slate-300">{analysis.targetAnalysis.syntaxStructure}</p>
                {analysis.targetAnalysis.stylisticNotes && (
                  <p className="text-xs text-indigo-200 italic border-l-2 border-indigo-400 pl-2.5">
                    {analysis.targetAnalysis.stylisticNotes}
                  </p>
                )}
              </div>

              {/* Key Vocabulary & Nuance */}
              {analysis.targetAnalysis.keyVocabulary && analysis.targetAnalysis.keyVocabulary.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Vocabulaire Clé & Précision Sémantique</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {analysis.targetAnalysis.keyVocabulary.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-[#0e1836] border border-slate-700/60 text-xs">
                        <div className="font-semibold text-white flex items-center justify-between">
                          <span>{item.source}</span>
                          <span className="text-indigo-400 font-mono">→ {item.target}</span>
                        </div>
                        <p className="text-slate-400 mt-1 text-[11px]">{item.nuance}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative phrasings */}
              {analysis.alternativePhrasings && analysis.alternativePhrasings.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <SplitSquareVertical className="w-4 h-4 text-indigo-400" />
                    <span>Formulations Alternatives & Variantes Stylistiques</span>
                  </div>
                  <div className="space-y-2">
                    {analysis.alternativePhrasings.map((alt, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-[#0d1630] border border-indigo-500/20 text-xs">
                        <div className="text-indigo-200 font-medium">{alt.text}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{alt.nuance}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              Aucune donnée d&apos;analyse disponible.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#080e21] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/30"
          >
            Fermer l&apos;Inspecteur
          </button>
        </div>
      </div>
    </div>
  );
};
