import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, UserRole } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error?: string }>;
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
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        } catch (e) {
            setLoading(false);
        }
    };

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (data) {
                setUser(data as User);
            } else {
                // Fallback or create profile if needed
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (authUser) {
                    const newUser: User = {
                        id: authUser.id,
                        name: authUser.user_metadata.name || 'Usuário',
                        role: authUser.user_metadata.role || UserRole.ENCARREGADO,
                        registration: '',
                        team: ''
                    };
                    setUser(newUser);
                }
            }
        } catch (e) {
            console.error("Error fetching profile", e);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, pass: string) => {
        try {
            let emailToUse = email;
            if (!email.includes('@')) {
                emailToUse = `${email}@ciclus.com`;
            }

            // Try sign in with email/password
            const { error } = await supabase.auth.signInWithPassword({
                email: emailToUse,
                password: pass,
            });

            if (error) return { error: error.message };
            return {};
        } catch (e: any) {
            return { error: e.message };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
