// Заглушка для Supabase - используется PostgreSQL через backend API
export const supabase = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  from: () => ({
    select: () => ({ eq: () => ({ data: [], error: null }) }),
    insert: () => ({ data: [], error: null }),
    update: () => ({ eq: () => ({ data: [], error: null }) }),
    delete: () => ({ eq: () => ({ data: [], error: null }) })
  }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } })
    })
  },
  rpc: async () => ({ data: null, error: null }),
  channel: () => ({
    on: () => ({ subscribe: () => {} }),
    subscribe: () => {}
  }),
  removeChannel: () => {}
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          website_url: string | null
          github_url: string | null
          linkedin_url: string | null
          twitter_url: string | null
          instagram_url: string | null
          telegram_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website_url?: string | null
          github_url?: string | null
          linkedin_url?: string | null
          twitter_url?: string | null
          instagram_url?: string | null
          telegram_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website_url?: string | null
          github_url?: string | null
          linkedin_url?: string | null
          twitter_url?: string | null
          instagram_url?: string | null
          telegram_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      articles: {
        Row: {
          id: string
          title: string
          content: string
          author_id: string
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          author_id: string
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          author_id?: string
          published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      friendships: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
