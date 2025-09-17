import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Calendar, Clock, Plus, Trash2 } from 'lucide-react'

interface ScheduleSlot {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
  duration_minutes: number
  is_active: boolean
}

const DAYS_OF_WEEK = [
  { value: 1, name: 'Понедельник' },
  { value: 2, name: 'Вторник' },
  { value: 3, name: 'Среда' },
  { value: 4, name: 'Четверг' },
  { value: 5, name: 'Пятница' },
  { value: 6, name: 'Суббота' },
  { value: 0, name: 'Воскресенье' }
]

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
]

interface ExpertScheduleProps {
  expertId: string
}

export function ExpertSchedule({ expertId }: ExpertScheduleProps) {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Новое расписание
  const [newSchedule, setNewSchedule] = useState<ScheduleSlot>({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '18:00',
    duration_minutes: 60,
    is_active: true
  })

  // Загрузка расписания
  useEffect(() => {
    fetchSchedule()
  }, [expertId])

  const fetchSchedule = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('expert_schedule')
        .select('*')
        .eq('expert_id', expertId)
        .order('day_of_week, start_time')

      if (error) throw error
      setSchedules(data || [])
    } catch (error: any) {
      console.error('Ошибка загрузки расписания:', error)
      setError('Ошибка загрузки расписания')
    } finally {
      setLoading(false)
    }
  }

  // Добавление нового слота расписания
  const handleAddSchedule = async () => {
    if (!user || user.id !== expertId) {
      setError('Недостаточно прав для изменения расписания')
      return
    }

    try {
      setSaving(true)
      setError('')

      // Проверяем пересечения времени
      const conflictingSchedule = schedules.find(schedule => 
        schedule.day_of_week === newSchedule.day_of_week &&
        schedule.is_active &&
        (
          (newSchedule.start_time >= schedule.start_time && newSchedule.start_time < schedule.end_time) ||
          (newSchedule.end_time > schedule.start_time && newSchedule.end_time <= schedule.end_time) ||
          (newSchedule.start_time <= schedule.start_time && newSchedule.end_time >= schedule.end_time)
        )
      )

      if (conflictingSchedule) {
        setError('Время пересекается с существующим расписанием')
        return
      }

      const { data, error } = await supabase
        .from('expert_schedule')
        .insert([{
          expert_id: expertId,
          ...newSchedule
        }])
        .select()

      if (error) throw error

      if (data && data[0]) {
        setSchedules([...schedules, data[0]])
        setNewSchedule({
          day_of_week: 1,
          start_time: '09:00',
          end_time: '18:00',
          duration_minutes: 60,
          is_active: true
        })
        setMessage('Расписание добавлено')
        
        // Генерируем слоты на ближайшие 30 дней
        await generateTimeSlots()
      }
    } catch (error: any) {
      console.error('Ошибка добавления расписания:', error)
      setError('Ошибка добавления расписания')
    } finally {
      setSaving(false)
    }
  }

  // Удаление слота расписания
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!user || user.id !== expertId) {
      setError('Недостаточно прав для изменения расписания')
      return
    }

    try {
      setSaving(true)
      setError('')

      const { error } = await supabase
        .from('expert_schedule')
        .delete()
        .eq('id', scheduleId)

      if (error) throw error

      setSchedules(schedules.filter(s => s.id !== scheduleId))
      setMessage('Расписание удалено')

      // Перегенерируем слоты
      await generateTimeSlots()
    } catch (error: any) {
      console.error('Ошибка удаления расписания:', error)
      setError('Ошибка удаления расписания')
    } finally {
      setSaving(false)
    }
  }

  // Переключение активности расписания
  const toggleScheduleActive = async (scheduleId: string, isActive: boolean) => {
    if (!user || user.id !== expertId) {
      setError('Недостаточно прав для изменения расписания')
      return
    }

    try {
      setSaving(true)
      setError('')

      const { error } = await supabase
        .from('expert_schedule')
        .update({ is_active: isActive })
        .eq('id', scheduleId)

      if (error) throw error

      setSchedules(schedules.map(s => 
        s.id === scheduleId ? { ...s, is_active: isActive } : s
      ))
      setMessage(isActive ? 'Расписание активировано' : 'Расписание деактивировано')

      // Перегенерируем слоты
      await generateTimeSlots()
    } catch (error: any) {
      console.error('Ошибка обновления расписания:', error)
      setError('Ошибка обновления расписания')
    } finally {
      setSaving(false)
    }
  }

  // Генерация временных слотов
  const generateTimeSlots = async () => {
    try {
      const startDate = new Date().toISOString().split('T')[0]
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const { error } = await supabase
        .rpc('generate_time_slots', {
          p_expert_id: expertId,
          p_start_date: startDate,
          p_end_date: endDate
        })

      if (error) throw error
    } catch (error: any) {
      console.error('Ошибка генерации слотов:', error)
    }
  }

  // Получение названия дня недели
  const getDayName = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find(day => day.value === dayOfWeek)?.name || 'Неизвестно'
  }

  // Форматирование времени
  const formatTime = (time: string) => {
    return time.substring(0, 5)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Calendar className="h-6 w-6 text-blue-600" />
        <h3 className="text-xl font-semibold">Расписание занятий</h3>
      </div>

      {/* Сообщения */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {message}
        </div>
      )}

      {/* Форма добавления нового расписания */}
      {user?.id === expertId && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-lg font-medium mb-4">Добавить расписание</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                День недели
              </label>
              <select
                value={newSchedule.day_of_week}
                onChange={(e) => setNewSchedule({
                  ...newSchedule,
                  day_of_week: parseInt(e.target.value)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DAYS_OF_WEEK.map(day => (
                  <option key={day.value} value={day.value}>
                    {day.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Время начала
              </label>
              <select
                value={newSchedule.start_time}
                onChange={(e) => setNewSchedule({
                  ...newSchedule,
                  start_time: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIME_SLOTS.map(time => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Время окончания
              </label>
              <select
                value={newSchedule.end_time}
                onChange={(e) => setNewSchedule({
                  ...newSchedule,
                  end_time: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIME_SLOTS.filter(time => time > newSchedule.start_time).map(time => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Длительность занятия (мин)
              </label>
              <select
                value={newSchedule.duration_minutes}
                onChange={(e) => setNewSchedule({
                  ...newSchedule,
                  duration_minutes: parseInt(e.target.value)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={30}>30 минут</option>
                <option value={45}>45 минут</option>
                <option value={60}>1 час</option>
                <option value={90}>1.5 часа</option>
                <option value={120}>2 часа</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddSchedule}
            disabled={saving}
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Сохранение...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Добавить расписание
              </>
            )}
          </button>
        </div>
      )}

      {/* Список расписаний */}
      <div className="space-y-4">
        {schedules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Расписание не настроено</p>
            {user?.id === expertId && (
              <p className="text-sm">Добавьте дни и время для проведения занятий</p>
            )}
          </div>
        ) : (
          schedules.map(schedule => (
            <div
              key={schedule.id}
              className={`p-4 border rounded-lg ${
                schedule.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    schedule.is_active ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                  
                  <div>
                    <h4 className="font-medium">{getDayName(schedule.day_of_week)}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
                      <span>•</span>
                      <span>{schedule.duration_minutes} мин/занятие</span>
                    </div>
                  </div>
                </div>

                {user?.id === expertId && (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => toggleScheduleActive(schedule.id!, !schedule.is_active)}
                      disabled={saving}
                      className={`px-3 py-1 text-sm rounded ${
                        schedule.is_active
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      } disabled:opacity-50`}
                    >
                      {schedule.is_active ? 'Деактивировать' : 'Активировать'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSchedule(schedule.id!)}
                      disabled={saving}
                      className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      title="Удалить расписание"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
