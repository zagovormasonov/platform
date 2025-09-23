// Заглушка для Supabase - используется PostgreSQL через backend API
// Возвращает пустые данные, чтобы избежать ошибок TypeScript
const createEmptyResponse = () => ({ data: [], error: null })
const createEmptySingleResponse = () => ({ data: null, error: null })

// Создаем заглушку для Promise-подобного объекта с полной цепочкой методов
const createQueryBuilder = (response: any) => {
  const builder = {
    ...response,
    eq: (_column: string, _value: any) => createQueryBuilder(response),
    neq: (_column: string, _value: any) => createQueryBuilder(response),
    or: (_condition: string) => createQueryBuilder(response),
    in: (_column: string, _values: any[]) => createQueryBuilder(response),
    limit: (_count: number) => createQueryBuilder(response),
    gte: (_column: string, _value: any) => createQueryBuilder(response),
    not: (_column: string, _operator: string, _value: any) => createQueryBuilder(response),
    order: (_column: string, _options?: any) => createQueryBuilder(response),
    single: () => createQueryBuilder(createEmptySingleResponse()),
    select: () => createQueryBuilder(response),
    then: (callback: (result: any) => void) => {
      callback(response)
      return Promise.resolve(response)
    }
  }
  return builder
}

export const supabase = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  from: (_table: string) => ({
    select: (_columns?: string) => {
      const response = createEmptyResponse()
      return createQueryBuilder(response)
    },
    insert: (_data: any) => ({
      data: [],
      error: null,
      select: () => createEmptyResponse()
    }),
    update: (_data: any) => ({
      eq: (_column: string, _value: any) => createEmptyResponse(),
      data: [],
      error: null
    }),
    delete: () => ({
      eq: (_column: string, _value: any) => createEmptyResponse(),
      data: [],
      error: null
    })
  }),
  storage: {
    from: (_bucket: string) => ({
      upload: async (_path: string, _file: File, _options?: any) => ({ 
        data: null, 
        error: null 
      }),
      getPublicUrl: (_path: string) => ({ 
        data: { publicUrl: '' } 
      })
    })
  },
  rpc: async (_functionName: string, _params?: any) => ({ 
    data: null, 
    error: null 
  }),
  channel: (_name: string) => ({
    on: (_event: string, _callback: (payload: any) => void) => ({
      subscribe: (_callback?: (status: string) => void) => {}
    }),
    subscribe: (_callback?: (status: string) => void) => {}
  }),
  removeChannel: (_channel: any) => {}
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
