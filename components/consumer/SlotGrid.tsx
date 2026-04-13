'use client'

interface SlotGridProps {
  slots:    string[]
  selected: string | null
  onSelect: (slot: string) => void
  colour?:  string
}

export default function SlotGrid({ slots, selected, onSelect, colour = '#D4AF37' }: SlotGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map((slot) => {
        const isActive = selected === slot
        return (
          <button
            key={slot}
            onClick={() => onSelect(slot)}
            className="py-2 rounded-xl text-center text-[12px] transition-all duration-150 active:scale-95 focus-visible:outline-none"
            style={{
              background: isActive ? colour : 'rgba(255,255,255,0.07)',
              border:     isActive
                ? `1px solid ${colour}`
                : '1px solid rgba(255,255,255,0.1)',
              color:      isActive ? '#000' : 'rgba(255,255,255,0.8)',
              fontWeight: isActive ? 700 : 500,
              boxShadow:  isActive ? `0 4px 16px ${colour}40` : 'none',
            }}
          >
            {slot}
          </button>
        )
      })}
    </div>
  )
}
