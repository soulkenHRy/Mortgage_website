const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  badge: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5
  },
  stats: {
    yearsExperience: {
      type: String,
      default: '0'
    },
    happyClients: {
      type: String,
      default: '0'
    },
    loansFunded: {
      type: String,
      default: '$0'
    }
  },
  specialties: [{
    type: String
  }],
  bio: {
    type: String,
    default: ''
  },
  credentials: [{
    type: String
  }],
  contact: {
    email: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    linkedin: {
      type: String,
      default: ''
    }
  },
  featured: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  appointments: [{
    userName: {
      type: String,
      required: true
    },
    userEmail: {
      type: String,
      required: true
    },
    userPhone: {
      type: String,
      default: ''
    },
    appointmentDate: {
      type: Date,
      required: true
    },
    appointmentTime: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending'
    },
    notes: {
      type: String,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TeamMember', teamMemberSchema);
