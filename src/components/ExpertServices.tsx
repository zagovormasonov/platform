import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

interface Service {
  id: string
  service_name: string
  service_description: string | null
  price: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ExpertServicesProps {
  expertId: string
}

export function ExpertServices({ expertId }: ExpertServicesProps) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  
  // Состояние для добавления новой услуги
  const [showAddForm, setShowAddForm] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [newServiceDescription, setNewServiceDescription] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')
  
  // Состояние для редактирования услуги
  const [editingService, setEditingService] = useState<string | null>(null)
  const [editServiceName, setEditServiceName] = useState('')
  const [editServiceDescription, setEditServiceDescription] = useState('')
  const [editServicePrice, setEditServicePrice] = useState('')

  useEffect(() => {
    fetchServices()
  }, [expertId])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('expert_services')
        .select('*')
        .eq('expert_id', expertId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Ошибка загрузки услуг:', error)
        setError('Не удалось загрузить услуги')
        return
      }

      setServices(data || [])
    } catch (err) {
      console.error('Ошибка загрузки услуг:', err)
      setError('Произошла ошибка при загрузке услуг')
    } finally {
      setLoading(false)
    }
  }

  const validatePrice = (price: string): boolean => {
    const numPrice = parseInt(price)
    return !isNaN(numPrice) && numPrice >= 100 && numPrice <= 20000
  }

  const handleAddService = async () => {
    if (!newServiceName.trim()) {
      setError('Название услуги обязательно')
      return
    }

    if (!validatePrice(newServicePrice)) {
      setError('Цена должна быть от 100 до 20000 рублей')
      return
    }

    try {
      setSaving(true)
      setError('')

      const { error } = await supabase
        .from('expert_services')
        .insert({
          expert_id: expertId,
          service_name: newServiceName.trim(),
          service_description: newServiceDescription.trim() || null,
          price: parseInt(newServicePrice),
          currency: 'RUB'
        })

      if (error) {
        console.error('Ошибка добавления услуги:', error)
        setError('Не удалось добавить услугу')
        return
      }

      setMessage('Услуга успешно добавлена')
      setNewServiceName('')
      setNewServiceDescription('')
      setNewServicePrice('')
      setShowAddForm(false)
      fetchServices()
    } catch (err) {
      console.error('Ошибка добавления услуги:', err)
      setError('Произошла ошибка при добавлении услуги')
    } finally {
      setSaving(false)
    }
  }

  const handleEditService = async (serviceId: string) => {
    if (!editServiceName.trim()) {
      setError('Название услуги обязательно')
      return
    }

    if (!validatePrice(editServicePrice)) {
      setError('Цена должна быть от 100 до 20000 рублей')
      return
    }

    try {
      setSaving(true)
      setError('')

      const { error } = await supabase
        .from('expert_services')
        .update({
          service_name: editServiceName.trim(),
          service_description: editServiceDescription.trim() || null,
          price: parseInt(editServicePrice)
        })
        .eq('id', serviceId)

      if (error) {
        console.error('Ошибка обновления услуги:', error)
        setError('Не удалось обновить услугу')
        return
      }

      setMessage('Услуга успешно обновлена')
      setEditingService(null)
      fetchServices()
    } catch (err) {
      console.error('Ошибка обновления услуги:', err)
      setError('Произошла ошибка при обновлении услуги')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) {
      return
    }

    try {
      setSaving(true)
      setError('')

      const { error } = await supabase
        .from('expert_services')
        .delete()
        .eq('id', serviceId)

      if (error) {
        console.error('Ошибка удаления услуги:', error)
        setError('Не удалось удалить услугу')
        return
      }

      setMessage('Услуга успешно удалена')
      fetchServices()
    } catch (err) {
      console.error('Ошибка удаления услуги:', err)
      setError('Произошла ошибка при удалении услуги')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (service: Service) => {
    setEditingService(service.id)
    setEditServiceName(service.service_name)
    setEditServiceDescription(service.service_description || '')
    setEditServicePrice(service.price.toString())
  }

  const cancelEdit = () => {
    setEditingService(null)
    setEditServiceName('')
    setEditServiceDescription('')
    setEditServicePrice('')
  }

  const cancelAdd = () => {
    setShowAddForm(false)
    setNewServiceName('')
    setNewServiceDescription('')
    setNewServicePrice('')
    setError('')
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Загрузка услуг...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Мои услуги</h3>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Добавить услугу</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      {/* Add Service Form */}
      {showAddForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-900 mb-4">Добавить новую услугу</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название услуги *
              </label>
              <input
                type="text"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                className="input-field"
                placeholder="Например: Консультация по астрологии"
                maxLength={100}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание услуги
              </label>
              <textarea
                value={newServiceDescription}
                onChange={(e) => setNewServiceDescription(e.target.value)}
                className="input-field min-h-[80px] resize-y"
                placeholder="Подробное описание услуги..."
                maxLength={500}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цена (руб.) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold">₽</span>
                <input
                  type="number"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  className="input-field pl-10"
                  placeholder="1000"
                  min="100"
                  max="20000"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Цена от 100 до 20000 рублей
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleAddService}
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Сохранение...' : 'Сохранить'}</span>
              </button>
              <button
                type="button"
                onClick={cancelAdd}
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Отмена</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Services List */}
      {services.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <span className="text-6xl mx-auto mb-4 text-gray-300">₽</span>
          <p>У вас пока нет услуг</p>
          <p className="text-sm">Добавьте первую услугу, чтобы клиенты могли с вами связаться</p>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((service) => (
            <div key={service.id} className="border border-gray-200 rounded-lg p-4">
              {editingService === service.id ? (
                // Edit Form
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Название услуги *
                    </label>
                    <input
                      type="text"
                      value={editServiceName}
                      onChange={(e) => setEditServiceName(e.target.value)}
                      className="input-field"
                      maxLength={100}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Описание услуги
                    </label>
                    <textarea
                      value={editServiceDescription}
                      onChange={(e) => setEditServiceDescription(e.target.value)}
                      className="input-field min-h-[80px] resize-y"
                      maxLength={500}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Цена (руб.) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold">₽</span>
                      <input
                        type="number"
                        value={editServicePrice}
                        onChange={(e) => setEditServicePrice(e.target.value)}
                        className="input-field pl-10"
                        min="100"
                        max="20000"
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => handleEditService(service.id)}
                      disabled={saving}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      <span>{saving ? 'Сохранение...' : 'Сохранить'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span>Отмена</span>
                    </button>
                  </div>
                </div>
              ) : (
                // Service Display
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {service.service_name}
                    </h4>
                    {service.service_description && (
                      <p className="text-gray-600 mb-3">
                        {service.service_description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <span className="text-green-600 font-bold">₽</span>
                        <span className="font-medium text-gray-900">
                          {service.price.toLocaleString()}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        service.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {service.is_active ? 'Активна' : 'Неактивна'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button
                      type="button"
                      onClick={() => startEdit(service)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Редактировать"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(service.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
