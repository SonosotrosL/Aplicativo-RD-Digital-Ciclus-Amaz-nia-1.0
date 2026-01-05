import ConectorSupabase from './ConectorSupabase';
import { User, UserRole } from '../../types';

export class UserService {
    static async getUsers(): Promise<User[]> {
        const client = ConectorSupabase.client;
        if (!client) return [];

        const { data, error } = await client
            .from('profiles')
            .select('*')
            .order('name');

        if (error) {
            console.error('Erro ao buscar usuários:', error);
            return [];
        }

        return data.map(p => ({
            id: p.id,
            name: p.name,
            registration: p.registration,
            role: p.role as UserRole,
            team: p.team
        }));
    }

    static async saveUser(user: User): Promise<boolean> {
        const client = ConectorSupabase.client;
        if (!client) return false;

        // New User -> Call Edge Function to create in Auth + Profiles
        if (!user.id || user.id.length < 5) { // Check if valid ID or temp/empty
            try {
                const { data, error } = await client.functions.invoke('create-user', {
                    body: {
                        email: user.registration.includes('@') ? user.registration : `${user.registration}@ciclus.com`,
                        password: user.password,
                        name: user.name,
                        registration: user.registration,
                        role: user.role,
                        team: user.team
                    }
                });

                if (error) throw error;
                return true;
            } catch (e) {
                console.error('Erro ao criar usuário:', e);
                throw e;
            }
        } else {
            // Update existing user (Only profile fields)
            // Updating password via client is strictly limited to the user themselves usually.
            // Admins updating other's passwords requires Edge Function 'update-user' (not implemented yet), 
            // or we just update the metadata in profiles.

            const { error } = await client
                .from('profiles')
                .update({
                    name: user.name,
                    role: user.role,
                    team: user.team,
                    // registration: user.registration // Usually immutable or linked to email
                })
                .eq('id', user.id);

            return !error;
        }
    }

    static async deleteUser(id: string): Promise<boolean> {
        // Note: Deleting from 'profiles' might fail if linked to auth.
        // Usually need an edge function to delete from auth.users which cascades to profiles.
        // For now, we'll try direct delete (will fail if RLS/Foreign Key issues) or implement 'delete-user' function.

        // Let's assume we need an Edge Function for full deletion, but we can try soft delete or direct delete if configured.
        // Since I didn't create 'delete-user' function yet, I will alert the user if they try this specific action
        // or we can implement it now.

        console.warn("Delete user requires admin privileges on Auth.");
        return false; // Placeholder until implemented
    }
}
