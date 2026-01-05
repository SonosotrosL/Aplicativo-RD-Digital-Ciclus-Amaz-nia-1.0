import ConectorSupabase from './ConectorSupabase';
import { MapeadorDeDados } from './MapeadorDeDados';
import { RDData, RDStatus } from '../../types';

export class SincronizadorDeDados {
    static async syncToSupabase(rd: RDData): Promise<boolean> {
        const client = ConectorSupabase.client;
        if (!client) return false;

        try {
            if (!rd.id) {
                // Generate a random ID if not present
                rd.id = `RD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
            }

            const payload = MapeadorDeDados.toSupabase(rd);
            const { error } = await client.from('rds').upsert(payload);

            if (error) {
                console.error('Erro de sincronização (Upload):', error);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Exceção ao sincronizar:', e);
            return false;
        }
    }

    static async fetchFromSupabase(): Promise<RDData[]> {
        const client = ConectorSupabase.client;
        if (!client) return [];

        try {
            const { data, error } = await client
                .from('rds')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro de sincronização (Download):', error);
                return [];
            }

            return data.map(MapeadorDeDados.fromSupabase);
        } catch (e) {
            console.error('Exceção ao baixar dados:', e);
            return [];
        }
    }

    static async deleteRD(id: string): Promise<boolean> {
        const client = ConectorSupabase.client;
        if (!client) return false;

        const { error } = await client.from('rds').delete().eq('id', id);
        return !error;
    }

    static subscribeToChanges(callback: () => void) {
        const client = ConectorSupabase.client;
        if (!client) return null;

        return client
            .channel('public:rds')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rds' }, () => {
                console.log('Mudança detectada no Supabase, atualizando...');
                callback();
            })
            .subscribe();
    }
}
