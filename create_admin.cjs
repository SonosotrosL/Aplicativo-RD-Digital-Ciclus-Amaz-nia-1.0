
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cddzbmmirhyshfxiqqxb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZHpibW1pcmh5c2hmeGlxcXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzc5MDEsImV4cCI6MjA4Mzc1MzkwMX0.R4nabZ_TFWRtQPD2d9vHomQ5SZwH_nw14mXf2MUbK28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
    const email = 'admin@ciclus.com';
    const password = '123123';

    console.log(`Creating user ${email}...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name: 'Administrador Mestre',
                role: 'CCO (Admin)',
                registration: 'admin'
            }
        }
    });

    if (error) {
        console.error('Error creating user:', error.message);
    } else {
        console.log('User created:', data.user?.id);
    }
}

createAdmin();
