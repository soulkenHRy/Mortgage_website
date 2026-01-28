# Lead Management Operations

## REST API Examples

### 1. Submit a New Lead
```bash
curl -X POST http://localhost:3001/api/leads/capture \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Sarah",
    "lastName": "Johnson",
    "email": "sarah.johnson@example.com",
    "phone": "(416) 555-1234",
    "propertyState": "Ontario",
    "annualIncome": "120000",
    "employmentStatus": "employed",
    "monthlyDebts": "800",
    "creditRange": "good",
    "homePurchasePrice": "450000",
    "downPayment": "45000",
    "purchaseTimeline": "3-6"
  }'
```

### 2. Get All Leads
```bash
curl http://localhost:3001/api/leads
```

### 3. Get Leads by Status (e.g., "new")
```bash
curl http://localhost:3001/api/leads/status/new
```

### 4. Get Specific Lead
```bash
curl http://localhost:3001/api/leads/{leadId}
```

### 5. Update Lead Status and Assign Broker
```bash
curl -X PATCH http://localhost:3001/api/leads/{leadId} \
  -H "Content-Type: application/json" \
  -d '{
    "status": "contacted",
    "assignedTo": "Aman Kushwaha",
    "notes": "Called today - sent pre-qualification email with rate options"
  }'
```

### 6. Mark Lead as Qualified
```bash
curl -X PATCH http://localhost:3001/api/leads/{leadId} \
  -H "Content-Type: application/json" \
  -d '{
    "status": "qualified",
    "notes": "Approved for $400k mortgage at 6.5% - 30 year term"
  }'
```

### 7. Close a Lead
```bash
curl -X PATCH http://localhost:3001/api/leads/{leadId} \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed",
    "notes": "Closed sale on Jan 29, 2026 - $425k property in Toronto"
  }'
```

## MongoDB Queries (for admin/backend queries)

### Get all new leads
```javascript
db.leads.find({ status: 'new' }).sort({ createdAt: -1 })
```

### Get leads assigned to specific agent
```javascript
db.leads.find({ assignedTo: 'Aman Kushwaha' })
```

### Get leads created in last 7 days
```javascript
db.leads.find({
  createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) }
}).sort({ createdAt: -1 })
```

### Get conversion rate (qualified leads / total leads)
```javascript
db.leads.aggregate([
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      qualified: {
        $sum: { $cond: [{ $eq: ['$status', 'qualified'] }, 1, 0] }
      },
      closed: {
        $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
      }
    }
  },
  {
    $project: {
      conversionRate: {
        $multiply: [
          { $divide: ['$qualified', '$total'] },
          100
        ]
      },
      total: 1,
      qualified: 1,
      closed: 1
    }
  }
])
```

### Get most active agents
```javascript
db.leads.aggregate([
  { $match: { assignedTo: { $exists: true, $ne: null } } },
  {
    $group: {
      _id: '$assignedTo',
      leadsCount: { $sum: 1 },
      closedCount: {
        $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
      }
    }
  },
  { $sort: { leadsCount: -1 } }
])
```

## JavaScript/Node.js Code Examples

### Using the API from your application
```javascript
// Capture a lead
async function submitLead(formData) {
  try {
    const response = await fetch('/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('Lead submitted:', data.leadId);
      // Navigate to brokers page
      window.location.href = '/brokers-and-agents';
    }
  } catch (error) {
    console.error('Error submitting lead:', error);
  }
}

// Get all new leads (for admin dashboard)
async function getNewLeads() {
  try {
    const response = await fetch('/api/leads/status/new');
    const data = await response.json();
    return data.leads;
  } catch (error) {
    console.error('Error fetching leads:', error);
  }
}

// Update lead status (for brokers)
async function updateLeadStatus(leadId, status, notes) {
  try {
    const response = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        notes,
        assignedTo: 'Aman Kushwaha'
      })
    });
    
    const data = await response.json();
    console.log('Lead updated:', data.lead);
  } catch (error) {
    console.error('Error updating lead:', error);
  }
}
```

## Admin Dashboard Data Points

To build an admin dashboard, track these metrics:

1. **Total Leads**: `db.leads.countDocuments()`
2. **New Leads (Last 24h)**: Leads created in last day
3. **Contacted Rate**: `contacted + qualified + closed / total`
4. **Conversion Rate**: `closed / total`
5. **Avg Time to Contact**: Days between created and contacted
6. **Leads per Agent**: Group by assignedTo
7. **Property Value Range**: Min/Max of homePurchasePrice
8. **Down Payment Stats**: Average, median down payment

## Email Integration Suggestion

When a lead is submitted, consider:
1. Send confirmation email to user
2. Send notification to admin/available broker
3. Schedule automatic follow-up reminders (1 day, 3 days, 7 days)
4. Log all interactions in notes field

## Security Notes

- Rate limiting is applied to lead capture (50 requests per 15 minutes)
- Always validate email format on backend
- Sanitize inputs to prevent MongoDB injection
- Consider adding CAPTCHA for production
- Store phone numbers securely if integrated with SMS
- GDPR compliance: Add "delete after X days" option if needed
