import { useEffect, useRef, useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import * as echarts from 'echarts/core'
import { MapChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { MapSeriesOption } from 'echarts'
import {
  currentDatasetConfigAtom,
  datasetAtom,
  handleRegionSelectionAtom,
  interactionModeAtom,
  languageAtom,
  selectedRegionIdAtom,
  showLabelsAtom,
  trainingSessionAtom,
} from '../../state/appAtoms'
import type { DatasetMode, LanguageMode, RegionMeta, TrainingSession } from '../../types/app'

echarts.use([CanvasRenderer, MapChart, TooltipComponent])

const registeredMaps = new Set<string>()

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

function shouldShowRegionLabel(
  region: RegionMeta,
  dataset: DatasetMode,
  zoom: number,
  interactionMode: 'explore' | 'training',
  selectedRegionId: string | null,
  trainingSession: TrainingSession,
) {
  if (selectedRegionId === region.id) {
    return true
  }

  if (trainingSession.promptRegionId === region.id || trainingSession.answeredRegionId === region.id) {
    return true
  }

  if (interactionMode === 'training') {
    return zoom >= (dataset === 'world' ? 2.15 : 3.2)
  }

  const labelWeight = region.labelWeight ?? 0

  if (dataset === 'world') {
    if (zoom >= 2.15) {
      return true
    }

    if (zoom >= 1.45) {
      return labelWeight >= 40
    }

    return labelWeight >= 110
  }

  if (zoom >= 3.1) {
    return true
  }

  if (zoom >= 1.9) {
    return labelWeight >= 0.55
  }

  return labelWeight >= 2.2
}

function buildSeries(
  dataset: DatasetMode,
  mapKey: string,
  regionById: Map<string, RegionMeta>,
  regionIds: string[],
  language: LanguageMode,
  showLabels: boolean,
  zoom: number,
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
      max: dataset === 'world' ? 10 : 25,
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
      },
      itemStyle: {
        areaColor: '#f4cf7f',
      },
    },
    label: {
      show: showLabels,
      color: '#253127',
      fontSize: dataset === 'world' ? 10 : 9,
      formatter: ({ name }) => {
        const region = regionById.get(String(name))

        if (!region) {
          return String(name)
        }

        return shouldShowRegionLabel(
          region,
          dataset,
          zoom,
          interactionMode,
          selectedRegionId,
          trainingSession,
        )
          ? getRegionLabel(region, language)
          : ''
      },
    },
    data: regionIds.map((regionId) => {
      let areaColor = defaultAreaColor(dataset)
      let borderColor = defaultBorderColor(dataset)
      let borderWidth = dataset === 'world' ? 0.8 : 0.6

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
  const [featureCollection, setFeatureCollection] = useState<object | null>(null)
  const [zoom, setZoom] = useState(1)
  const dataset = useAtomValue(datasetAtom)
  const currentDatasetConfig = useAtomValue(currentDatasetConfigAtom)
  const language = useAtomValue(languageAtom)
  const showLabels = useAtomValue(showLabelsAtom)
  const interactionMode = useAtomValue(interactionModeAtom)
  const selectedRegionId = useAtomValue(selectedRegionIdAtom)
  const trainingSession = useAtomValue(trainingSessionAtom)
  const handleRegionSelection = useSetAtom(handleRegionSelectionAtom)

  useEffect(() => {
    let cancelled = false

    setZoom(1)
    currentDatasetConfig
      .loadFeatureCollection()
      .then((loadedFeatureCollection) => {
        if (!cancelled) {
          setFeatureCollection(loadedFeatureCollection)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFeatureCollection(null)
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
    chart.on('georoam', () => {
      const option = chart.getOption() as { series?: Array<{ zoom?: number }> }
      const nextZoom =
        typeof option.series?.[0]?.zoom === 'number'
          ? option.series[0].zoom
          : 1

      setZoom(nextZoom)
    })

    const resizeObserver = new ResizeObserver(() => {
      chart.resize()
    })

    resizeObserver.observe(chartRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [currentDatasetConfig.mapKey, featureCollection, handleRegionSelection])

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
          language,
          showLabels,
          zoom,
          interactionMode,
          selectedRegionId,
          trainingSession,
        ),
      ],
    })
  }, [
    currentDatasetConfig.mapKey,
    currentDatasetConfig.regionById,
    currentDatasetConfig.regionIds,
    dataset,
    featureCollection,
    interactionMode,
    language,
    selectedRegionId,
    showLabels,
    trainingSession,
    zoom,
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
          <div className="rounded-full bg-white/85 px-5 py-3 text-sm font-medium text-stone-700 shadow-lg backdrop-blur">
            Loading {dataset === 'world' ? 'world' : 'china'} map data…
          </div>
        </div>
      ) : null}
    </div>
  )
}
