import { MoreHorizontal, ServerCrash } from 'lucide-react'
import { Link } from 'react-router-dom'

import DarkTooltip from '@shared/components/charts/DarkTooltip'
import {
  surfaceClass,
} from '@shared/components/FormPrimitives'
import { useCountUp } from '@shared/lib/countUp'
import { stagger } from '@shared/lib/motion'

const dashboardPanelHeaderClass =
  'flex min-h-12 items-center justify-between gap-3 border-b border-hairline px-4 py-3'

function buildSparklinePoints(values = [], width = 320, height = 92) {
  const safeValues = values.length > 1 ? values : [0, 0, 0, 0]
  const numbers = safeValues.map((value) => Number(value || 0))
  const max = Math.max(...numbers, 1)
  const min = Math.min(...numbers, 0)
  const range = Math.max(max - min, 1)
  const padding = 8
  const step = width / Math.max(numbers.length - 1, 1)
  const linePoints = numbers
    .map((value, index) => {
      const x = index * step
      const y = height - padding - ((value - min) / range) * (height - padding * 2)

      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return {
    areaPoints: `0,${height} ${linePoints} ${width},${height}`,
    linePoints,
  }
}

export function DashboardStatCard({
  context,
  icon: Icon,
  index,
  label,
  precision = 0,
  tone,
  value,
}) {
  const count = useCountUp(value, 800, precision)

  return (
    <article
      className={`${surfaceClass} group relative h-full animate-fade-up overflow-hidden p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(20,24,31,0.07)]`}
      style={stagger(index, 0.08)}
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="animate-count-up text-[30px] font-extrabold leading-none text-ink">
            {count}
          </p>
          <p className="mt-2 text-[13px] font-medium text-slate">{label}</p>
          <p className="mt-1 text-[12px] font-normal text-slate">{context}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-4">
          <MoreHorizontal aria-hidden="true" className="h-5 w-5 text-slate/35" />
          <div className={`flex h-10 w-10 items-center justify-center rounded-control ${tone}`}>
            <Icon aria-hidden="true" className="h-5 w-5" />
          </div>
        </div>
      </div>
    </article>
  )
}

export function DashboardPanel({
  action,
  actionTo,
  bodyClassName = 'p-4',
  children,
  className = '',
  footer,
  headerContent,
  title,
}) {
  return (
    <section className={`${surfaceClass} group/panel relative flex h-full flex-col overflow-hidden ${className}`}>
      <div className={dashboardPanelHeaderClass}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
          <h2 className="truncate text-[16px] font-semibold text-ink">
            {title}
          </h2>
        </div>
        {headerContent ? (
          headerContent
        ) : action && actionTo ? (
          <Link
            className="rounded-full border border-brand/10 bg-brand-light px-3 py-1.5 text-[12px] font-semibold text-brand transition hover:-translate-y-0.5 hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            to={actionTo}
          >
            {action}
          </Link>
        ) : action ? (
          <span className="rounded-full bg-mist px-3 py-1.5 text-[12px] font-semibold text-slate">
            {action}
          </span>
        ) : null}
      </div>
      <div className={`relative flex-1 ${bodyClassName}`}>{children}</div>
      {footer ? <div className="border-t border-hairline px-5 py-3">{footer}</div> : null}
    </section>
  )
}

export function DashboardErrorState({ message, onRetry }) {
  return (
    <section className={`${surfaceClass} p-10 text-center`}>
      <ServerCrash aria-hidden="true" className="mx-auto mb-4 h-10 w-10 text-slate/30" />
      <h2 className="text-[18px] font-semibold italic text-slate">Something went wrong</h2>
      <p className="mt-1 text-[14px] font-normal text-slate">{message}</p>
      <button
        className="mt-5 rounded-control border border-hairline bg-canvas px-4 py-2 text-sm font-semibold text-slate transition hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2"
        onClick={onRetry}
        type="button"
      >
        Try again
      </button>
    </section>
  )
}

export function DashboardEmptyState({
  className = '',
  description,
  icon: Icon,
  title,
}) {
  return (
    <div
      className={[
        'flex min-h-[92px] flex-col items-center justify-center px-4 py-6 text-center',
        className,
      ].join(' ')}
    >
      {Icon ? <Icon aria-hidden="true" className="mb-3 h-9 w-9 text-brand/25" /> : null}
      <p className="text-[18px] font-semibold italic text-slate">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-[13px] font-normal leading-6 text-slate">
          {description}
        </p>
      ) : null}
    </div>
  )
}

