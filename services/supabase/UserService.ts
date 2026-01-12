
import { supabase } from '../../lib/supabaseClient';
import { User, UserRole } from '../../types';



export class UserService {
    static async getUsers(): Promise<User[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('name');

        if (error) {
            console.error('Erro ao buscar usuários:', error);
            return [];
        }

        return data.map((p: any) => ({
            id: p.id,
            name: p.name,
            registration: p.registration,
            role: p.role as UserRole,
            team: p.team
        }));
    }

    static async saveUser(user: User): Promise<boolean> {
        // New User -> Use signUp (correct hashing) + RPC (confirm/profile)
        if (!user.id || user.id.length < 5) {
            try {
                const email = user.registration.includes('@') ? user.registration : `${user.registration}@ciclus.com`;

                // 1. Create User via Edge Function (Bypasses Rate Limits & Auto-confirms)
                const { data: efData, error: efError } = await supabase.functions.invoke('create-user', {
                    body: {
                        email: email,
                        password: user.password!,
                        userData: {
                            name: user.name,
                            role: user.role,
                            registration: user.registration,
                            team: user.team
                        }
                    }
                });

                if (efError) throw efError;
                if (efData?.error) {
                    if (efData.error.includes('already registered')) {
                        // If already registered, we proceed to 'fix' (update) via RPC below
                        console.warn('Usuário já existe, atualizando dados...');
                    } else {
                        throw new Error(efData.error);
                    }
                }

                // 2. Fix/Confirm User via RPC (Ensures consistency)
                const { error: rpcError } = await supabase.rpc('admin_fix_user', {
                    p_email: email,
                    p_name: user.name,
                    p_registration: user.registration,
                    p_role: user.role,
                    p_team: user.team || null
                });

                if (rpcError) throw rpcError;
                return true;

            } catch (e) {
                console.error('Erro ao criar usuário:', e);
                throw e; // Propagate error to UI
            }
        } else {
            // Update existing user (Only profile fields)
            const { error } = await supabase
                .from('profiles')
                .update({
                    name: user.name,
                    role: user.role,
                    team: user.team || null, // Ensure NULL is sent to clear the field
                })
                .eq('id', user.id);

            if (error) throw error;
            return true;
        }
    }

    static async deleteUser(id: string): Promise<boolean> {
        try {
            const { error } = await supabase.rpc('admin_delete_user', { user_id: id });
            if (error) throw error;
            return true;
        } catch (e) {
            console.error("Erro ao excluir usuário:", e);
            return false;
        }
    }
}
