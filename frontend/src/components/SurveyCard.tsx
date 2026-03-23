import { useState, useEffect } from 'react'

const SURVEY_KEY = 'lpnfuel_survey_crowd_v1'
const SURVEY_URL = 'https://script.google.com/macros/s/AKfycbzHG04vwNASOVIZjkKiwo6OU8gkUQOKg5lF8X86kENf3jc47D5eWPANGqjj6kOvo4ZB/exec'

type Vote = 'yes' | 'no'

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
      // silent
    } finally {
      setSending(false)
    }
  }

  // Already voted — compact confirmation
  if (voted) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 shadow-sm border border-green-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-800">รับทราบแล้ว!</div>
            <div className="text-xs text-gray-500">ติดตามความคืบหน้าได้เร็วๆ นี้</div>
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
          <div className="text-sm font-bold text-gray-800">อยากให้เพิ่มระบบ "รายงานจากหน้าปั๊ม" ไหม?</div>
          <div className="text-xs text-gray-500 mt-0.5">
            ให้ชาวลำพูนช่วยอัปเดตสถานะน้ำมัน แบบเรียลไทม์...
          </div>
        </div>
      </div>

      {/* 2 Vote buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleVote('yes')}
          disabled={sending}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm active:scale-95 transition disabled:opacity-50"
        >
          👍 อยากได้
        </button>
        <button
          onClick={() => handleVote('no')}
          disabled={sending}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-semibold text-sm active:scale-95 transition disabled:opacity-50"
        >
          ไม่อยากได้
        </button>
      </div>
    </div>
  )
}
