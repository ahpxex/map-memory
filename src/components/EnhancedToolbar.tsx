/**
 * Enhanced Toolbar with Mode and Scope Selection
 */

import { useState } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import {
  datasetAtom,
  interactionModeAtom,
  trainingModeAtom,
  scopeTypeAtom,
  scopeValueAtom,
  languageAtom,
  showLabelsAtom,
  trainingSettingsAtom,
  nextQuestionAtom,
  currentDatasetStatsAtom,
  trainingSessionAtom,
} from '../state/trainingAtoms'
import { useSetAtom } from 'jotai'
import { getModesForDataset } from '../features/training/modeConfigs'
import { getScopesForDataset, CONTINENT_OPTIONS } from '../features/training/scopeConfigs'
import type { Dataset, TrainingMode, ScopeType } from '../types/training'

// Icons
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
      <path d="M9 3v15" />
      <path d="M15 6v15" />
    </svg>
  )
}

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </svg>
  )
}

function GraduationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M7 7h.01M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    </svg>
  )
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

// Mode Selector Component
function ModeSelector({ 
  dataset, 
  currentMode, 
  onChange 
}: { 
  dataset: Dataset
  currentMode: TrainingMode
  onChange: (mode: TrainingMode) => void 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const modes = getModesForDataset(dataset)
  const currentConfig = modes.find(m => m.id === currentMode)
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200"
      >
        <TargetIcon className="h-3.5 w-3.5" />
        <span>{currentConfig?.label ?? '选择题型'}</span>
        {isOpen ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-xl border border-stone-200/60 bg-white/95 p-1 shadow-lg backdrop-blur-xl">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  onChange(mode.id as TrainingMode)
                  setIsOpen(false)
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                  currentMode === mode.id
                    ? 'bg-stone-800 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Scope Selector Component
function ScopeSelector({
  dataset,
  currentScope,
  scopeValue,
  onChange,
  onValueChange,
}: {
  dataset: Dataset
  currentScope: ScopeType
  scopeValue: string | null
  onChange: (scope: ScopeType) => void
  onValueChange: (value: string | null) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const scopes = getScopesForDataset(dataset)
  const currentConfig = scopes.find(s => s.id === currentScope)
  
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200"
        >
          <span>{currentConfig?.label ?? '全部'}</span>
          {isOpen ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
        </button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute bottom-full left-0 z-50 mb-2 w-40 rounded-xl border border-stone-200/60 bg-white/95 p-1 shadow-lg backdrop-blur-xl">
              {scopes.map((scope) => (
                <button
                  key={scope.id}
                  onClick={() => {
                    onChange(scope.id as ScopeType)
                    setIsOpen(false)
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                    currentScope === scope.id
                      ? 'bg-stone-800 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Scope Value Selector (e.g., Continent, Province) */}
      {currentConfig?.requiresValue && currentScope === 'continent' && (
        <select
          value={scopeValue ?? ''}
          onChange={(e) => onValueChange(e.target.value || null)}
          className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 outline-none hover:bg-stone-200"
        >
          <option value="">选择大洲</option>
          {CONTINENT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
  )
}

// Training Banner
function TrainingBanner() {
  const settings = useAtomValue(trainingSettingsAtom)
  const trainingSession = useAtomValue(trainingSessionAtom)
  const nextQuestion = useSetAtom(nextQuestionAtom)
  
  if (settings.interactionMode !== 'training') return null
  
  const promptContent = trainingSession?.prompt?.content ?? '准备中...'
  const hasAnswered = trainingSession?.userAnswer !== null
  
  return (
    <div className="pointer-events-auto mb-3 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 rounded-full border border-stone-200/60 bg-white/80 px-4 py-2 shadow-sm backdrop-blur-sm">
        <TargetIcon className="h-3.5 w-3.5 text-stone-400" />
        <span className="text-sm font-medium text-stone-700">
          {promptContent}
        </span>
      </div>
      
      {hasAnswered && (
        <button
          onClick={() => nextQuestion()}
          className="rounded-full bg-stone-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
        >
          下一题
        </button>
      )}
    </div>
  )
}

// Main Toolbar
export function EnhancedToolbar() {
  const [dataset, setDataset] = useAtom(datasetAtom)
  const [interactionMode, setInteractionMode] = useAtom(interactionModeAtom)
  const [trainingMode, setTrainingMode] = useAtom(trainingModeAtom)
  const [scopeType, setScopeType] = useAtom(scopeTypeAtom)
  const [scopeValue, setScopeValue] = useAtom(scopeValueAtom)
  const [language, setLanguage] = useAtom(languageAtom)
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom)
  const stats = useAtomValue(currentDatasetStatsAtom)
  
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center px-4 pb-6">
      {/* Training Banner */}
      {interactionMode === 'training' && <TrainingBanner />}
      
      {/* Main Toolbar */}
      <div className="pointer-events-auto">
        <div className="flex flex-col gap-2 rounded-2xl border border-stone-200/60 bg-white/80 px-2 py-2 shadow-lg backdrop-blur-xl">
          {/* Top Row - Main Controls */}
          <div className="flex items-center gap-1">
            {/* Dataset */}
            <button
              onClick={() => setDataset('world')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                dataset === 'world'
                  ? 'bg-stone-800 text-white'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <GlobeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDataset('china')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                dataset === 'china'
                  ? 'bg-stone-800 text-white'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <MapIcon className="h-4 w-4" />
            </button>

            <div className="mx-1 h-4 w-px bg-stone-200" />

            {/* Mode */}
            <button
              onClick={() => setInteractionMode('explore')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                interactionMode === 'explore'
                  ? 'bg-stone-100 text-stone-800'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <CompassIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setInteractionMode('training')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                interactionMode === 'training'
                  ? 'bg-stone-800 text-white'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <GraduationIcon className="h-4 w-4" />
            </button>

            <div className="mx-1 h-4 w-px bg-stone-200" />

            {/* Labels */}
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                showLabels
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <TagIcon className="h-4 w-4" />
            </button>

            {/* Language */}
            <button
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="flex h-8 items-center justify-center rounded-full px-2.5 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
            >
              {language === 'zh' ? '中' : 'EN'}
            </button>

            <div className="mx-1 h-4 w-px bg-stone-200" />

            {/* Stats */}
            <div className="flex items-center gap-3 px-2 text-xs text-stone-500">
              <span>{stats.practicedRegions}/{stats.totalRegions}</span>
              <span className="text-stone-300">·</span>
              <span>{stats.accuracy}%</span>
            </div>

            <div className="mx-1 h-4 w-px bg-stone-200" />

            {/* Expand */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
            >
              {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
            </button>
          </div>
          
          {/* Expanded Row - Mode & Scope Selection */}
          {expanded && (
            <div className="flex flex-wrap items-center gap-2 border-t border-stone-200/60 pt-2">
              <span className="text-xs text-stone-400">题型:</span>
              <ModeSelector
                dataset={dataset}
                currentMode={trainingMode}
                onChange={setTrainingMode}
              />
              
              <span className="ml-2 text-xs text-stone-400">范围:</span>
              <ScopeSelector
                dataset={dataset}
                currentScope={scopeType}
                scopeValue={scopeValue}
                onChange={setScopeType}
                onValueChange={setScopeValue}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
