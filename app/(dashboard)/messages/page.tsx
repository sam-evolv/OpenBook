import { mockMessages } from '@/lib/mock-data'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

const avatarColors = ['#D4AF37', '#60A5FA', '#34D399', '#F87171', '#A78BFA']

export default function MessagesPage() {
  const sorted = [...mockMessages].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-premium border border-gray-100 shadow-card overflow-hidden">
        <div className="divide-y divide-gray-50">
          {sorted.map((thread, idx) => {
            const color = avatarColors[idx % avatarColors.length]
            const initials = getInitials(thread.customerName)

            return (
              <div
                key={thread.id}
                className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
              >
                {/* Avatar with unread dot */}
                <div className="relative shrink-0">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-full text-white text-[13px] font-bold"
                    style={{ backgroundColor: color }}
                  >
                    {initials}
                  </div>
                  {thread.unread && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
                  )}
                </div>

                {/* Thread info */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-[14px] truncate leading-tight',
                      thread.unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                    )}
                  >
                    {thread.customerName}
                  </p>
                  <p
                    className={cn(
                      'text-[12px] truncate mt-0.5',
                      thread.unread ? 'text-gray-600' : 'text-gray-400'
                    )}
                  >
                    {thread.preview}
                  </p>
                </div>

                {/* Timestamp */}
                <span className="text-[11px] text-gray-400 shrink-0 self-start mt-0.5">
                  {formatRelativeTime(thread.timestamp)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
