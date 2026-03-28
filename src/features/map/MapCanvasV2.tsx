/**
 * Map Canvas v2 - Updated for Training System v2
 */

import { useEffect, useRef, useState } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import * as echarts from 'echarts/core'
import { MapChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { MapSeriesOption } from 'echarts'
import {
  borderEmphasisAtom,
  colorIntensityAtom,
  datasetAtom,
  languageAtom,
  interactionModeAtom,
  showLabelsAtom,
  trainingSessionAtom,
  mapViewportResetTokenAtom,
  currentDatasetConfigAtom,
  submitAnswerAtom,
  currentSkillProgressMapAtom,
} from '../../state/trainingAtoms'
import type { AppLanguage, BorderEmphasis, ColorIntensity, RegionMeta, SkillProgress } from '../../types/training'
import { selectedRegionIdForExploreAtom } from '../../state/exploreAtoms'

echarts.use([CanvasRenderer, MapChart, TooltipComponent])

const registeredMaps = new Set<string>()

const chinaHoverPalette = [
  '#ec9f70', '#e27f8c', '#d9aa56', '#73b7d8', '#7fbe8e',
  '#b290ea', '#7ec4b4', '#d890c1', '#8aa6f1', '#ba9a72',
  '#78c9a2', '#f0b86b',
]

const worldHoverPaletteByContinent: Record<string, string> = {
  Asia: '#e8a96c',
  Europe: '#7ea7eb',
  Africa: '#7fbe8e',
  'North America': '#d796c5',
  'South America': '#cf9a6c',
  Oceania: '#91a5ef',
}

// Trackpad constants
const TRACKPAD_ZOOM_MIN = 0.92
const TRACKPAD_ZOOM_MAX = 1.12
const TRACKPAD_ZOOM_SENSITIVITY = 0.008
const TRACKPAD_PAN_SENSITIVITY = 1.2

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function ensureMapRegistered(mapKey: string, featureCollection: object) {
  if (registeredMaps.has(mapKey)) return
  echarts.registerMap(mapKey, featureCollection as never)
  registeredMaps.add(mapKey)
}

function getRegionLabel(region: RegionMeta, language: AppLanguage) {
  if (language === 'en') return region.nameEn
  if (language === 'mixed') return `${region.nameZh} / ${region.nameEn}`
  return region.nameZh
}

function defaultAreaColor(dataset: 'world' | 'china') {
  return dataset === 'world' ? '#d6dfcf' : '#d8d1c3'
}

function defaultBorderColor(dataset: 'world' | 'china') {
  return dataset === 'world' ? '#586357' : '#6b6157'
}

function getMaxZoom(dataset: 'world' | 'china') {
  return dataset === 'world' ? 10 : 25
}

function getRegionHoverAreaColor(region: RegionMeta, dataset: 'world' | 'china') {
  if (dataset === 'world') {
    return worldHoverPaletteByContinent[region.continent ?? ''] ??
      chinaHoverPalette[hashStringToIndex(region.id, chinaHoverPalette.length)]
  }
  const provinceKey = String(region.parentAdcode ?? region.adcode ?? region.id)
  return chinaHoverPalette[hashStringToIndex(provinceKey, chinaHoverPalette.length)]
}

function hashStringToIndex(value: string, modulo: number) {
  let hash = 0
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }
  return hash % modulo
}

function normalizeHex(hex: string) {
  const normalized = hex.replace('#', '')
  if (normalized.length === 3) {
    return normalized.split('').map((part) => `${part}${part}`).join('')
  }
  return normalized
}

function blendHexColors(baseHex: string, targetHex: string, weight: number) {
  const clampedWeight = clamp(weight, 0, 1)
  const base = normalizeHex(baseHex)
  const target = normalizeHex(targetHex)

  const channels = [0, 2, 4].map((offset) => {
    const baseChannel = Number.parseInt(base.slice(offset, offset + 2), 16)
    const targetChannel = Number.parseInt(target.slice(offset, offset + 2), 16)
    return Math.round(baseChannel + (targetChannel - baseChannel) * clampedWeight)
      .toString(16)
      .padStart(2, '0')
  })

  return `#${channels.join('')}`
}

