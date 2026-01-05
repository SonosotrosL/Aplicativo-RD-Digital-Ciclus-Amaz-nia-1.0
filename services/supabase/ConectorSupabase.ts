import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

class ConectorSupabase {
  private static instance: ConectorSupabase;
  public client: SupabaseClient | null = null;
  public isConnected: boolean = false;

  private constructor() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.isConnected = true;
      } catch (error) {
        console.error('Erro ao inicializar Supabase:', error);
        this.isConnected = false;
      }
    } else {
      console.warn('Variáveis de ambiente do Supabase não encontradas.');
    }
  }

  public static getInstance(): ConectorSupabase {
    if (!ConectorSupabase.instance) {
      ConectorSupabase.instance = new ConectorSupabase();
    }
    return ConectorSupabase.instance;
  }

  public async checkConnection(): Promise<boolean> {
    if (!this.client) return false;
    try {
        const { error } = await this.client.from('rds').select('count', { count: 'exact', head: true });
        return !error;
    } catch (e) {
        return false;
    }
  }
}

export default ConectorSupabase.getInstance();
