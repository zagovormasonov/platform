import { UserProfile } from './UserProfile'

interface ExpertProfileProps {
  expertId: string
  onClose: () => void
}

export function ExpertProfile({ expertId, onClose }: ExpertProfileProps) {
  return <UserProfile userId={expertId} onClose={onClose} />
}