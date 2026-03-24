import { useEffect, useRef } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import * as echarts from 'echarts/core'
import { MapChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { MapSeriesOption } from 'echarts'
import {
  datasetAtom,
  handleRegionSelectionAtom,
  interactionModeAtom,
  languageAtom,
  selectedRegionIdAtom,
  showLabelsAtom,
  trainingSessionAtom,
} from '../../state/appAtoms'
import type { LanguageMode, TrainingSession } from '../../types/app'
import { WORLD_MAP_KEY, worldFeatureCollection, worldRegionById, worldRegionIds } from './worldDataset'

echarts.use([CanvasRenderer, MapChart, TooltipComponent])

let worldMapRegistered = false

function ensureWorldMapRegistered() {
  if (worldMapRegistered) {
    return
  }

  echarts.registerMap(WORLD_MAP_KEY, worldFeatureCollection as never)
  worldMapRegistered = true
}

function getRegionLabel(regionId: string, language: LanguageMode) {
  const meta = worldRegionById.get(regionId)

  if (!meta) {
    return regionId
  }

  return language === 'en' ? meta.nameEn : meta.nameZh
}

function buildWorldSeries(
  language: LanguageMode,
  showLabels: boolean,
  interactionMode: 'explore' | 'training',
  selectedRegionId: string | null,
  trainingSession: TrainingSession,
): MapSeriesOption {
  return {
    type: 'map',
    map: WORLD_MAP_KEY,
    roam: true,
    selectedMode: false,
    animation: false,
    scaleLimit: {
      min: 1,
      max: 10,
    },
    itemStyle: {
      areaColor: '#d6dfcf',
      borderColor: '#586357',
      borderWidth: 0.8,
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
      fontSize: 10,
      formatter: ({ name }) => getRegionLabel(String(name), language),
    },
    data: worldRegionIds.map((regionId) => {
      let areaColor = '#d6dfcf'
      let borderColor = '#586357'
      let borderWidth = 0.8

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
  const dataset = useAtomValue(datasetAtom)
  const language = useAtomValue(languageAtom)
  const showLabels = useAtomValue(showLabelsAtom)
  const interactionMode = useAtomValue(interactionModeAtom)
  const selectedRegionId = useAtomValue(selectedRegionIdAtom)
  const trainingSession = useAtomValue(trainingSessionAtom)
  const handleRegionSelection = useSetAtom(handleRegionSelectionAtom)

  useEffect(() => {
    if (!chartRef.current || dataset !== 'world') {
      return
    }

    ensureWorldMapRegistered()

    const chart = echarts.init(chartRef.current, undefined, {
      renderer: 'canvas',
    })
    chartInstanceRef.current = chart

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

    const resizeObserver = new ResizeObserver(() => {
      chart.resize()
    })

    resizeObserver.observe(chartRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
      chartInstanceRef.current = null
    }
  }, [dataset, handleRegionSelection])

  useEffect(() => {
    if (dataset !== 'world') {
      return
    }

    const chart = chartInstanceRef.current

    if (!chart) {
      return
    }

    chart.setOption(
      {
        backgroundColor: 'transparent',
        tooltip: {
          show: false,
        },
        series: [
          buildWorldSeries(
            language,
            showLabels,
            interactionMode,
            selectedRegionId,
            trainingSession,
          ),
        ],
      },
    )
  }, [dataset, interactionMode, language, selectedRegionId, showLabels, trainingSession])

  return (
    <div
      className="absolute inset-0 bg-[radial-gradient(circle_at_top,#f4f7ee_0%,#ece7d6_40%,#e0d8c6_100%)]"
      data-dataset={dataset}
    >
      {dataset === 'world' ? (
        <div ref={chartRef} className="h-full w-full" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="max-w-md rounded-[32px] border border-stone-700/15 bg-white/70 px-6 py-5 text-center shadow-[0_24px_80px_rgba(28,38,20,0.12)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
              China prefecture mode
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900">
              中国地级市 / 州数据正在接入
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              当前版本先把世界国家的训练闭环打通。中国模式下一步会走省级拆分抓取和聚合。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
