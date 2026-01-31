require('dotenv').config();
const mongoose = require('mongoose');
const ApiKey = require('./models/ApiKey');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function generateInitialApiKey() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if any API keys already exist
    const existingKeys = await ApiKey.countDocuments();
    
    if (existingKeys > 0) {
      console.log(`ℹ️  Found ${existingKeys} existing API key(s)`);
      
      // Show all existing keys (masked)
      const keys = await ApiKey.find().select('name permissions isActive createdAt');
      console.log('\nExisting API Keys:');
      keys.forEach((key, index) => {
        console.log(`${index + 1}. ${key.name} | Permissions: ${key.permissions.join(', ')} | Active: ${key.isActive}`);
      });
      
      console.log('\n💡 To generate a new key anyway, delete existing keys first or use the API endpoint.');
    }

    // Generate a new API key
    const key = ApiKey.generateKey();
    
    const newApiKey = new ApiKey({
      key,
      name: 'Frontend Application',
      description: 'Main API key for the mortgage website frontend',
      permissions: ['read', 'write'],
      createdBy: 'system-init',
      expiresAt: null, // Never expires
      rateLimit: {
        requestsPerHour: 5000,
        requestsPerDay: 50000
      }
    });

    await newApiKey.save();

    console.log('\n✅ API Key Generated Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 Name: ${newApiKey.name}`);
    console.log(`🔑 API Key: ${key}`);
    console.log(`🔐 Permissions: ${newApiKey.permissions.join(', ')}`);
    console.log(`📅 Created: ${newApiKey.createdAt}`);
    console.log(`⏰ Expires: ${newApiKey.expiresAt || 'Never'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Save this API key securely!');
    console.log('This is the only time you will see the full key.');
    console.log('\n📝 Add this to your frontend .env file:');
    console.log(`VITE_API_KEY=${key}`);
    console.log('\n📝 For external applications, use this in headers:');
    console.log(`x-api-key: ${key}`);
    console.log('or');
    console.log(`Authorization: Bearer ${key}`);
    
  } catch (error) {
    console.error('❌ Error generating API key:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the script
generateInitialApiKey();
