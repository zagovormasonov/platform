// Компонент для отслеживания онлайн статуса
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export function useOnlineStatus() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // Обновляем статус при входе
    const updateOnlineStatus = async () => {
      await supabase
        .from('profiles')
        .update({ 
          last_seen: new Date().toISOString(),
          is_online: true 
        })
        .eq('id', user.id)
    }

    // Обновляем каждые 30 секунд
    const interval = setInterval(updateOnlineStatus, 30000)

    // Устанавливаем офлайн при выходе
    const handleBeforeUnload = async () => {
      await supabase
        .from('profiles')
        .update({ 
          last_seen: new Date().toISOString(),
          is_online: false 
        })
        .eq('id', user.id)
    }

    // Обновляем статус при потере фокуса
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        await supabase
          .from('profiles')
          .update({ is_online: false })
          .eq('id', user.id)
      } else {
        await updateOnlineStatus()
      }
    }

    updateOnlineStatus()
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      // Устанавливаем офлайн при размонтировании
      supabase
        .from('profiles')
        .update({ is_online: false })
        .eq('id', user.id)
    }
  }, [user])
}

// Компонент для отображения статуса
export function OnlineStatusIndicator({ userId }: { userId: string }) {
  const [isOnline, setIsOnline] = useState(false)
  const [lastSeen, setLastSeen] = useState<string | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_online, last_seen')
        .eq('id', userId)
        .single()

      if (data) {
        setIsOnline(data.is_online)
        setLastSeen(data.last_seen)
      }
    }

    fetchStatus()
    
    // Обновляем статус каждые 10 секунд
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [userId])

  const getStatusText = () => {
    if (isOnline) return 'Онлайн'
    
    if (lastSeen) {
      const minutesAgo = Math.floor(
        (new Date().getTime() - new Date(lastSeen).getTime()) / 60000
      )
      
      if (minutesAgo < 1) return 'Был(а) в сети только что'
      if (minutesAgo < 60) return `Был(а) в сети ${minutesAgo} мин назад`
      
      const hoursAgo = Math.floor(minutesAgo / 60)
      if (hoursAgo < 24) return `Был(а) в сети ${hoursAgo} ч назад`
      
      return `Был(а) в сети ${Math.floor(hoursAgo / 24)} дн назад`
    }
    
    return 'Не в сети'
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${
        isOnline ? 'bg-green-500' : 'bg-gray-400'
      }`} />
      <span className="text-sm text-gray-600">
        {getStatusText()}
      </span>
    </div>
  )
}
