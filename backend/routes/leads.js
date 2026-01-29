const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { generalLimiter } = require('../middleware/rateLimiting');

// Capture a new lead (POST /api/leads/capture)
router.post('/capture', generalLimiter, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      propertyState,
      annualIncome,
      employmentStatus,
      monthlyDebts,
      creditRange,
      homePurchasePrice,
      downPayment,
      purchaseTimeline,
      preQualificationStatus,
      timestamp
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !propertyState) {
      return res.status(400).json({
        error: 'Missing required personal information'
      });
    }

    if (!annualIncome || !monthlyDebts || !homePurchasePrice || !downPayment) {
      return res.status(400).json({
        error: 'Missing required financial information'
      });
    }

    // Check if lead already exists
    const existingLead = await Lead.findOne({ email: email.toLowerCase() });
    
    if (existingLead) {
      return res.status(400).json({
        error: 'A lead with this email already exists'
      });
    }

    // Create new lead
    const lead = new Lead({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      propertyState: propertyState.trim(),
      annualIncome,
      employmentStatus,
      monthlyDebts,
      creditRange,
      homePurchasePrice,
      downPayment,
      purchaseTimeline,
      preQualificationStatus: preQualificationStatus || 'Pending',
      status: 'new'
    });

    // Save lead
    const savedLead = await lead.save();

    // Send success response
    res.status(201).json({
      success: true,
      message: 'Lead captured successfully',
      leadId: savedLead._id
    });

  } catch (error) {
    console.error('Error capturing lead:', error);
    res.status(500).json({
      error: 'Failed to capture lead. Please try again later.'
    });
  }
});

// Get all leads (admin only - can be protected with auth middleware later)
router.get('/', async (req, res) => {
  try {
    const leads = await Lead.find()
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      count: leads.length,
      leads
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      error: 'Failed to fetch leads'
    });
  }
});

// Get lead by ID
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).select('-__v');

    if (!lead) {
      return res.status(404).json({
        error: 'Lead not found'
      });
    }

    res.status(200).json({
      success: true,
      lead
    });

  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({
      error: 'Failed to fetch lead'
    });
  }
});

// Update lead status
router.patch('/:id', async (req, res) => {
  try {
    const { status, notes, assignedTo } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (assignedTo) updateData.assignedTo = assignedTo;

    if (status === 'contacted') {
      updateData.contactedAt = new Date();
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!lead) {
      return res.status(404).json({
        error: 'Lead not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      lead
    });

  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({
      error: 'Failed to update lead'
    });
  }
});

// Get leads by status
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = ['new', 'contacted', 'qualified', 'closed', 'lost'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status'
      });
    }

    const leads = await Lead.find({ status })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      status,
      count: leads.length,
      leads
    });

  } catch (error) {
    console.error('Error fetching leads by status:', error);
    res.status(500).json({
      error: 'Failed to fetch leads'
    });
  }
});

module.exports = router;
