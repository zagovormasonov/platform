// Заглушка для Supabase - используется PostgreSQL через backend API
export const supabase = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        data: [],
        error: null,
        single: () => ({ data: null, error: null }),
        order: (column: string, options?: any) => ({
          data: [],
          error: null
        }),
        neq: (column: string, value: any) => ({
          data: [],
          error: null
        }),
        or: (condition: string) => ({
          data: [],
          error: null,
          in: (column: string, values: any[]) => ({
            data: [],
            error: null
          })
        }),
        in: (column: string, values: any[]) => ({
          data: [],
          error: null
        })
      }),
      data: [],
      error: null,
      single: () => ({ data: null, error: null }),
      order: (column: string, options?: any) => ({
        data: [],
        error: null
      }),
      neq: (column: string, value: any) => ({
        data: [],
        error: null
      }),
      or: (condition: string) => ({
        data: [],
        error: null,
        in: (column: string, values: any[]) => ({
          data: [],
          error: null
        })
      }),
      in: (column: string, values: any[]) => ({
        data: [],
        error: null
      })
    }),
    insert: (data: any) => ({
      data: [],
      error: null,
      select: () => ({
        data: [],
        error: null
      })
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        data: [],
        error: null
      }),
      data: [],
      error: null
    }),
    delete: () => ({
      eq: (column: string, value: any) => ({
        data: [],
        error: null
      }),
      data: [],
      error: null
    })
  }),
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File, options?: any) => ({ 
        data: null, 
        error: null 
      }),
      getPublicUrl: (path: string) => ({ 
        data: { publicUrl: '' } 
      })
    })
  },
  rpc: async (functionName: string, params?: any) => ({ 
    data: null, 
    error: null 
  }),
  channel: (name: string) => ({
    on: (event: string, callback: (payload: any) => void) => ({
      subscribe: (callback?: (status: string) => void) => {}
    }),
    subscribe: (callback?: (status: string) => void) => {}
  }),
  removeChannel: (channel: any) => {}
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
