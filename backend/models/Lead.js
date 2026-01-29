const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  propertyState: {
    type: String,
    required: true,
    trim: true
  },
  annualIncome: {
    type: String,
    required: true
  },
  employmentStatus: {
    type: String,
    enum: ['employed', 'self-employed', 'retired'],
    default: 'employed'
  },
  monthlyDebts: {
    type: String,
    required: true
  },
  creditRange: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  },
  homePurchasePrice: {
    type: String,
    required: true
  },
  downPayment: {
    type: String,
    required: true
  },
  purchaseTimeline: {
    type: String,
    enum: ['1-3', '3-6', '6-12', '12+'],
    default: '3-6'
  },
  preQualificationStatus: {
    type: String,
    enum: ['Qualified', 'Not Qualified', 'Pending'],
    default: 'Pending'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'closed', 'lost'],
    default: 'new'
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  contactedAt: {
    type: Date,
    default: null
  },
  assignedTo: {
    type: String,
    default: null // Can store broker/agent name
  }
}, {
  timestamps: true
});

// Create index on email for quick lookups
leadSchema.index({ email: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
