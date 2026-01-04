const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const UserData = require('../models/UserData');
const { sendVerificationEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET;

exports.login = async (req, res) => {
  try {
    const { username, password, email, loginEmail } = req.body;
    
    const isSignup = email && username ? true : false;
    const isLogin = loginEmail ? true : false;
    
    if (isLogin) {
      // LOGIN FLOW
      if (!loginEmail || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
      }
      
      const normalizedLoginEmail = loginEmail.toLowerCase().trim();
      const user = await User.findOne({ email: normalizedLoginEmail });
      
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }
      
      if (user.lockUntil && user.lockUntil > Date.now()) {
        const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return res.status(423).json({ 
          success: false, 
          error: `Account temporarily locked. Please try again in ${minutesLeft} minutes.` 
        });
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        if (user.loginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
          await user.save();
          return res.status(423).json({ 
            success: false, 
            error: 'Too many failed attempts. Account locked for 30 minutes.' 
          });
        }
        await user.save();
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid email or password.' 
        });
      }
      
      user.loginAttempts = 0;
      user.lockUntil = null;
      user.lastLoginIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      await user.save();
      
      const token = jwt.sign(
        { username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({ 
        success: true, 
        user: { username: user.username, email: user.email }, 
        token,
        isNewUser: false,
        isVerified: user.isVerified,
        requiresVerification: !user.isVerified
      });
    }
    
    // SIGNUP FLOW
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }
    
    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email ? email.toLowerCase().trim() : null;
    
    let user = await User.findOne({ username: normalizedUsername });
    
    if (!user) {
      if (!normalizedEmail) {
        return res.status(400).json({ success: false, error: 'Email is required for new accounts.' });
      }
      
      const existingEmail = await User.findOne({ email: normalizedEmail });
      if (existingEmail) {
        return res.status(400).json({ 
          success: false, 
          error: 'This email is already registered. Please login or use a different email.' 
        });
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Please enter a valid email address.' 
        });
      }
      
      const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const hashedPassword = await bcrypt.hash(password, 10);
      
      user = new User({ 
        username: normalizedUsername, 
        password: hashedPassword, 
        email: normalizedEmail,
        accountCreatedIP: ipAddress,
        lastLoginIP: ipAddress,
        isVerified: false
      });
      await user.save();
      
      const userData = new UserData({ username, data: {} });
      await userData.save();
      
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationToken = crypto.createHash('sha256').update(verificationCode).digest('hex');
      user.verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      await sendVerificationEmail(normalizedEmail, normalizedUsername, verificationCode);
      
      const token = jwt.sign(
        { username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({ 
        success: true, 
        user: { username: user.username, email: user.email }, 
        token,
        isNewUser: true,
        requiresVerification: true,
        message: 'Account created! Please check your email for verification code.'
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Username already exists. Please login or choose a different username.' 
      });
    }
  } catch (error) {
    console.error('Login/Signup error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (user.isVerified) {
      return res.status(400).json({ success: false, error: 'Email already verified' });
    }
    
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationToken = crypto.createHash('sha256').update(verificationCode).digest('hex');
    user.verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(user.email, user.username, verificationCode);

    res.json({ 
      success: true, 
      message: 'Verification code sent! Check your email.' 
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to resend code' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and code are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, error: 'Email already verified' });
    }

    if (!user.verificationToken || !user.verificationTokenExpires) {
      return res.status(400).json({ 
        success: false, 
        error: 'No verification code found. Please request a new one.' 
      });
    }

    if (user.verificationTokenExpires < new Date()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Verification code expired. Please request a new code.' 
      });
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    
    if (hashedCode !== user.verificationToken) {
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Email verified successfully! You can now use all features.' 
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify email' });
  }
};

exports.getUserData = async (req, res) => {
  try {
    const { username } = req.params;
    
    if (req.user.username !== username) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const userData = await UserData.findOne({ username });
    if (!userData) {
      return res.status(404).json({ success: false, error: 'User data not found' });
    }
    res.json({ success: true, data: userData.data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.saveUserData = async (req, res) => {
  try {
    const { username } = req.params;
    const { data } = req.body;
    
    if (req.user.username !== username) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    let userData = await UserData.findOne({ username });
    if (!userData) {
      userData = new UserData({ username, data });
    } else {
      userData.data = data;
      userData.updatedAt = new Date();
    }
    await userData.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
