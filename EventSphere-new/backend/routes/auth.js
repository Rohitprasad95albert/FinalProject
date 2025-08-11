// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');
const User = require('../models/User');
const verifyToken = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../utils/emailService');

// This line is crucial - it runs the code that sets up the Google Strategy
require('../config/passport-setup');

const router = express.Router();

// --- GOOGLE OAUTH ROUTES ---
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: 'http://127.0.0.1:5500/login.html' }), (req, res) => {
    const token = jwt.sign({ id: req.user._id, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    
    // Determine redirect URL based on user role
    let redirectUrl = 'http://127.0.0.1:5500/student-dashboard.html';
    if (req.user.role === 'admin') {
        redirectUrl = 'http://127.0.0.1:5500/admin-dashboard.html';
    } else if (req.user.role === 'club') {
        redirectUrl = 'http://127.0.0.1:5500/club-dashboard.html';
    }
    
    const script = `
        <script>
            window.localStorage.setItem('token', '${token}');
            window.localStorage.setItem('userId', '${req.user._id}');
            window.localStorage.setItem('role', '${req.user.role}');
            window.localStorage.setItem('name', '${req.user.name}');
            window.localStorage.setItem('email', '${req.user.email}');
            // Redirect based on user role
            window.location.href = '${redirectUrl}';
        </script>
    `;
    res.send(script);
});


// --- STANDARD AUTH ROUTES ---

// Register a new user
router.post('/register', async (req, res) => {
    console.log('Registration request received:', req.body); // Debug log
    
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields are required." });
    
    // Validate role if provided
    const validRoles = ['student', 'club', 'admin'];
    if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be one of: student, club, admin" });
    }
    
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already exists." });
        const hashedPassword = await bcrypt.hash(password, 10);
        // Use the role from request body, default to 'student' if not provided
        const userRole = role || 'student';
        console.log('Creating user with role:', userRole); // Debug log
        console.log('Role type:', typeof userRole); // Debug log
        console.log('Role length:', userRole.length); // Debug log
        
        const newUser = await User.create({ name, email, password: hashedPassword, role: userRole });
        console.log('User created successfully:', { id: newUser._id, name: newUser.name, role: newUser.role }); // Debug log
        console.log('Saved role type:', typeof newUser.role); // Debug log
        console.log('Saved role length:', newUser.role ? newUser.role.length : 'undefined'); // Debug log
        
        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Server error during registration." });
    }
});

// User Login (Single, Correct Version)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    if (!user.password) {
      return res.status(400).json({ error: "This account uses Google Sign-In. Please use the 'Login with Google' button." });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    
    console.log('Login successful for user:', { id: user._id, name: user.name, role: user.role }); // Debug log
    console.log('User role from database:', user.role); // Debug log
    console.log('User role type:', typeof user.role); // Debug log
    console.log('User role length:', user.role ? user.role.length : 'undefined'); // Debug log
    
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "A server error occurred during login." });
  }
});

// Change Password (authenticated)
router.post('/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!user.password) {
      return res.status(400).json({ error: 'Password change is not available for Google Sign-In accounts.' });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect.' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error changing password.' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(200).json({ message: 'If a user with that email exists, a reset link has been sent.' });
        }
        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        const resetURL = `${process.env.FRONTEND_URL || 'http://127.0.0.1:5500'}/reset-password.html?token=${token}`;
        await sendPasswordResetEmail(user.email, resetURL);
        res.json({ message: 'If a user with that email exists, a reset link has been sent.' });
    } catch (error) {
        res.status(500).json({ error: 'Error processing forgot password request.' });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.json({ message: 'Password has been successfully reset.' });
    } catch (error) {
        res.status(500).json({ error: 'Error resetting password.' });
    }
});


// --- USER MANAGEMENT ROUTES (ADMIN) ---

// GET all users
router.get('/users', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
    try {
        const users = await User.find().select('-password -resetPasswordToken -resetPasswordExpires');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// PATCH update user role
router.patch('/users/:id/role', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Admin cannot change their own role.' });
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User role updated successfully', user });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update user role.' });
    }
});

// Debug route to check user data (remove in production)
router.get('/debug/user/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email }).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ 
            user,
            message: 'User found',
            role: user.role,
            roleType: typeof user.role
        });
    } catch (err) {
        console.error('Debug user error:', err);
        res.status(500).json({ error: 'Failed to fetch user data.' });
    }
});

module.exports = router;