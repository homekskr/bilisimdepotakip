import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Load env vars
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const testEmail = process.env.TEST_EMAIL;
const testPassword = process.env.TEST_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    }
});

async function runTests() {
    console.log('🚀 Starting Integration Tests...\n');
    console.log('Target:', supabaseUrl);

    let user = null;

    // 1. Authentication Test
    if (!testEmail || !testPassword) {
        console.warn('⚠️  Skipping Auth Tests: TEST_EMAIL/TEST_PASSWORD not found in .env');
        console.warn('   (You can add them to test authorized actions like Stock Updates)');
    } else {
        console.log(`\n🔐 Authenticating as ${testEmail}...`);
        const { data, error } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (error) {
            console.error('❌ Login Failed:', error.message);
            // Continue to public tests if login fails
        } else {
            user = data.user;
            console.log('✅ Login Successful. User ID:', user.id);
        }
    }

    // 2. Public Read Test (Materials)
    console.log('\n📚 Testing Public Read Access (Materials)...');
    const { data: materials, error: readError } = await supabase
        .from('materials')
        .select('*')
        .limit(3);

    if (readError) {
        console.error('❌ Read Failed:', readError.message);
    } else {
        console.log(`✅ Read Successful. Retrieved ${materials.length} materials.`);
        if (materials.length > 0) {
            console.log('   Sample:', materials[0].name, `Stock: ${materials[0].quantity}`);
        }
    }

    // 3. Authorized Actions (if logged in)
    if (user && materials && materials.length > 0) {
        const testMaterial = materials[0];
        console.log(`\n🔄 Testing Stock Update (RPC) on '${testMaterial.name}'...`);

        // Add +1 stock
        const { data: updateData, error: updateError } = await supabase.rpc('update_material_stock_secure', {
            p_material_id: testMaterial.id,
            p_user_id: user.id,
            p_change_amount: 1,
            p_type: 'duzenleme',
            p_notes: 'Automated Test: +1'
        });

        if (updateError) {
            console.error('❌ Stock Update Failed:', updateError.message);
        } else {
            console.log('✅ Stock Update Successful (+1). New Qty:', updateData.new_quantity);

            // Revert -1 stock to keep data clean
            console.log('   Reverting change (-1)...');
            await supabase.rpc('update_material_stock_secure', {
                p_material_id: testMaterial.id,
                p_user_id: user.id,
                p_change_amount: -1,
                p_type: 'duzenleme',
                p_notes: 'Automated Test: Revert'
            });
            console.log('   Revert complete.');
        }

        // 4. Test Assignment Creation Check (Dry Run idea, or just ensure RPC exists)
        // We won't actually assign to avoid spamming assignments unless we delete them.
        console.log('\n📦 Testing Assignment Pre-check...');
        // Just checking if we can query users
        const { count, error: countError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        if (countError) console.error('❌ Profile Check Failed:', countError.message);
        else console.log(`✅ Profile Check Successful. Total profiles: ${count}`);
    }

    console.log('\n🏁 Tests Completed.');
}

runTests().catch(err => console.error('Fatal Error:', err));
