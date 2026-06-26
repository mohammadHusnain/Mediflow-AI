/* src/shared/components/chat/TypingIndicator.jsx - Animated received-message typing bubble. */
export function TypingIndicator({ label = '' }) {
  return (
    <div className="flex justify-start">
      <div className="rounded-[18px] rounded-bl-[4px] bg-mist px-4 py-2">
        {label ? (
          <p className="mb-1 text-[11px] font-medium text-brand">{label}</p>
        ) : null}
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((index) => (
            <div
              className="h-2 w-2 animate-bounce rounded-full bg-slate/40"
              key={index}
              style={{
                animationDelay: `${index * 0.15}s`,
                animationDuration: '0.8s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default TypingIndicator
