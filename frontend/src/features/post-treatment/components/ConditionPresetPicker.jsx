import { describeSchedule } from '@shared/lib/scheduleBuilder'

export function ConditionPresetPicker({
  onCustom,
  onSelect,
  presets = [],
  selectedId,
}) {
  const safePresets = Array.isArray(presets) ? presets : []

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {safePresets.map((preset) => {
        const selected = String(selectedId) === String(preset.id)

        return (
          <button
            className={[
              'min-w-[140px] rounded-card border bg-canvas px-4 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
              selected
                ? 'border-brand bg-brand-light/60'
                : 'border-hairline hover:border-brand hover:bg-brand-light/20',
            ].join(' ')}
            key={preset.id}
            onClick={() => onSelect?.(preset)}
            type="button"
          >
            <p className="truncate text-[13px] font-semibold text-ink">
              {preset.condition_name}
            </p>
            <p className="mt-1 line-clamp-2 text-[11px] font-normal leading-4 text-slate">
              {describeSchedule(preset)}
            </p>
          </button>
        )
      })}

      <button
        className={[
          'min-w-[140px] rounded-card border bg-canvas px-4 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
          selectedId === 'custom'
            ? 'border-brand bg-brand-light/60'
            : 'border-hairline hover:border-brand hover:bg-brand-light/20',
        ].join(' ')}
        onClick={onCustom}
        type="button"
      >
        <p className="text-[13px] font-semibold text-ink">Custom</p>
        <p className="mt-1 text-[11px] font-normal leading-4 text-slate">
          Build from scratch
        </p>
      </button>
    </div>
  )
}

export default ConditionPresetPicker