function getRegionHoverBorderColor(region: RegionMeta, dataset: 'world' | 'china') {
  return blendHexColors(getRegionHoverAreaColor(region, dataset), '#112013', 0.38)
}

function getPracticeAccentColor(progress: SkillProgress) {
  const accuracy = progress.attempts > 0 ? progress.correct / progress.attempts : 0
  if (accuracy >= 0.85) return '#8ac89a'
  if (accuracy >= 0.55) return '#d7bc74'
  return '#d89c96'
}

function getPracticedAreaColor(dataset: 'world' | 'china', progress: SkillProgress) {
  const baseColor = defaultAreaColor(dataset)
  const accentColor = getPracticeAccentColor(progress)
  const intensity = clamp(0.34 + Math.log2(progress.attempts + 1) * 0.08, 0.34, 0.58)
  return blendHexColors(baseColor, accentColor, intensity)
}

function getPracticedBorderColor(dataset: 'world' | 'china', progress: SkillProgress) {
  return blendHexColors(defaultBorderColor(dataset), getPracticeAccentColor(progress), 0.22)
}

function getBorderWidth(base: number, emphasis: BorderEmphasis) {
  return emphasis === 'strong' ? base * 1.45 : base
}

function applyColorIntensity(areaColor: string, dataset: 'world' | 'china', colorIntensity: ColorIntensity) {
  if (colorIntensity === 'soft') {
    return blendHexColors(areaColor, '#f7f3e8', dataset === 'world' ? 0.24 : 0.2)
  }

  if (colorIntensity === 'vivid') {
    const accent = dataset === 'world' ? '#b8cca3' : '#d1b07a'
    return blendHexColors(areaColor, accent, 0.16)
  }

  return areaColor
}

function getMutedAreaColor(areaColor: string) {
  return blendHexColors(areaColor, '#efe8d8', 0.48)
}

function getMutedBorderColor(borderColor: string) {
  return blendHexColors(borderColor, '#c6b8a4', 0.38)
}

function getRegionLabelThreshold(dataset: 'world' | 'china', zoom: number): number {
  if (dataset === 'world') {
    if (zoom < 1.2) return 200
    if (zoom < 1.65) return 120
    if (zoom < 2.2) return 70
    if (zoom < 3.1) return 35
    if (zoom < 4.4) return 18
    if (zoom < 5.8) return 8
    return 0
  }
  if (zoom < 1.35) return 12
  if (zoom < 1.8) return 8
  if (zoom < 2.35) return 5
  if (zoom < 3.1) return 3.5
  if (zoom < 4.3) return 2.4
  if (zoom < 5.8) return 1.6
  if (zoom < 7.5) return 0.9
  return 0
}

function getQuantizedLabelFontSize(dataset: 'world' | 'china', zoom: number) {
  const zoomStrength = Math.log2(Math.max(zoom, 1))
  if (dataset === 'world') {
    return Math.round(clamp(10 + zoomStrength * 3.4, 10, 18))
  }
  return Math.round(clamp(8.8 + zoomStrength * 2.8, 8.8, 15.5))
}

function isTrackpadLikeWheelEvent(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) return true
  if (event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return false
  const absDeltaX = Math.abs(event.deltaX)
  const absDeltaY = Math.abs(event.deltaY)
  if (absDeltaX > 0.5) return true
  if (absDeltaY === 0) return false
  const hasFractionalDelta = Math.abs(absDeltaY - Math.round(absDeltaY)) > 0.01
  if (hasFractionalDelta) return true
  return !(absDeltaY >= 100 && (Math.abs(absDeltaY % 100) <= 0.5 || Math.abs(absDeltaY % 120) <= 0.5))
}

function getTrackpadZoomScale(deltaY: number) {
  return clamp(Math.exp(-deltaY * TRACKPAD_ZOOM_SENSITIVITY), TRACKPAD_ZOOM_MIN, TRACKPAD_ZOOM_MAX)
}

