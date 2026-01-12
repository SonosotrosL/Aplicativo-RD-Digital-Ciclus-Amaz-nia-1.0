import { supabase } from '../../lib/supabaseClient';
import { RDData, RDStatus } from '../../types';

export class SincronizadorDeDados {
    /**
     * Saves or updates an RD in the 'rd_registros' table.
     */
    static async syncToSupabase(rd: RDData): Promise<void> {
        try {
            // Map to flat structure for DB + JSONB fields
            const dbRecord = {
                user_id: (await supabase.auth.getUser()).data.user?.id,
                foreman_id: rd.foremanId,
                foreman_name: rd.foremanName,
                supervisor_id: rd.supervisorId,
                supervisor_name: rd.supervisorName,
                date: rd.date.split('T')[0], // Extract YYYY-MM-DD
                team: rd.foremanTeam || rd.team,
                shift: rd.shift,
                category: rd.serviceCategory,
                street: rd.street,
                neighborhood: rd.neighborhood,

                // JSONB fields
                // We store teamAttendance inside metrics to avoid schema change, and spatial data in location
                metrics: {
                    ...rd.metrics,
                    teamAttendance: rd.teamAttendance
                },
                photos: {
                    initial: rd.workPhotoInitial,
                    progress: rd.workPhotoProgress,
                    final: rd.workPhotoFinal
                },
                location: {
                    ...rd.location,
                    perimeter: rd.perimeter,
                    segments: rd.segments
                },
                status: rd.status || 'Pendente',
                supervisor_note: rd.supervisorNote
            };

            // Check if it's an update (valid UUID) or insert
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rd.id);

            if (isUUID) {
                // Update
                const { error } = await supabase
                    .from('rd_registros')
                    .update(dbRecord)
                    .eq('id', rd.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('rd_registros')
                    .insert(dbRecord);
                if (error) throw error;
            }
        } catch (e) {
            console.error('Erro ao salvar RD no Supabase:', e);
            throw e;
        }
    }

    static async fetchFromSupabase(): Promise<RDData[]> {
        try {
            const { data, error } = await supabase
                .from('rd_registros')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar RDs:', error);
                return [];
            }

            // Map back to RDData structure
            return data.map((record: any) => ({
                id: record.id,
                date: record.date, // might need formatting?
                team: record.team,
                foremanId: record.foreman_id,
                foremanName: record.foreman_name,
                foremanTeam: record.team, // Assuming unified
                supervisorId: record.supervisor_id,
                supervisorName: record.supervisor_name,
                shift: record.shift,
                serviceCategory: record.category,
                street: record.street,
                neighborhood: record.neighborhood,

                metrics: {
                    capinaM: record.metrics?.capinaM || 0,
                    pinturaViasM: record.metrics?.pinturaViasM || 0,
                    pinturaPostesUnd: record.metrics?.pinturaPostesUnd || 0,
                    rocagemM2: record.metrics?.rocagemM2 || 0
                },
                teamAttendance: record.metrics?.teamAttendance || [],

                // Spatial / Extra
                perimeter: record.location?.perimeter || '',
                segments: record.location?.segments || [],
                location: record.location, // Contains lat/lng + perimeter/segments

                // Photos
                workPhotoInitial: record.photos?.initial,
                workPhotoProgress: record.photos?.progress,
                workPhotoFinal: record.photos?.final,

                status: record.status as RDStatus,
                supervisorNote: record.supervisor_note || '',
                createdAt: new Date(record.created_at).getTime()
            }));
        } catch (e) {
            console.error('Exceção ao baixar dados:', e);
            return [];
        }
    }

    static async deleteRD(id: string): Promise<boolean> {
        const { error } = await supabase.from('rd_registros').delete().eq('id', id);
        return !error;
    }

    static subscribeToChanges(callback: () => void) {
        return supabase
            .channel('public:rd_registros')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rd_registros' }, () => {
                console.log('Mudança detectada no Supabase, atualizando...');
                callback();
            })
            .subscribe();
    }
}
