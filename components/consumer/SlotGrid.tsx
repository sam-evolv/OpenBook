'use client'

interface SlotGridProps {
  slots:    string[]
  selected: string | null
  onSelect: (slot: string) => void
}

export default function SlotGrid({ slots, selected, onSelect }: SlotGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map((slot) => {
        const isActive = selected === slot
        return (
          <button
            key={slot}
            onClick={() => onSelect(slot)}
            className="py-2 rounded-xl text-center text-[12px] border transition-all duration-150 active:scale-95 focus-visible:outline-none"
            style={{
              background: isActive ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.08)',
              border:     isActive
                ? '1px solid #D4AF37'
                : '1px solid rgba(255,255,255,0.15)',
              color:      isActive ? '#fff' : 'rgba(255,255,255,0.8)',
              fontWeight: isActive ? 700 : 500,
            }}
          >
            {slot}
          </button>
        )
      })}
    </div>
  )
}
