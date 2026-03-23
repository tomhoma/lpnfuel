import { useState } from 'react'

const FEEDBACK_URL = 'https://script.google.com/macros/s/AKfycbzHG04vwNASOVIZjkKiwo6OU8gkUQOKg5lF8X86kENf3jc47D5eWPANGqjj6kOvo4ZB/exec'

type FeedbackType = 'แจ้งข้อผิดพลาด' | 'แนะนำ' | 'อื่นๆ'

export default function FeedbackCard() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('แจ้งข้อผิดพลาด')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!message.trim()) return
    setSending(true)
    try {
      await fetch(FEEDBACK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          contact: contact.trim(),
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      })
      setSent(true)
      setMessage('')
      setContact('')
      setTimeout(() => {
        setSent(false)
        setOpen(false)
      }, 2000)
    } catch {
      alert('ส่งไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 text-left"
        >
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4.5 h-4.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">แจ้งปัญหาหรือเสนอแนะ</div>
            <div className="text-xs text-gray-400">ช่วยเราปรับปรุงระบบให้ดีขึ้น</div>
          </div>
          <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center" onClick={() => !sending && setOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 animate-slideUp"
            style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800">แจ้งปัญหาหรือเสนอแนะ</h3>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {sent ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✅</div>
                <div className="text-sm font-semibold text-green-700">ส่งเรียบร้อยแล้ว ขอบคุณครับ</div>
              </div>
            ) : (
              <>
                {/* Type selector */}
                <div className="flex gap-2 mb-4">
                  {(['แจ้งข้อผิดพลาด', 'แนะนำ', 'อื่นๆ'] as FeedbackType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${type === t
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="รายละเอียด..."
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                  autoFocus
                />

                {/* Contact (optional) */}
                <input
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="ช่องทางติดต่อกลับ (ไม่บังคับ)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                />

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || sending}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-[0.98] transition"
                >
                  {sending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      กำลังส่ง...
                    </span>
                  ) : 'ส่งข้อความ'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
