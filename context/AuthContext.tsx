import React, { createContext, useContext, useEffect, useState } from 'react';
import ConectorSupabase from '../services/supabase/ConectorSupabase';
import { User, UserRole } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (registration: string, password: string) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        checkSession();

        // Listen for auth changes
        const { data: { subscription } } = ConectorSupabase.client!.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkSession = async () => {
        try {
            const { data: { session } } = await ConectorSupabase.client!.auth.getSession();
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Session check failed', error);
            setLoading(false);
        }
    };

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await ConectorSupabase.client!
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                // If profile not found, create one
                if (error.code === 'PGRST116') {
                    console.log('Perfil não encontrado, criando um novo...');
                    const { data: userData } = await ConectorSupabase.client!.auth.getUser();
                    const email = userData.user?.email || '';
                    const defaultName = email.split('@')[0];

                    const newProfile = {
                        id: userId,
                        name: defaultName,
                        registration: email.split('@')[0], // Use email prefix as registration
                        role: UserRole.ENCARREGADO, // Default role
                        team: 'S10' // Default team
                    };

                    const { error: insertError } = await ConectorSupabase.client!
                        .from('profiles')
                        .insert(newProfile);

                    if (!insertError) {
                        setUser({
                            id: newProfile.id,
                            name: newProfile.name,
                            registration: newProfile.registration,
                            role: newProfile.role,
                            team: newProfile.team
                        });
                        return;
                    }
                    console.error('Erro ao criar perfil fallback:', insertError);
                }
                throw error;
            }

            if (data) {
                setUser({
                    id: data.id,
                    name: data.name,
                    registration: data.registration,
                    role: data.role as UserRole,
                    team: data.team
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            // Even on error, stop loading so user isn't stuck
            // setUser(null); // Keep user null so they stay on login screen or show error
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        // Note: User input is 'registration', but Supabase expects email.
        // We assume the user enters an email derived from registration or just an email.
        // To keep it simple for this migration: we'll assume the input is email for now, 
        // or we append a fake domain like registration@ciclus.com if it's just a number.

        let emailToUse = email;
        if (!email.includes('@')) {
            emailToUse = `${email}@ciclus.com`;
        }

        const { error } = await ConectorSupabase.client!.auth.signInWithPassword({
            email: emailToUse,
            password
        });

        if (error) return { error: error.message };
        return {};
    };

    const signOut = async () => {
        await ConectorSupabase.client!.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
