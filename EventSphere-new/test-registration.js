// Test script to debug registration and login
const BASE_URL = 'http://localhost:3000';

async function testRegistration() {
    console.log('🧪 Testing Registration Process...');
    
    const testData = {
        name: 'Test Club Organizer',
        email: 'testclub@example.com',
        password: 'testpass123',
        role: 'club'
    };
    
    console.log('📤 Sending registration data:', testData);
    
    try {
        const response = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', response.headers);
        
        const data = await response.json();
        console.log('📥 Response data:', data);
        
        if (response.ok) {
            console.log('✅ Registration successful!');
            return testData.email;
        } else {
            console.log('❌ Registration failed:', data.error);
            return null;
        }
    } catch (error) {
        console.error('❌ Registration error:', error);
        return null;
    }
}

async function testLogin(email) {
    if (!email) {
        console.log('❌ Cannot test login - no email from registration');
        return;
    }
    
    console.log('\n🧪 Testing Login Process...');
    
    const loginData = {
        email: email,
        password: 'testpass123'
    };
    
    console.log('📤 Sending login data:', loginData);
    
    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', response.headers);
        
        const data = await response.json();
        console.log('📥 Response data:', data);
        
        if (response.ok) {
            console.log('✅ Login successful!');
            console.log('👤 User role:', data.user.role);
            console.log('🔑 Token received:', data.token ? 'Yes' : 'No');
            
            // Test role-based redirection logic
            console.log('\n🧪 Testing Role-Based Redirection Logic...');
            const role = data.user.role;
            console.log('Role value:', role);
            console.log('Role type:', typeof role);
            console.log('Role === "club":', role === "club");
            console.log('Role === "admin":', role === "admin");
            console.log('Role === "student":', role === "student");
            
            // Clean role comparison
            const cleanRole = role ? role.trim().toLowerCase() : 'student';
            console.log('Clean role:', cleanRole);
            console.log('Clean role === "club":', cleanRole === "club");
            
            if (cleanRole === "admin") {
                console.log('🎯 Would redirect to: admin-dashboard.html');
            } else if (cleanRole === "club") {
                console.log('🎯 Would redirect to: club-dashboard.html');
            } else {
                console.log('🎯 Would redirect to: student-dashboard.html');
            }
            
        } else {
            console.log('❌ Login failed:', data.error);
        }
    } catch (error) {
        console.error('❌ Login error:', error);
    }
}

async function runTests() {
    console.log('🚀 Starting Registration and Login Tests...\n');
    
    // Test registration
    const email = await testRegistration();
    
    // Test login
    await testLogin(email);
    
    console.log('\n🏁 Tests completed!');
}

// Run the tests
runTests().catch(console.error);
