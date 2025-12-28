const mongoose = require('mongoose');
const TeamMember = require('./models/TeamMember');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mortgage-calculator';

// Seed data for Aman Kushwaha - First/Primary profile
const amanProfile = {
  name: 'Aman Kushwaha',
  title: 'Mortgage Agent, Level 2',
  badge: 'Mortgage Agent',
  image: '',
  rating: 5.0,
  stats: {
    yearsExperience: '5+',
    happyClients: '500+',
    loansFunded: '$100M+'
  },
  specialties: [
    'All Loan Types',
    'First-Time Buyers',
    'Refinancing',
    'Investment Properties'
  ],
  bio: "Dedicated mortgage professional committed to helping clients achieve their homeownership dreams. With expertise in various loan products, I provide personalized solutions tailored to each client's unique financial situation.",
  credentials: [
    'License # M22004330',
    'Mortgage Agent Level 2'
  ],
  contact: {
    email: 'aman.kushwaha@8twelve.mortgage',
    phone: '(647) 327-6619',
    linkedin: ''
  },
  featured: true,
  order: 0
};

// Seed data for Shaken Hang Rai
const shakenProfile = {
  name: 'Shaken Hang Rai',
  title: 'Broker',
  badge: 'Broker',
  image: '/my_pic.jpg',
  rating: 5.0,
  stats: {
    yearsExperience: '10+',
    happyClients: '1000+',
    loansFunded: '$500M+'
  },
  specialties: [
    'All Loan Types',
    'First-Time Buyers',
    'Refinancing',
    'Investment Properties'
  ],
  bio: "I'm passionate about helping families achieve homeownership. With extensive experience in the mortgage industry, I've helped thousands of clients navigate the mortgage process and secure the best rates. Let's make your homeownership dream a reality!",
  credentials: [
    'NMLS #123456',
    'Certified Mortgage Expert'
  ],
  contact: {
    email: 'shakenwho@gmail.com',
    phone: '+1 (647) 469-1691',
    linkedin: ''
  },
  featured: true,
  order: 1
};

async function seedTeamMembers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing team members
    await TeamMember.deleteMany({});
    console.log('🗑️  Cleared existing team members');

    // Insert Aman's profile first (order: 0)
    const amanMember = await TeamMember.create(amanProfile);
    console.log('✅ Created team member:', amanMember.name);

    // Insert Shaken's profile (order: 1)
    const shakenMember = await TeamMember.create(shakenProfile);
    console.log('✅ Created team member:', shakenMember.name);

    console.log('\n📊 Team Members in Database:');
    const allMembers = await TeamMember.find().sort({ order: 1 });
    console.log(JSON.stringify(allMembers, null, 2));

    await mongoose.connection.close();
    console.log('\n✅ Database seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedTeamMembers();
