import { useState, useEffect } from 'react'

export default function SurveyPopup() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const showTimer = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(showTimer)
  }, [])

  useEffect(() => {
    if (!show) return
    const dismissTimer = setTimeout(() => setShow(false), 5000)
    return () => clearTimeout(dismissTimer)
  }, [show])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-8" onClick={() => setShow(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Card */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[280px] overflow-hidden animate-popIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={() => setShow(false)}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center z-10"
        >
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Logo */}
        <div className="bg-gradient-to-b from-green-50 to-white pt-5 pb-2 flex justify-center">
          <img src="/logo.png" alt="LPN Fuel" className="w-24 h-24 object-contain drop-shadow-lg" />
        </div>

        {/* Text */}
        <div className="text-center px-5 pb-4">
          <div className="text-[15px] font-bold text-gray-800 leading-snug">
            ชาวลำพูนช่วยกันอัพเดท!
          </div>
          <div className="text-xs text-gray-500 mt-1.5 leading-relaxed">
            กดรายงานสถานะน้ำมัน<br />
            ยิ่งอัพเดทเยอะ ข้อมูลยิ่งแม่นยำ 💪
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-5 pb-4">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full animate-shrinkBar" />
          </div>
        </div>
      </div>
    </div>
  )
}
