import { useState, useEffect } from 'react'

const SURVEY_KEY = 'lpnfuel_survey_crowd_v1'
const DISMISS_KEY = 'lpnfuel_survey_crowd_v1_dismiss'
const SURVEY_URL = 'https://script.google.com/macros/s/AKfycbzHG04vwNASOVIZjkKiwo6OU8gkUQOKg5lF8X86kENf3jc47D5eWPANGqjj6kOvo4ZB/exec'

type Vote = 'yes' | 'maybe' | 'no'

const OPTIONS: { value: Vote; emoji: string; label: string }[] = [
  { value: 'yes', emoji: '🙌', label: 'อยากได้มาก' },
  { value: 'maybe', emoji: '🤔', label: 'น่าสนใจ' },
  { value: 'no', emoji: '😐', label: 'ไม่จำเป็น' },
]

export default function SurveyPopup() {
  const [show, setShow] = useState(false)
  const [voted, setVoted] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    // Don't show if already voted or dismissed
    const alreadyVoted = localStorage.getItem(SURVEY_KEY)
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (alreadyVoted || dismissed) return

    // Show after 2s delay (after splash settles)
    const timer = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleVote = async (vote: Vote) => {
    setSending(true)
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
    } finally {
      setSending(false)
    }
    setVoted(true)
    setTimeout(() => setShow(false), 1500)
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6" onClick={handleDismiss}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl p-5 w-full max-w-xs shadow-2xl animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {voted ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-sm font-semibold text-gray-800">ขอบคุณที่โหวต!</div>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">📢</div>
              <div className="text-sm font-bold text-gray-800">อยากให้เพิ่มฟีเจอร์<br />"รายงานจากผู้ใช้" ไหม?</div>
              <div className="text-xs text-gray-500 mt-1">
                ให้คนขับรถช่วยรายงานสถานะน้ำมันแบบ real-time
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleVote(opt.value)}
                  disabled={sending}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl bg-gray-50 border border-gray-200 active:scale-95 transition hover:border-orange-300 disabled:opacity-50"
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-[11px] font-medium text-gray-700">{opt.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