export function MapCanvas() {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const chartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null)
  const activeMapKeyRef = useRef<string | null>(null)
  const liveZoomRef = useRef(1)
  
  const [loadedMap, setLoadedMap] = useState<{ mapKey: string; featureCollection: object } | null>(null)
  const [zoom, setZoom] = useState(1)
  
  const dataset = useAtomValue(datasetAtom)
  const language = useAtomValue(languageAtom)
  const showLabels = useAtomValue(showLabelsAtom)
  const borderEmphasis = useAtomValue(borderEmphasisAtom)
  const colorIntensity = useAtomValue(colorIntensityAtom)
  const interactionMode = useAtomValue(interactionModeAtom)
  const trainingSession = useAtomValue(trainingSessionAtom)
  const mapViewportResetToken = useAtomValue(mapViewportResetTokenAtom)
  const config = useAtomValue(currentDatasetConfigAtom)
  const skillProgress = useAtomValue(currentSkillProgressMapAtom)
  const submitAnswer = useSetAtom(submitAnswerAtom)
  const [selectedRegionState, setSelectedRegionId] = useAtom(selectedRegionIdForExploreAtom)
  const activeLoadedMap = loadedMap?.mapKey === config.mapKey ? loadedMap : null
  const selectedRegionId = selectedRegionState?.regionId ?? null
  
  const labelThreshold = getRegionLabelThreshold(dataset, zoom)
  const labelFontSize = getQuantizedLabelFontSize(dataset, zoom)
  
  // Load map data
  useEffect(() => {
    let cancelled = false

    config.loadFeatureCollection()
      .then((fc) => {
        if (!cancelled) {
          setLoadedMap({ mapKey: config.mapKey, featureCollection: fc })
        }
      })
      .catch(() => {
        if (!cancelled) setLoadedMap(null)
      })
    
    return () => { cancelled = true }
  }, [config])
  
  // Initialize chart
  useEffect(() => {
    if (!chartRef.current || !activeLoadedMap) return
    
    ensureMapRegistered(config.mapKey, activeLoadedMap.featureCollection)

    if (activeMapKeyRef.current && activeMapKeyRef.current !== config.mapKey) {
      chartInstanceRef.current?.dispose()
      chartInstanceRef.current = null
      window.setTimeout(() => {
        liveZoomRef.current = 1
        setZoom(1)
      }, 0)
      activeMapKeyRef.current = null
    }

    const chart = chartInstanceRef.current ?? echarts.init(chartRef.current, undefined, { renderer: 'canvas' })
    chartInstanceRef.current = chart
    activeMapKeyRef.current = config.mapKey
    
    // Handle click
    chart.off('click')
    chart.on('click', (params) => {
      const regionId = typeof params.name === 'string' ? params.name : null
      if (!regionId) return
      
      if (interactionMode === 'training') {
        if (trainingSession?.correctAnswer.type !== 'map-click') {
          return
        }
        submitAnswer({ type: 'map-click', regionId })
        return
      }

      const rawEvent = params.event?.event as
        | { offsetX?: number; offsetY?: number; zrX?: number; zrY?: number }
        | undefined

      setSelectedRegionId({
        regionId,
        anchor: {
          x: rawEvent?.zrX ?? rawEvent?.offsetX ?? chartRef.current?.clientWidth ?? chart.getWidth() / 2,
          y: rawEvent?.zrY ?? rawEvent?.offsetY ?? chartRef.current?.clientHeight ?? chart.getHeight() / 2,
        },
      })
    })

    chart.getZr().off('click')
    chart.getZr().on('click', (event) => {
      if (interactionMode !== 'explore') return
      if (event.target) return
      setSelectedRegionId(null)
    })
    
    // Handle zoom
    chart.off('georoam')
    chart.on('georoam', (event) => {
      const e = event as { zoom?: number; totalZoom?: number }
      const newZoom = typeof e.totalZoom === 'number'
        ? e.totalZoom
        : typeof e.zoom === 'number'
          ? liveZoomRef.current * e.zoom
          : liveZoomRef.current
      const clampedZoom = clamp(newZoom, 1, getMaxZoom(dataset))
      liveZoomRef.current = clampedZoom
      setZoom(clampedZoom)
    })
    
    // Trackpad handling
    let rafId: number | null = null
    let pendingZoom = 1
    let pendingDx = 0
    let pendingDy = 0
    let pendingOriginX: number | null = null
    let pendingOriginY: number | null = null
    let lastWheelTime = 0
    
    function flushTransform() {
      rafId = null
      if (pendingZoom !== 1) {
        chart.dispatchAction({
          type: 'geoRoam',
          componentType: 'series',
          seriesIndex: 0,
          zoom: pendingZoom,
          originX: pendingOriginX ?? chart.getWidth() / 2,
          originY: pendingOriginY ?? chart.getHeight() / 2,
        })
        pendingZoom = 1
        pendingOriginX = null
        pendingOriginY = null
      }
      if (pendingDx !== 0 || pendingDy !== 0) {
        chart.dispatchAction({
          type: 'geoRoam',
          componentType: 'series',
          seriesIndex: 0,
          dx: pendingDx,
          dy: pendingDy,
        })
        pendingDx = 0
        pendingDy = 0
      }
    }
    
    function scheduleFlush() {
      if (rafId === null) rafId = requestAnimationFrame(flushTransform)
    }
    
    function handleWheel(event: WheelEvent) {
      if (!isTrackpadLikeWheelEvent(event)) return
      
      const rect = chart.getDom().getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
      
      event.preventDefault()
      event.stopPropagation()
      
      const now = performance.now()
      const timeDelta = now - lastWheelTime
      lastWheelTime = now
      
      if (event.ctrlKey || event.metaKey) {
        pendingZoom *= getTrackpadZoomScale(event.deltaY)
        pendingOriginX = x
        pendingOriginY = y
        scheduleFlush()
        return
      }
      
      const velocityFactor = Math.min(1, 16 / (timeDelta + 1))
      pendingDx -= event.deltaX * TRACKPAD_PAN_SENSITIVITY * velocityFactor
      pendingDy -= event.deltaY * TRACKPAD_PAN_SENSITIVITY * velocityFactor
      scheduleFlush()
    }
    
    chart.getDom().addEventListener('wheel', handleWheel, { capture: true, passive: false })
    
    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(chartRef.current)
    
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      chart.getDom().removeEventListener('wheel', handleWheel, true)
      resizeObserver.disconnect()
    }
  }, [activeLoadedMap, config.mapKey, dataset, interactionMode, submitAnswer, setSelectedRegionId, trainingSession])

  useEffect(() => {
    const chart = chartInstanceRef.current
    if (!chart || !activeLoadedMap) return

    liveZoomRef.current = 1
    chart.setOption({
      series: [{
        type: 'map',
        map: config.mapKey,
        center: null,
        zoom: 1,
      }],
    })
    const frameId = window.requestAnimationFrame(() => setZoom(1))
    return () => window.cancelAnimationFrame(frameId)
  }, [activeLoadedMap, config.mapKey, mapViewportResetToken])
  
  // Update chart series
  useEffect(() => {
    const chart = chartInstanceRef.current
    if (!chart || !activeLoadedMap) return
    
    const seriesData = config.regionIds.map((regionId) => {
      const region = config.regionById.get(regionId)
      if (!region) return { name: regionId }
      
      const progress = skillProgress[regionId]
      let areaColor = applyColorIntensity(defaultAreaColor(dataset), dataset, colorIntensity)
      let borderColor = defaultBorderColor(dataset)
      let borderWidth = getBorderWidth(dataset === 'world' ? 0.8 : 0.6, borderEmphasis)
      
      // 应用进度颜色
      if (progress && progress.attempts > 0) {
        areaColor = applyColorIntensity(getPracticedAreaColor(dataset, progress), dataset, colorIntensity)
        borderColor = getPracticedBorderColor(dataset, progress)
      }

      const shouldMuteForExplore = interactionMode === 'explore' && selectedRegionId && selectedRegionId !== regionId
      const shouldMuteForShapeQuestion =
        interactionMode === 'training' &&
        trainingSession?.status === 'idle' &&
        trainingSession.mode === 'shape-to-name' &&
        trainingSession.prompt.regionId !== regionId

      if (shouldMuteForExplore || shouldMuteForShapeQuestion) {
        areaColor = getMutedAreaColor(areaColor)
        borderColor = getMutedBorderColor(borderColor)
      }
      
      // 训练模式高亮
      if (interactionMode === 'training' && trainingSession) {
        const promptRegionId = trainingSession.prompt.regionId
        
        if (trainingSession.status === 'correct' && promptRegionId === regionId) {
          areaColor = '#97d39b'
          borderColor = '#19602b'
          borderWidth = 1.3
        } else if (trainingSession.status === 'wrong') {
          if (promptRegionId === regionId) {
            areaColor = '#97d39b'  // 正确答案绿色
            borderColor = '#19602b'
            borderWidth = getBorderWidth(1.3, borderEmphasis)
          }
          if (trainingSession.userAnswer?.type === 'map-click' && 
              trainingSession.userAnswer.regionId === regionId &&
              trainingSession.userAnswer.regionId !== promptRegionId) {
            areaColor = '#ef8d8d'  // 错误答案红色
            borderColor = '#8f1e1e'
            borderWidth = getBorderWidth(1.3, borderEmphasis)
          }
        } else if (trainingSession.status === 'idle' && promptRegionId === regionId) {
          // 当前题目高亮
          areaColor = '#f4cf7f'
          borderColor = '#8b6914'
          borderWidth = getBorderWidth(1.0, borderEmphasis)
        }
      }

      if (interactionMode === 'explore' && selectedRegionId === regionId) {
        areaColor = '#a6c7f6'
        borderColor = '#20477a'
        borderWidth = getBorderWidth(1.2, borderEmphasis)
      }
      
      return {
        name: regionId,
        itemStyle: { areaColor, borderColor, borderWidth },
        emphasis: {
          itemStyle: {
            areaColor: getRegionHoverAreaColor(region, dataset),
            borderColor: getRegionHoverBorderColor(region, dataset),
            borderWidth: getBorderWidth(Math.max(borderWidth, 1.2), borderEmphasis),
          },
        },
      }
    })
    
    const series: MapSeriesOption = {
      type: 'map',
      map: config.mapKey,
      roam: true,
      selectedMode: false,
      animation: false,
      scaleLimit: { min: 1, max: getMaxZoom(dataset) },
      label: {
        show: showLabels,
        color: '#253127',
        fontSize: labelFontSize,
        formatter: ({ name }) => {
          const region = config.regionById.get(String(name))
          if (!region) return String(name)
          const weight = region.labelWeight ?? 0
          return weight >= labelThreshold ? getRegionLabel(region, language) : ''
        },
      },
      emphasis: {
        label: { show: showLabels, color: '#112013', fontSize: labelFontSize },
        itemStyle: { areaColor: '#f4cf7f' },
      },
      data: seriesData,
    }
    
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { show: false },
      series: [series],
    })
  }, [
    activeLoadedMap, config, dataset, skillProgress, showLabels,
    labelThreshold, labelFontSize, language, interactionMode, trainingSession, selectedRegionId,
    borderEmphasis, colorIntensity,
  ])
  
  // Cleanup
  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose()
      chartInstanceRef.current = null
      activeMapKeyRef.current = null
    }
  }, [])
  
  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#f4f7ee_0%,#ece7d6_40%,#e0d8c6_100%)]">
      <div ref={chartRef} className="h-full w-full" />
      
      {!activeLoadedMap && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-stone-600 shadow-md backdrop-blur-md">
            Loading {dataset === 'world' ? 'world' : 'china'} map…
          </div>
        </div>
      )}
    </div>
  )
}
