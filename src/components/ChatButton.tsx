import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { ChatModal } from './ChatModal'

interface ChatButtonProps {
  recipientId: string
  recipientName?: string
  className?: string
}

export function ChatButton({ recipientId, recipientName, className = '' }: ChatButtonProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsChatOpen(true)}
        className={`flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${className}`}
      >
        <MessageCircle className="h-4 w-4" />
        <span>Написать сообщение</span>
      </button>

      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        recipientId={recipientId}
        recipientName={recipientName}
      />
    </>
  )
}
