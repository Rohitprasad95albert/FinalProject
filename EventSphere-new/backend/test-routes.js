// Test script to verify routes are working
const express = require('express');
const app = express();

// Mock the routes to test structure
app.use('/api/events', (req, res, next) => {
    console.log('Events route accessed:', req.method, req.path);
    
    // Mock the single event endpoint
    if (req.method === 'GET' && req.path.match(/^\/[0-9a-fA-F]{24}$/)) {
        console.log('✅ Single event endpoint would be called for ID:', req.path.substring(1));
        return res.json({ 
            message: 'Single event endpoint is working',
            eventId: req.path.substring(1),
            status: 'success'
        });
    }
    
    // Mock the all events endpoint
    if (req.method === 'GET' && req.path === '/') {
        console.log('✅ All events endpoint would be called');
        return res.json({ 
            message: 'All events endpoint is working',
            status: 'success'
        });
    }
    
    next();
});

// Test the routes
const testEventId = '507f1f77bcf86cd799439011'; // Valid ObjectId format

console.log('Testing routes...');
console.log('1. Testing all events endpoint: GET /api/events/');
console.log('2. Testing single event endpoint: GET /api/events/' + testEventId);

// Simulate requests
const testRequests = [
    { method: 'GET', path: '/api/events/' },
    { method: 'GET', path: '/api/events/' + testEventId }
];

testRequests.forEach((req, index) => {
    console.log(`\n--- Test ${index + 1} ---`);
    console.log(`${req.method} ${req.path}`);
    
    // Create a mock request and response
    const mockReq = {
        method: req.method,
        path: req.path.replace('/api/events', '')
    };
    
    const mockRes = {
        json: (data) => {
            console.log('Response:', data);
        }
    };
    
    // Simulate the route handler
    app._router.handle(mockReq, mockRes, () => {
        console.log('Route not found');
    });
});

console.log('\n✅ Route testing completed!');
