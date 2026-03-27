import { useEffect, useRef, useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import * as echarts from 'echarts/core'
import { MapChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { MapSeriesOption } from 'echarts'
import {
  currentDatasetConfigAtom,
  currentDatasetMarkedRegionIdSetAtom,
  currentDatasetProgressAtom,
  datasetAtom,
  handleRegionSelectionAtom,
  interactionModeAtom,
  languageAtom,
  selectedRegionIdAtom,
  showLabelsAtom,
  trainingSessionAtom,
} from '../../state/appAtoms'
import type {
  DatasetMode,
  LanguageMode,
  RegionMeta,
  RegionProgress,
  TrainingSession,
} from '../../types/app'

echarts.use([CanvasRenderer, MapChart, TooltipComponent])

const registeredMaps = new Set<string>()
const chinaHoverPalette = [
  '#ec9f70',
  '#e27f8c',
  '#d9aa56',
  '#73b7d8',
  '#7fbe8e',
  '#b290ea',
  '#7ec4b4',
  '#d890c1',
  '#8aa6f1',
  '#ba9a72',
  '#78c9a2',
  '#f0b86b',
]

const worldHoverPaletteByContinent: Record<string, string> = {
  Asia: '#e8a96c',
  Europe: '#7ea7eb',
  Africa: '#7fbe8e',
  'North America': '#d796c5',
  'South America': '#cf9a6c',
  Oceania: '#91a5ef',
}
const TRACKPAD_ZOOM_MIN = 0.92
const TRACKPAD_ZOOM_MAX = 1.12
const TRACKPAD_ZOOM_SENSITIVITY = 0.008
const TRACKPAD_PAN_SENSITIVITY = 1.2

type LoadedMapState = {
  mapKey: string
  featureCollection: object
}

type ZoomPresentation = {
  labelFontSize: number
  labelThreshold: number
  signature: string
}

function ensureMapRegistered(mapKey: string, featureCollection: object) {
  if (registeredMaps.has(mapKey)) {
    return
  }

  echarts.registerMap(mapKey, featureCollection as never)
  registeredMaps.add(mapKey)
}

function getRegionLabel(region: RegionMeta, language: LanguageMode) {
  if (language === 'en') {
    return region.nameEn
  }

  return region.nameZh
}

function defaultAreaColor(dataset: DatasetMode) {
  return dataset === 'world' ? '#d6dfcf' : '#d8d1c3'
}

function defaultBorderColor(dataset: DatasetMode) {
  return dataset === 'world' ? '#586357' : '#6b6157'
}

function getMaxZoom(dataset: DatasetMode) {
  return dataset === 'world' ? 10 : 25
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function isNearlyMultiple(value: number, step: number, tolerance = 0.5) {
  const remainder = Math.abs(value) % step
  return remainder <= tolerance || step - remainder <= tolerance
}

function isTrackpadLikeWheelEvent(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) {
    return true
  }

  if (event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) {
    return false
  }

  const absDeltaX = Math.abs(event.deltaX)
  const absDeltaY = Math.abs(event.deltaY)

  if (absDeltaX > 0.5) {
    return true
  }

  if (absDeltaY === 0) {
    return false
  }

  const hasFractionalDelta = Math.abs(absDeltaY - Math.round(absDeltaY)) > 0.01

  if (hasFractionalDelta) {
    return true
  }

  const isMouseLikeStep =
    absDeltaY >= 100 && (isNearlyMultiple(absDeltaY, 100) || isNearlyMultiple(absDeltaY, 120))

  return !isMouseLikeStep
}

function getTrackpadZoomScale(deltaY: number) {
  return clamp(
    Math.exp(-deltaY * TRACKPAD_ZOOM_SENSITIVITY),
    TRACKPAD_ZOOM_MIN,
    TRACKPAD_ZOOM_MAX,
  )
}

function normalizeHex(hex: string) {
  const normalized = hex.replace('#', '')

  if (normalized.length === 3) {
    return normalized
      .split('')
      .map((part) => `${part}${part}`)
      .join('')
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

function hashStringToIndex(value: string, modulo: number) {
  let hash = 0

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }

  return hash % modulo
}

function getRegionHoverAreaColor(region: RegionMeta, dataset: DatasetMode) {
  if (dataset === 'world') {
    return (
      worldHoverPaletteByContinent[region.continent ?? ''] ??
      chinaHoverPalette[hashStringToIndex(region.id, chinaHoverPalette.length)]
    )
  }

  const provinceKey = String(region.parentAdcode ?? region.adcode ?? region.id)
  return chinaHoverPalette[hashStringToIndex(provinceKey, chinaHoverPalette.length)]
}

function getRegionHoverBorderColor(region: RegionMeta, dataset: DatasetMode) {
  return blendHexColors(getRegionHoverAreaColor(region, dataset), '#112013', 0.38)
}

function getPracticeAccentColor(progress: RegionProgress) {
  const accuracy = progress.attempts > 0 ? progress.correct / progress.attempts : 0

  if (accuracy >= 0.85) {
    return '#8ac89a'
  }

  if (accuracy >= 0.55) {
    return '#d7bc74'
  }

  return '#d89c96'
}

function getPracticedAreaColor(dataset: DatasetMode, progress: RegionProgress) {
  const baseColor = defaultAreaColor(dataset)
  const accentColor = getPracticeAccentColor(progress)
  const intensity = clamp(0.34 + Math.log2(progress.attempts + 1) * 0.08, 0.34, 0.58)

  return blendHexColors(baseColor, accentColor, intensity)
}

function getPracticedBorderColor(dataset: DatasetMode, progress: RegionProgress) {
  return blendHexColors(defaultBorderColor(dataset), getPracticeAccentColor(progress), 0.22)
}

function getMarkedAreaColor(areaColor: string) {
  return blendHexColors(areaColor, '#8fc9c7', 0.28)
}

function getMarkedBorderColor(borderColor: string) {
  return blendHexColors(borderColor, '#0f5d63', 0.72)
}

function getRegionLabelThreshold(dataset: DatasetMode, zoom: number) {
  if (dataset === 'world') {
    if (zoom < 1.2) {
      return 200
    }

    if (zoom < 1.65) {
      return 120
    }

    if (zoom < 2.2) {
      return 70
    }

    if (zoom < 3.1) {
      return 35
    }

    if (zoom < 4.4) {
      return 18
    }

    if (zoom < 5.8) {
      return 8
    }

    return 0
  }

  if (zoom < 1.35) {
    return 12
  }

  if (zoom < 1.8) {
    return 8
  }

  if (zoom < 2.35) {
    return 5
  }

  if (zoom < 3.1) {
    return 3.5
  }

  if (zoom < 4.3) {
    return 2.4
  }

  if (zoom < 5.8) {
    return 1.6
  }

  if (zoom < 7.5) {
    return 0.9
  }

  return 0
}

function getLabelFontSize(dataset: DatasetMode, zoom: number) {
  const zoomStrength = Math.log2(Math.max(zoom, 1))

  if (dataset === 'world') {
    return Math.round(clamp(10 + zoomStrength * 3.4, 10, 18) * 10) / 10
  }

  return Math.round(clamp(8.8 + zoomStrength * 2.8, 8.8, 15.5) * 10) / 10
}

function getQuantizedLabelFontSize(dataset: DatasetMode, zoom: number) {
  return Math.round(getLabelFontSize(dataset, zoom))
}

function getZoomPresentation(dataset: DatasetMode, zoom: number): ZoomPresentation {
  const labelThreshold = getRegionLabelThreshold(dataset, zoom)
  const labelFontSize = getQuantizedLabelFontSize(dataset, zoom)

  return {
    labelFontSize,
    labelThreshold,
    signature: `${labelThreshold}:${labelFontSize}`,
  }
}

function shouldShowRegionLabel(
  region: RegionMeta,
  labelThreshold: number,
  selectedRegionId: string | null,
  trainingSession: TrainingSession,
) {
  if (selectedRegionId === region.id) {
    return true
  }

  if (trainingSession.promptRegionId === region.id || trainingSession.answeredRegionId === region.id) {
    return true
  }

  const labelWeight = region.labelWeight ?? 0
  return labelWeight >= labelThreshold
}

function buildSeries(
  dataset: DatasetMode,
  mapKey: string,
  regionById: Map<string, RegionMeta>,
  regionIds: string[],
  progressByRegionId: Record<string, RegionProgress>,
  markedRegionIdSet: Set<string>,
  language: LanguageMode,
  showLabels: boolean,
  labelThreshold: number,
  labelFontSize: number,
  interactionMode: 'explore' | 'training',
  selectedRegionId: string | null,
  trainingSession: TrainingSession,
): MapSeriesOption {
  return {
    type: 'map',
    map: mapKey,
    roam: true,
    selectedMode: false,
    animation: false,
    scaleLimit: {
      min: 1,
      max: getMaxZoom(dataset),
    },
    itemStyle: {
      areaColor: defaultAreaColor(dataset),
      borderColor: defaultBorderColor(dataset),
      borderWidth: dataset === 'world' ? 0.8 : 0.6,
    },
    emphasis: {
      label: {
        show: showLabels,
        color: '#112013',
        fontSize: labelFontSize,
      },
      itemStyle: {
        areaColor: '#f4cf7f',
      },
    },
    labelLayout: {
      hideOverlap: true,
    },
    label: {
      show: showLabels,
      color: '#253127',
      fontSize: labelFontSize,
      formatter: ({ name }) => {
        const region = regionById.get(String(name))

        if (!region) {
          return String(name)
        }

        return shouldShowRegionLabel(
          region,
          labelThreshold,
          selectedRegionId,
          trainingSession,
        )
          ? getRegionLabel(region, language)
          : ''
      },
    },
    data: regionIds.map((regionId) => {
      const region = regionById.get(regionId)
      const progress = progressByRegionId[regionId]
      let areaColor =
        progress && progress.attempts > 0
          ? getPracticedAreaColor(dataset, progress)
          : defaultAreaColor(dataset)
      let borderColor =
        progress && progress.attempts > 0
          ? getPracticedBorderColor(dataset, progress)
          : defaultBorderColor(dataset)
      let borderWidth = dataset === 'world' ? 0.8 : 0.6
      const hoverAreaColor = region ? getRegionHoverAreaColor(region, dataset) : '#f4cf7f'
      const hoverBorderColor = region
        ? getRegionHoverBorderColor(region, dataset)
        : defaultBorderColor(dataset)

      if (markedRegionIdSet.has(regionId)) {
        areaColor = getMarkedAreaColor(areaColor)
        borderColor = getMarkedBorderColor(borderColor)
        borderWidth = Math.max(borderWidth, dataset === 'world' ? 1.35 : 1.15)
      }

      if (interactionMode === 'explore' && selectedRegionId === regionId) {
        areaColor = '#a6c7f6'
        borderColor = '#20477a'
        borderWidth = 1.2
      }

      if (interactionMode === 'training') {
        if (trainingSession.result === 'wrong' && trainingSession.promptRegionId === regionId) {
          areaColor = '#97d39b'
          borderColor = '#19602b'
          borderWidth = 1.3
        }

        if (trainingSession.result === 'wrong' && trainingSession.answeredRegionId === regionId) {
          areaColor = '#ef8d8d'
          borderColor = '#8f1e1e'
          borderWidth = 1.3
        }

        if (trainingSession.result === 'correct' && trainingSession.promptRegionId === regionId) {
          areaColor = '#97d39b'
          borderColor = '#19602b'
          borderWidth = 1.3
        }
      }

      return {
        name: regionId,
        emphasis: {
          itemStyle: {
            areaColor: hoverAreaColor,
            borderColor: hoverBorderColor,
            borderWidth: Math.max(borderWidth, 1.2),
          },
        },
        itemStyle: {
          areaColor,
          borderColor,
          borderWidth,
        },
      }
    }),
  }
}

export function MapCanvas() {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const chartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null)
  const [loadedMap, setLoadedMap] = useState<LoadedMapState | null>(null)
  const dataset = useAtomValue(datasetAtom)
  const [zoomPresentation, setZoomPresentation] = useState<ZoomPresentation>(() =>
    getZoomPresentation(dataset, 1),
  )
  const liveZoomRef = useRef(1)
  const zoomPresentationRef = useRef(zoomPresentation)
  const showLabelsRef = useRef(false)
  const currentDatasetConfig = useAtomValue(currentDatasetConfigAtom)
  const markedRegionIdSet = useAtomValue(currentDatasetMarkedRegionIdSetAtom)
  const currentDatasetProgress = useAtomValue(currentDatasetProgressAtom)
  const language = useAtomValue(languageAtom)
  const showLabels = useAtomValue(showLabelsAtom)
  const interactionMode = useAtomValue(interactionModeAtom)
  const selectedRegionId = useAtomValue(selectedRegionIdAtom)
  const trainingSession = useAtomValue(trainingSessionAtom)
  const handleRegionSelection = useSetAtom(handleRegionSelectionAtom)
  const featureCollection =
    loadedMap?.mapKey === currentDatasetConfig.mapKey ? loadedMap.featureCollection : null
  const renderedZoomPresentation = zoomPresentation

  useEffect(() => {
    showLabelsRef.current = showLabels
  }, [showLabels])

  useEffect(() => {
    if (!showLabels) {
      return
    }

    const currentZoomPresentation = getZoomPresentation(dataset, liveZoomRef.current)

    if (currentZoomPresentation.signature === zoomPresentationRef.current.signature) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      zoomPresentationRef.current = currentZoomPresentation
      setZoomPresentation(currentZoomPresentation)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [dataset, showLabels])

  useEffect(() => {
    let cancelled = false
    const mapKey = currentDatasetConfig.mapKey

    currentDatasetConfig
      .loadFeatureCollection()
      .then((loadedFeatureCollection) => {
        if (!cancelled) {
          setLoadedMap({
            mapKey,
            featureCollection: loadedFeatureCollection,
          })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedMap(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [currentDatasetConfig])

  useEffect(() => {
    if (!chartRef.current || !featureCollection) {
      return
    }

    ensureMapRegistered(currentDatasetConfig.mapKey, featureCollection)

    const chart =
      chartInstanceRef.current ??
      echarts.init(chartRef.current, undefined, {
        renderer: 'canvas',
      })

    chartInstanceRef.current = chart
    chart.off('click')

    chart.on('click', (params) => {
      const regionId = typeof params.name === 'string' ? params.name : null

      if (!regionId || !chartRef.current) {
        return
      }

      const rawEvent = params.event?.event as
        | { offsetX?: number; offsetY?: number; zrX?: number; zrY?: number }
        | undefined

      handleRegionSelection({
        regionId,
        position: {
          x: rawEvent?.zrX ?? rawEvent?.offsetX ?? chartRef.current.clientWidth / 2,
          y: rawEvent?.zrY ?? rawEvent?.offsetY ?? chartRef.current.clientHeight / 2,
        },
      })
    })

    chart.off('georoam')
    chart.on('georoam', (event) => {
      const rawEvent = event as { totalZoom?: number; zoom?: number }
      const nextZoom =
        typeof rawEvent.totalZoom === 'number'
          ? rawEvent.totalZoom
          : typeof rawEvent.zoom === 'number'
            ? liveZoomRef.current * rawEvent.zoom
            : liveZoomRef.current

      liveZoomRef.current = clamp(nextZoom, 1, getMaxZoom(dataset))
      const nextZoomPresentation = getZoomPresentation(dataset, liveZoomRef.current)

      if (showLabelsRef.current && nextZoomPresentation.signature !== zoomPresentationRef.current.signature) {
        zoomPresentationRef.current = nextZoomPresentation
        setZoomPresentation(nextZoomPresentation)
      }
    })

    let pendingZoom = 1
    let pendingDx = 0
    let pendingDy = 0
    let pendingOriginX: number | null = null
    let pendingOriginY: number | null = null
    let rafId: number | null = null
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
      if (rafId === null) {
        rafId = requestAnimationFrame(flushTransform)
      }
    }

    function handleWheel(event: WheelEvent) {
      if (!isTrackpadLikeWheelEvent(event)) {
        return
      }

      const chartDom = chart.getDom()
      const rect = chartDom.getBoundingClientRect()
      const originX = event.clientX - rect.left
      const originY = event.clientY - rect.top

      if (originX < 0 || originY < 0 || originX > rect.width || originY > rect.height) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const now = performance.now()
      const timeDelta = now - lastWheelTime
      lastWheelTime = now

      if (event.ctrlKey || event.metaKey) {
        const scale = getTrackpadZoomScale(event.deltaY)
        pendingZoom *= scale
        pendingOriginX = originX
        pendingOriginY = originY
        scheduleFlush()
        return
      }

      const velocityFactor = Math.min(1, 16 / (timeDelta + 1))
      pendingDx -= event.deltaX * TRACKPAD_PAN_SENSITIVITY * velocityFactor
      pendingDy -= event.deltaY * TRACKPAD_PAN_SENSITIVITY * velocityFactor
      scheduleFlush()
    }

    chart.getDom().addEventListener('wheel', handleWheel, {
      capture: true,
      passive: false,
    })

    const resizeObserver = new ResizeObserver(() => {
      chart.resize()
    })

    resizeObserver.observe(chartRef.current)

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      chart.getDom().removeEventListener('wheel', handleWheel, true)
      resizeObserver.disconnect()
    }
  }, [currentDatasetConfig.mapKey, dataset, featureCollection, handleRegionSelection])

  useEffect(() => {
    const chart = chartInstanceRef.current

    if (!chart || !featureCollection) {
      return
    }

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        show: false,
      },
      series: [
        buildSeries(
          dataset,
          currentDatasetConfig.mapKey,
          currentDatasetConfig.regionById,
          currentDatasetConfig.regionIds,
          currentDatasetProgress,
          markedRegionIdSet,
          language,
          showLabels,
          renderedZoomPresentation.labelThreshold,
          renderedZoomPresentation.labelFontSize,
          interactionMode,
          selectedRegionId,
          trainingSession,
        ),
      ],
    })
  }, [
    currentDatasetConfig.mapKey,
    currentDatasetProgress,
    currentDatasetConfig.regionById,
    currentDatasetConfig.regionIds,
    dataset,
    featureCollection,
    interactionMode,
    language,
    markedRegionIdSet,
    showLabels,
    renderedZoomPresentation.labelFontSize,
    renderedZoomPresentation.labelThreshold,
    selectedRegionId,
    trainingSession,
  ])

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose()
      chartInstanceRef.current = null
    }
  }, [])

  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#f4f7ee_0%,#ece7d6_40%,#e0d8c6_100%)]">
      <div ref={chartRef} className="h-full w-full" />

      {!featureCollection ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-stone-600 shadow-md backdrop-blur-md">
            Loading {dataset === 'world' ? 'world' : 'china'} map…
          </div>
        </div>
      ) : null}
    </div>
  )
}
