import { useState, useEffect } from 'react'

const SURVEY_KEY = 'lpnfuel_survey_crowd_v1'
const SURVEY_URL = 'https://script.google.com/macros/s/AKfycbzHG04vwNASOVIZjkKiwo6OU8gkUQOKg5lF8X86kENf3jc47D5eWPANGqjj6kOvo4ZB/exec'

type Vote = 'yes' | 'maybe' | 'no'

const OPTIONS: { value: Vote; emoji: string; label: string; color: string }[] = [
  { value: 'yes', emoji: '🙌', label: 'อยากได้มาก', color: 'bg-green-500' },
  { value: 'maybe', emoji: '🤔', label: 'น่าสนใจ', color: 'bg-yellow-500' },
  { value: 'no', emoji: '😐', label: 'ไม่จำเป็น', color: 'bg-gray-400' },
]

export default function SurveyCard() {
  const [voted, setVoted] = useState<Vote | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(SURVEY_KEY)
    if (saved) setVoted(saved as Vote)
  }, [])

  const handleVote = async (vote: Vote) => {
    setVoted(vote)
    localStorage.setItem(SURVEY_KEY, vote)
    setSending(true)
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
      // silent fail — vote already saved locally
    } finally {
      setSending(false)
    }
  }

  // Already voted — show compact thank you
  if (voted) {
    const chosen = OPTIONS.find(o => o.value === voted)!
    return (
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 shadow-sm border border-orange-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{chosen.emoji}</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-800">ขอบคุณที่โหวต!</div>
            <div className="text-xs text-gray-500">คุณเลือก "{chosen.label}" — เราจะนำไปพัฒนาต่อ</div>
          </div>
          <button
            onClick={() => { localStorage.removeItem(SURVEY_KEY); setVoted(null) }}
            className="text-[10px] text-gray-400 underline"
          >
            เปลี่ยน
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 shadow-sm border border-orange-100">
      {/* Question */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl flex-shrink-0">📢</span>
        <div>
          <div className="text-sm font-bold text-gray-800">อยากให้เพิ่มฟีเจอร์ "รายงานจากผู้ใช้" ไหม?</div>
          <div className="text-xs text-gray-500 mt-0.5">
            ให้คนขับรถช่วยรายงานสถานะน้ำมันแบบ real-time
          </div>
        </div>
      </div>

      {/* Vote buttons */}
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleVote(opt.value)}
            disabled={sending}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white border border-gray-200 active:scale-95 transition hover:border-orange-300 disabled:opacity-50"
          >
            <span className="text-xl">{opt.emoji}</span>
            <span className="text-[11px] font-medium text-gray-700">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
