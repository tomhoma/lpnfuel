import { useState, useEffect } from 'react'

const SURVEY_KEY = 'lpnfuel_survey_crowd_v1'
const SURVEY_URL = 'https://script.google.com/macros/s/AKfycbzHG04vwNASOVIZjkKiwo6OU8gkUQOKg5lF8X86kENf3jc47D5eWPANGqjj6kOvo4ZB/exec'

type Vote = 'yes' | 'no'

export default function SurveyPopup() {
  const [show, setShow] = useState(false)
  const [phase, setPhase] = useState<'vote' | 'sending' | 'thanks'>('vote')

  useEffect(() => {
    // Only skip if already VOTED — dismiss just closes for this session
    const alreadyVoted = localStorage.getItem(SURVEY_KEY)
    if (alreadyVoted) return

    const timer = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleVote = async (vote: Vote) => {
    setPhase('sending')
    localStorage.setItem(SURVEY_KEY, vote)
    try {
      await fetch(SURVEY_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'survey_crowd_report',
          message: `vote: ${vote}`,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      })
    } catch {
      // silent
    }
    setPhase('thanks')
    setTimeout(() => setShow(false), 3000)
  }

  // Dismiss = close this session only, will show again next visit
  const handleDismiss = () => {
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={phase === 'vote' ? handleDismiss : undefined} />
      <div
        className="relative bg-white rounded-2xl w-full max-w-[300px] shadow-2xl animate-popIn overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* === SENDING STATE === */}
        {phase === 'sending' && (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-sm text-gray-500">กำลังส่ง...</span>
          </div>
        )}

        {/* === THANK YOU STATE === */}
        {phase === 'thanks' && (
          <div className="text-center pt-6 pb-8 px-6">
            <img
              src="/logo.png"
              alt="LPN Fuel"
              className="w-40 h-40 mx-auto mb-4 object-contain drop-shadow-lg"
            />
            <div className="text-xl font-bold text-gray-800 mb-2">รับทราบแล้ว!</div>
            <div className="text-sm text-gray-500 mb-1">
              ทุกเสียงของชาวลำพูนมีความหมาย
            </div>
            <div className="text-xs text-gray-400 mb-5">
              ติดตามความคืบหน้าได้เร็วๆ นี้
            </div>
            <button
              onClick={() => setShow(false)}
              className="px-6 py-2 rounded-full bg-gray-100 text-sm text-gray-600 font-medium active:scale-95 transition"
            >
              ปิด
            </button>
          </div>
        )}

        {/* === VOTE STATE === */}
        {phase === 'vote' && (
          <>
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center z-10"
            >
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Cow mascot header */}
            <div className="bg-gradient-to-b from-green-50 to-white pt-4 pb-2 flex justify-center">
              <img
                src="/logo.png"
                alt="LPN Fuel"
                className="w-40 h-40 object-contain drop-shadow-lg"
              />
            </div>

            {/* Content */}
            <div className="px-5 pb-5">
              <div className="text-center mb-4">
                <div className="text-[15px] font-bold text-gray-800 leading-snug">
                  อยากให้เพิ่มระบบ<br />
                  "รายงานจากหน้าปั๊ม" ไหม?
                </div>
                <div className="text-xs text-gray-500 mt-1.5">
                  ให้ชาวลำพูนช่วยอัปเดตสถานะน้ำมัน<br />
                  แบบเรียลไทม์...
                </div>
              </div>

              {/* 2 buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleVote('yes')}
                  className="py-3 rounded-xl bg-green-500 text-white font-semibold text-sm active:scale-95 transition shadow-sm"
                >
                  👍 อยากได้
                </button>
                <button
                  onClick={() => handleVote('no')}
                  className="py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm active:scale-95 transition"
                >
                  ไม่อยากได้
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