export function PanelSkeleton({ className = '', rows = 1 }) {
  return (
    <div className={['rounded-control bg-mist p-4', className].join(' ')}>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            className="h-10 animate-shimmer rounded-control bg-gradient-to-r from-hairline via-canvas to-hairline bg-[length:200%_100%]"
            key={index}
            style={stagger(index, 0.04)}
          />
        ))}
      </div>
    </div>
  )
}

export function DashboardChartTooltip({ active, label, payload }) {
  return <DarkTooltip active={active} label={label} payload={payload} />
}

export function MetricCell({
  accent = 'text-brand',
  className = '',
  label,
  value,
}) {
  return (
    <div className={['min-w-0 rounded-control border border-hairline bg-canvas px-3 py-2.5', className].join(' ')}>
      <p className="text-[10px] font-semibold uppercase leading-4 tracking-[0.07em] text-slate">
        {label}
      </p>
      <p className={`mt-1 break-words font-sans text-[17px] font-bold leading-tight ${accent}`}>
        {value}
      </p>
    </div>
  )
}

export function LegendChip({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas px-2.5 py-1 text-[11px] font-semibold text-slate">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}

export function ProgressMetricRow({
  color = '#4338CA',
  label,
  percent,
  value,
}) {
  const safePercent = Math.max(0, Math.min(100, Number(percent || 0)))

  return (
    <div className="rounded-control bg-mist/80 px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition duration-200 hover:bg-mist">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[12px] font-semibold text-slate">{label}</span>
        <span className="font-sans text-[12px] font-bold tabular-nums text-ink">{value}</span>
      </div>
      <div
        aria-label={`${label}: ${Math.round(safePercent)}%`}
        className="mt-2 h-2 overflow-hidden rounded-full bg-canvas shadow-[inset_0_1px_2px_rgba(20,24,31,0.06)]"
        role="meter"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(safePercent)}
      >
        <div
          className="h-full rounded-full transition-[width,filter] duration-500 ease-out"
          style={{
            background: `linear-gradient(90deg, ${color} 0%, ${color}dd 58%, ${color} 100%)`,
            boxShadow: safePercent > 0 ? `0 4px 12px ${color}33` : 'none',
            width: `${safePercent}%`,
          }}
        />
      </div>
    </div>
  )
}

export function RankingRow({
  children,
  index,
  label,
  meta,
  percent,
  tone = '#4338CA',
  value,
}) {
  const safePercent = Math.max(0, Math.min(100, Number(percent || 0)))

  return (
    <div className="rounded-control border border-hairline bg-canvas p-3 shadow-[0_8px_22px_rgba(20,24,31,0.035)] transition duration-200 hover:border-brand/20 hover:shadow-[0_12px_28px_rgba(67,56,202,0.08)]">
      <div className="grid grid-cols-[28px_minmax(0,1fr)_44px] items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-light font-sans text-[11px] font-bold text-brand">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-ink">{label}</p>
          {meta ? <p className="truncate text-[11px] text-slate">{meta}</p> : null}
        </div>
        {value ? (
          <span className="text-right font-sans text-[12px] font-bold tabular-nums text-ink">
            {value}
          </span>
        ) : null}
      </div>
      <div
        aria-label={`${label}: ${Math.round(safePercent)}%`}
        className="mt-3 h-2 overflow-hidden rounded-full bg-mist shadow-[inset_0_1px_2px_rgba(20,24,31,0.05)]"
        role="meter"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(safePercent)}
      >
        <div
          className="h-full rounded-full transition-[width,filter] duration-500 ease-out"
          style={{
            background: `linear-gradient(90deg, ${tone} 0%, ${tone}dd 58%, ${tone} 100%)`,
            boxShadow: safePercent > 0 ? `0 5px 14px ${tone}35` : 'none',
            width: `${safePercent}%`,
          }}
        />
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}

export function DashboardMiniSparkline({
  areaClassName = 'fill-white/10',
  className = '',
  lineClassName = 'stroke-white/80',
  values,
}) {
  const { areaPoints, linePoints } = buildSparklinePoints(values)

  return (
    <svg
      aria-hidden="true"
      className={className}
      preserveAspectRatio="none"
      viewBox="0 0 320 92"
    >
      <polygon className={areaClassName} points={areaPoints} />
      <polyline
        className={lineClassName}
        fill="none"
        points={linePoints}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
