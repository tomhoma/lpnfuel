import { useState, useEffect } from 'react'

export default function SurveyPopup() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Show after splash screen finishes (1.5s delay)
    const showTimer = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(showTimer)
  }, [])

  useEffect(() => {
    if (!show) return
    // Auto-dismiss after 5 seconds
    const dismissTimer = setTimeout(() => setShow(false), 5000)
    return () => clearTimeout(dismissTimer)
  }, [show])

  if (!show) return null

  return (
    <div
      className="fixed top-[calc(env(safe-area-inset-top)+56px)] left-1/2 -translate-x-1/2 z-[2000] w-[calc(100%-24px)] max-w-md animate-slideDown"
      onClick={() => setShow(false)}
    >
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
        {/* Logo */}
        <img src="/logo.png" alt="LPN Fuel" className="w-10 h-10 object-contain flex-shrink-0 drop-shadow" />

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white leading-tight">
            ชาวลำพูนช่วยกันอัพเดท!
          </div>
          <div className="text-[11px] text-white/80 mt-0.5 leading-snug">
            กดรายงานสถานะน้ำมัน ยิ่งอัพเดทเยอะ ข้อมูลยิ่งแม่นยำ 💪
          </div>
        </div>

        {/* Close */}
        <button
          onClick={(e) => { e.stopPropagation(); setShow(false) }}
          className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      <div className="mx-4 mt-0">
        <div className="h-0.5 bg-white/30 rounded-full overflow-hidden">
          <div className="h-full bg-white/70 rounded-full animate-shrinkBar" />
        </div>
      </div>
    </div>
  )
}
