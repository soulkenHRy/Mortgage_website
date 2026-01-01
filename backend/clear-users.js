const mongoose = require('mongoose');
const User = require('./models/User');
const UserData = require('./models/UserData');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mortgage_website';

async function clearUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete all users
    const userResult = await User.deleteMany({});
    console.log(`✅ Deleted ${userResult.deletedCount} users from User collection`);

    // Delete all user data
    const userDataResult = await UserData.deleteMany({});
    console.log(`✅ Deleted ${userDataResult.deletedCount} records from UserData collection`);

    console.log('✅ Database cleared successfully');
    
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

clearUsers();
