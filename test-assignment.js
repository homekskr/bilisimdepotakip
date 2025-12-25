// Assignment Test Script - Run in Browser Console
// This script tests the complete assignment creation flow

console.log('🚀 Starting Assignment Test...');

// Test function to create assignment
async function testAssignmentCreation() {
    try {
        // Test data (replace with actual UUIDs from your database)
        const testMaterialId = '550e8400-e29b-41d4-a716-446655440000'; // Replace with real material UUID
        const testUserId = window.currentUser?.id || '550e8400-e29b-41d4-a716-446655440001'; // Replace with real user UUID
        
        // Test assignment data
        const assignmentData = {
            material_id: testMaterialId, // Should be UUID string
            assigned_to: 'Test Person',
            institution: 'İL SAĞLIK MÜDÜRLÜĞÜ',
            building: 'ANA HİZMET BİNASI',
            unit: 'Bilgi İşlem',
            target_personnel: 'Test Personnel',
            target_title: 'Test Title',
            quantity: 1,
            assigned_by: testUserId,
            status: 'aktif'
        };
        
        console.log('📝 Creating test assignment:', assignmentData);
        
        // Test insert
        const { data, error } = await supabase
            .from('assignments')
            .insert([assignmentData])
            .select();
            
        if (error) {
            console.error('❌ Assignment creation failed:', error);
            return false;
        }
        
        console.log('✅ Assignment created successfully:', data);
        
        // Test retrieve
        const { data: retrieved, error: retrieveError } = await supabase
            .from('assignments')
            .select('*')
            .eq('id', data[0].id)
            .single();
            
        if (retrieveError) {
            console.error('❌ Assignment retrieval failed:', retrieveError);
            return false;
        }
        
        console.log('✅ Assignment retrieved successfully:', retrieved);
        
        // Check all columns are populated
        const requiredFields = ['institution', 'building', 'unit', 'target_personnel', 'target_title'];
        const missingFields = requiredFields.filter(field => !retrieved[field]);
        
        if (missingFields.length > 0) {
            console.error('❌ Missing fields:', missingFields);
            return false;
        }
        
        console.log('✅ All required fields are populated');
        
        // Clean up test data
        const { error: deleteError } = await supabase
            .from('assignments')
            .delete()
            .eq('id', data[0].id);
            
        if (deleteError) {
            console.warn('⚠️ Could not clean up test data:', deleteError);
        } else {
            console.log('✅ Test data cleaned up');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed with exception:', error);
        return false;
    }
}

// Function to check current user and material availability
async function checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');
    
    // Check current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('❌ No user logged in');
        return false;
    }
    console.log('✅ User logged in:', user);
    
    // Check available materials
    const { data: materials, error } = await supabase
        .from('materials')
        .select('id, name, quantity')
        .gt('quantity', 0)
        .limit(5);
        
    if (error) {
        console.error('❌ Could not fetch materials:', error);
        return false;
    }
    
    if (!materials || materials.length === 0) {
        console.error('❌ No materials with stock available');
        return false;
    }
    
    console.log('✅ Available materials:', materials);
    return true;
}

// Main test function
async function runAssignmentTest() {
    console.log('🧪 Assignment Creation Test Suite');
    console.log('=====================================');
    
    // Check prerequisites
    const prerequisitesMet = await checkPrerequisites();
    if (!prerequisitesMet) {
        console.error('❌ Prerequisites not met. Test aborted.');
        return false;
    }
    
    // Run the main test
    const testResult = await testAssignmentCreation();
    
    console.log('=====================================');
    if (testResult) {
        console.log('🎉 All tests passed! Assignment creation is working correctly.');
    } else {
        console.log('💥 Tests failed. Check the errors above.');
    }
    
    return testResult;
}

// Auto-run the test if on assignments page
if (window.location.hash === '#assignments' || window.location.pathname.includes('assignments')) {
    console.log('🔄 Auto-running assignment test...');
    runAssignmentTest();
} else {
    console.log('⚠️ Navigate to assignments page to run automatic test');
    console.log('Or run manually: runAssignmentTest()');
}

// Export function for manual testing
window.runAssignmentTest = runAssignmentTest;

console.log('✅ Assignment test script loaded. Run runAssignmentTest() to test.');