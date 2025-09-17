import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface TimeSlot {
  id: string
  expert_id: string
  slot_date: string
  start_time: string
  end_time: string
  is_available: boolean
  duration_minutes: number
  expert_name: string
  expert_avatar: string | null
}

interface Service {
  id: string
  service_name: string
  service_description: string
  price: number
  currency: string
}

interface Booking {
  id: string
  expert_id: string
  client_id: string
  slot_id: string
  service_id: string | null
  booking_date: string
  start_time: string
  end_time: string
  total_price: number | null
  status: string
  expert_name: string
  client_name: string
  service_name: string | null
  status_name: string
}

interface ExpertCalendarProps {
  expertId: string
  viewMode?: 'client' | 'expert'
}

export function ExpertCalendar({ expertId, viewMode = 'client' }: ExpertCalendarProps) {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  
  // Модальное окно бронирования
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [selectedService, setSelectedService] = useState<string>('')
  const [bookingNotes, setBookingNotes] = useState('')

  // Получаем даты недели
  const getWeekDates = (date: Date) => {
    const week = []
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay() + 1) // Понедельник
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }
    
    return week
  }

  const weekDates = getWeekDates(currentDate)

  // Загрузка данных
  useEffect(() => {
    loadData()
  }, [expertId, currentDate])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const startDate = weekDates[0].toISOString().split('T')[0]
      const endDate = weekDates[6].toISOString().split('T')[0]

      // Загружаем слоты
      await loadTimeSlots(startDate, endDate)
      
      // Загружаем услуги эксперта
      await loadServices()
      
      // Загружаем бронирования
      if (viewMode === 'expert' && user?.id === expertId) {
        await loadBookings(startDate, endDate)
      }
    } catch (error: any) {
      console.error('Ошибка загрузки данных:', error)
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const loadTimeSlots = async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('available_slots_view')
      .select('*')
      .eq('expert_id', expertId)
      .gte('slot_date', startDate)
      .lte('slot_date', endDate)
      .order('slot_date, start_time')

    if (error) throw error
    setTimeSlots(data || [])
  }

  const loadServices = async () => {
    const { data, error } = await supabase
      .from('expert_services')
      .select('*')
      .eq('expert_id', expertId)
      .eq('is_active', true)

    if (error) throw error
    setServices(data || [])
  }

  const loadBookings = async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('bookings_view')
      .select('*')
      .eq('expert_id', expertId)
      .gte('booking_date', startDate)
      .lte('booking_date', endDate)
      .order('booking_date, start_time')

    if (error) throw error
    setBookings(data || [])
  }

  // Навигация по неделям
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Бронирование слота
  const handleBookSlot = (slot: TimeSlot) => {
    if (!user) {
      setError('Необходимо войти в систему для бронирования')
      return
    }

    if (user.id === expertId) {
      setError('Вы не можете забронировать слот у самого себя')
      return
    }

    setSelectedSlot(slot)
    setSelectedService('')
    setBookingNotes('')
    setShowBookingModal(true)
  }

  // Подтверждение бронирования
  const confirmBooking = async () => {
    if (!selectedSlot || !user) return

    try {
      setBooking(true)
      setError('')

      const service = services.find(s => s.id === selectedService)
      
      const bookingData = {
        expert_id: expertId,
        client_id: user.id,
        slot_id: selectedSlot.id,
        service_id: selectedService || null,
        booking_date: selectedSlot.slot_date,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        duration_minutes: selectedSlot.duration_minutes,
        total_price: service?.price || null,
        currency: service?.currency || 'RUB',
        status: 'pending',
        notes: bookingNotes.trim() || null
      }

      const { error } = await supabase
        .from('bookings')
        .insert([bookingData])

      if (error) throw error

      setMessage('Бронирование успешно создано!')
      setShowBookingModal(false)
      await loadData() // Перезагружаем данные
    } catch (error: any) {
      console.error('Ошибка бронирования:', error)
      setError('Ошибка при создании бронирования')
    } finally {
      setBooking(false)
    }
  }

  // Получение слотов для конкретной даты
  const getSlotsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return timeSlots.filter(slot => slot.slot_date === dateStr)
  }

  // Получение бронирований для конкретной даты
  const getBookingsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return bookings.filter(booking => booking.booking_date === dateStr)
  }

  // Форматирование времени
  const formatTime = (time: string) => {
    return time.substring(0, 5)
  }

  // Форматирование даты
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'short' 
    }
    return date.toLocaleDateString('ru-RU', options)
  }

  const getDayName = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short' }
    return date.toLocaleDateString('ru-RU', options)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold">
              {viewMode === 'expert' ? 'Мои бронирования' : 'Календарь занятий'}
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousWeek}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Сегодня
            </button>
            
            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Сообщения */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        <div className="grid grid-cols-7 gap-4">
          {/* Day Headers */}
          {weekDates.map((date, index) => (
            <div key={index} className="text-center">
              <div className="font-medium text-gray-700">{getDayName(date)}</div>
              <div className={`text-sm ${
                date.toDateString() === new Date().toDateString() 
                  ? 'text-blue-600 font-semibold' 
                  : 'text-gray-500'
              }`}>
                {formatDate(date)}
              </div>
            </div>
          ))}

          {/* Time Slots */}
          {weekDates.map((date, dayIndex) => (
            <div key={dayIndex} className="space-y-2">
              {viewMode === 'expert' ? (
                // Режим эксперта - показываем бронирования
                getBookingsForDate(date).length > 0 ? (
                  getBookingsForDate(date).map(booking => (
                    <div
                      key={booking.id}
                      className={`p-2 rounded text-xs border ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 border-green-300 text-green-800'
                          : booking.status === 'pending'
                          ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                          : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}
                    >
                      <div className="font-medium">
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </div>
                      <div className="text-xs opacity-75">
                        {booking.client_name}
                      </div>
                      {booking.service_name && (
                        <div className="text-xs opacity-75">
                          {booking.service_name}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-400 text-center py-4">
                    Нет бронирований
                  </div>
                )
              ) : (
                // Режим клиента - показываем доступные слоты
                getSlotsForDate(date).length > 0 ? (
                  getSlotsForDate(date).map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => handleBookSlot(slot)}
                      className="w-full p-2 text-xs bg-blue-50 border border-blue-200 text-blue-800 rounded hover:bg-blue-100 transition-colors"
                    >
                      <div className="font-medium">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </div>
                      <div className="text-xs opacity-75">
                        {slot.duration_minutes} мин
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-xs text-gray-400 text-center py-4">
                    Нет доступных слотов
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Бронирование занятия</h3>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600">Дата и время</div>
                  <div className="font-medium">
                    {new Date(selectedSlot.slot_date).toLocaleDateString('ru-RU', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-blue-600">
                    {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Эксперт</div>
                  <div className="font-medium">{selectedSlot.expert_name}</div>
                </div>

                {services.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Выберите услугу
                    </label>
                    <select
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Без привязки к услуге</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.service_name} - {service.price}₽
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Комментарий (опционально)
                  </label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Дополнительная информация о занятии"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={confirmBooking}
                    disabled={booking}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {booking ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                        Бронирование...
                      </>
                    ) : (
                      'Забронировать'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
