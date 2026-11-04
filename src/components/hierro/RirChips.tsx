interface Props {
  value?: number | null
  onChange: (rir: number | null) => void
}

const OPTIONS: Array<number | null> = [null, 0, 1, 2, 3]

export default function RirChips({ value, onChange }: Props) {
  return (
    <div className="rir-chips" role="group" aria-label="RIR de la serie">
      {OPTIONS.map((v) => {
        const active = v === null ? value == null : value === v
        return (
          <button
            key={String(v)}
            type="button"
            className={active ? 'on' : ''}
            aria-pressed={active}
            aria-label={
              v === null
                ? 'Sin RIR'
                : v === 3
                  ? 'RIR 3 o más'
                  : `RIR ${v}`
            }
            onClick={() => onChange(v)}
          >
            {v === null ? '—' : v === 3 ? '3+' : v}
          </button>
        )
      })}
    </div>
  )
}
