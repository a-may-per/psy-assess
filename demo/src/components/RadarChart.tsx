import { useMemo } from 'react'
import { Image, View, Text } from '@tarojs/components'
import { DIMENSIONS } from '../data/quizData'

interface RadarChartProps {
  values: number[]
  compareValues?: number[]
  selfLabel?: string
  partnerLabel?: string
}

function polar(cx: number, cy: number, radius: number, index: number, count: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count
  return {
    x: Number((cx + Math.cos(angle) * radius).toFixed(1)),
    y: Number((cy + Math.sin(angle) * radius).toFixed(1))
  }
}

function pointsFor(values: number[], radius: number, cx = 160, cy = 155) {
  return values
    .map((value, index) => {
      const clamped = Math.max(8, Math.min(100, value || 0))
      const p = polar(cx, cy, (radius * clamped) / 100, index, values.length)
      return `${p.x},${p.y}`
    })
    .join(' ')
}

export function RadarChart({
  values,
  compareValues,
  selfLabel = '你',
  partnerLabel = '对方'
}: RadarChartProps) {
  const isCompare = Array.isArray(compareValues) && compareValues.length === 5

  const svgDataUri = useMemo(() => {
    const cx = 160
    const cy = 155
    const r = 104
    const axes = DIMENSIONS.map(d => d.label)

    const gridPolygons = [25, 50, 75, 100]
      .map(
        level =>
          `<polygon points="${pointsFor(
            axes.map(() => level),
            r,
            cx,
            cy
          )}" fill="${level === 100 ? '#faf8ff' : 'none'}" stroke="#e6e1f4" stroke-width="1.2" />`
      )
      .join('')

    const axisLines = axes
      .map((_, index) => {
        const p = polar(cx, cy, r, index, axes.length)
        return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="#ebe6f6" stroke-width="1.2" />`
      })
      .join('')

    const comparePolygon = isCompare
      ? `<polygon points="${pointsFor(
          compareValues!,
          r,
          cx,
          cy
        )}" fill="#f4ad73" fill-opacity="0.20" stroke="#efa366" stroke-width="3" stroke-dasharray="6 4" stroke-linejoin="round" />`
      : ''

    const compareDots = isCompare
      ? compareValues!
          .map((value, index) => {
            const clamped = Math.max(8, Math.min(100, value || 0))
            const p = polar(cx, cy, (r * clamped) / 100, index, axes.length)
            return `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#efa366" stroke="#ffffff" stroke-width="2" />`
          })
          .join('')
      : ''

    const mainPolygon = `<polygon points="${pointsFor(
      values,
      r,
      cx,
      cy
    )}" fill="#806af2" fill-opacity="0.22" stroke="#755fe8" stroke-width="3" stroke-linejoin="round" />`

    const mainDots = values
      .map((value, index) => {
        const clamped = Math.max(8, Math.min(100, value || 0))
        const p = polar(cx, cy, (r * clamped) / 100, index, axes.length)
        return `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#755fe8" stroke="#ffffff" stroke-width="2.5" />`
      })
      .join('')

    const labels = axes
      .map((label, index) => {
        const p = polar(cx, cy, r + 30, index, axes.length)
        const vSelf = values[index] ?? 0
        const scoreText = isCompare
          ? `${vSelf} / ${compareValues![index] ?? 0}`
          : `${vSelf}`
        return `<g>
          <text x="${p.x}" y="${p.y - 6}" text-anchor="middle" dominant-baseline="middle" fill="#3a3452" font-size="13" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, PingFang SC, sans-serif">${label}</text>
          <text x="${p.x}" y="${p.y + 11}" text-anchor="middle" dominant-baseline="middle" fill="#887fa3" font-size="11" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, PingFang SC, sans-serif">${scoreText}</text>
        </g>`
      })
      .join('')

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 310" width="320" height="310">
      ${gridPolygons}
      ${axisLines}
      ${comparePolygon}
      ${mainPolygon}
      ${compareDots}
      ${mainDots}
      ${labels}
    </svg>`

    return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`
  }, [values, compareValues, isCompare])

  return (
    <View className='radar-wrap'>
      <Image
        className='radar-image'
        src={svgDataUri}
        mode='aspectFit'
      />
      {isCompare && (
        <View className='radar-legend'>
          <View className='legend-item'>
            <View className='legend-dot you' />
            <Text className='legend-text'>{selfLabel}</Text>
          </View>
          <View className='legend-item'>
            <View className='legend-dot them' />
            <Text className='legend-text'>{partnerLabel}</Text>
          </View>
        </View>
      )}
    </View>
  )
}
