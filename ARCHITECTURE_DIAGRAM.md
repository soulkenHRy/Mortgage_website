# User Flow Diagram & Architecture

## User Journey (Old vs New)

```
OLD FLOW:
┌─────────────────────────────────────────────────────────────────┐
│ User visits pre-qualifier                                        │
├─────────────────────────────────────────────────────────────────┤
│ ↓                                                                 │
│ Fills 18-field form                                              │
│ - Income, debts, employment, credit, loan details, etc.         │
│ ↓                                                                 │
│ Instant "calculation" of max home price, monthly payment        │
│ (May be misleading - not actual qualification)                  │
│ ↓                                                                 │
│ User leaves or reads disclaimers                                 │
│ ↓                                                                 │
│ No follow-up mechanism 😞                                        │
└─────────────────────────────────────────────────────────────────┘

NEW FLOW:
┌─────────────────────────────────────────────────────────────────┐
│ User visits pre-qualifier                                        │
├─────────────────────────────────────────────────────────────────┤
│ ↓                                                                 │
│ Fills 11-field LEAD form (low friction)                         │
│ - Name, email, phone, income, debts, property info              │
│ ↓                                                                 │
│ Submits → Data saved to database                                │
│ ↓                                                                 │
│ SUCCESS CONFIRMATION SCREEN:                                    │
│ ✓ "Thank you, [Name]!"                                          │
│ "A mortgage specialist will contact you..."                     │
│ [Visit Mortgage Specialist] button →                            │
│ ↓                                                                 │
│ Broker sees new lead in system                                  │
│ ↓                                                                 │
│ Broker contacts user with actual options                        │
│ ↓                                                                 │
│ User qualifies for real mortgage 🎉                             │
└─────────────────────────────────────────────────────────────────┘
```

## System Architecture

```
FRONTEND (React/Vite)
┌───────────────────────────────────────────────────────────────┐
│ App Component                                                   │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────┐                          │
│  │ MortgageQualifier Component      │                          │
│  ├──────────────────────────────────┤                          │
│  │ Props:                           │                          │
│  │ - economicData                   │                          │
│  │ - onTeamClick (new)              │                          │
│  │                                  │                          │
│  │ State:                           │                          │
│  │ - formData                       │                          │
│  │ - results (lead captured)        │                          │
│  │ - loading                        │                          │
│  │ - error                          │                          │
│  │                                  │                          │
│  │ Key Functions:                   │                          │
│  │ - submitLead() (POST request)    │                          │
│  │ - handleInputChange()            │                          │
│  └──────────────────────────────────┘                          │
│                                                                 │
│            ↓ calls onTeamClick()                               │
│            ↓ sets currentView = 'team'                         │
│            ↓ navigates to brokers/agents                       │
│                                                                 │
│  ┌──────────────────────────────────┐                          │
│  │ Brokers & Agents Page            │                          │
│  └──────────────────────────────────┘                          │
│                                                                 │
└───────────────────────────────────────────────────────────────┘
                        ↓ (API Call)
                        ↓
BACKEND (Express/Node)
┌───────────────────────────────────────────────────────────────┐
│ Server                                                          │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────┐                          │
│  │ POST /api/leads/capture          │                          │
│  ├──────────────────────────────────┤                          │
│  │ 1. Validate input                │                          │
│  │ 2. Check duplicate email         │                          │
│  │ 3. Create Lead document          │                          │
│  │ 4. Save to MongoDB               │                          │
│  │ 5. Return success + leadId       │                          │
│  └──────────────────────────────────┘                          │
│                                                                 │
│  ┌──────────────────────────────────┐                          │
│  │ GET /api/leads/status/new        │                          │
│  ├──────────────────────────────────┤                          │
│  │ For broker dashboard             │                          │
│  └──────────────────────────────────┘                          │
│                                                                 │
│  ┌──────────────────────────────────┐                          │
│  │ PATCH /api/leads/:id             │                          │
│  ├──────────────────────────────────┤                          │
│  │ Update status, notes, assignedTo │                          │
│  └──────────────────────────────────┘                          │
│                                                                 │
└───────────────────────────────────────────────────────────────┘
                        ↓
DATABASE (MongoDB)
┌───────────────────────────────────────────────────────────────┐
│ leads collection                                                │
├───────────────────────────────────────────────────────────────┤
│ {                                                               │
│   _id: ObjectId,                                               │
│   firstName: string,                                           │
│   lastName: string,                                            │
│   email: string (indexed),                                     │
│   phone: string,                                               │
│   propertyState: string,                                       │
│   annualIncome: string,                                        │
│   employmentStatus: enum,                                      │
│   monthlyDebts: string,                                        │
│   creditRange: enum,                                           │
│   homePurchasePrice: string,                                   │
│   downPayment: string,                                         │
│   purchaseTimeline: enum,                                      │
│   status: enum (indexed, new|contacted|qualified|etc),         │
│   notes: string,                                               │
│   assignedTo: string,                                          │
│   createdAt: Date (indexed),                                   │
│   contactedAt: Date,                                           │
│   updatedAt: Date                                              │
│ }                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Form Fields Comparison

```
OLD FORM (18 fields)                NEW FORM (11 fields)
├─ Personal (3)                      ├─ Personal (5)
│  ├─ First Name                     │  ├─ First Name
│  ├─ Last Name                      │  ├─ Last Name
│  └─ Email                          │  ├─ Email
│                                    │  ├─ Phone
├─ Financial (4)                     │  └─ Property State
│  ├─ Annual Income                  │
│  ├─ Employment Status              ├─ Financial (3)
│  ├─ Other Income                   │  ├─ Annual Income
│  └─ Monthly Debts                  │  ├─ Employment Status
│                                    │  └─ Monthly Debts
├─ Credit (1)                        │
│  └─ Credit Range                   ├─ Credit (1)
│                                    │  └─ Credit Range
├─ Loan Details (5)                  │
│  ├─ Home Purchase Price            ├─ Property (2)
│  ├─ Down Payment                   │  ├─ Purchase Price
│  ├─ Loan Type                      │  └─ Down Payment
│  ├─ Loan Term                      │
│  └─ (other implied)                ├─ Timeline (1)
│                                    │  └─ Purchase Timeline
├─ Borrower Profile (2)              │
│  ├─ First-time Buyer               │
│  └─ Purchase Timeline              │
│                                    │
├─ Contact (3)                       │
│  ├─ Phone                          │
│  ├─ Email                          │
│  └─ Property State                 │
│                                    │
└─ (Phone, Email duplicated)         └─

OLD: 18 fields                        NEW: 11 fields
(39% reduction in form friction)
```

## Data Flow Sequence

```
1. USER SUBMITS FORM
   ┌─────────────────────────────────────────┐
   │ React Component                          │
   │ submitLead(formData)                     │
   └─────────────────────────────────────────┘
                    ↓
   
2. VALIDATE LOCALLY
   ┌─────────────────────────────────────────┐
   │ Check required fields                    │
   │ Check format (email, phone)              │
   └─────────────────────────────────────────┘
                    ↓
   
3. SEND TO SERVER
   ┌─────────────────────────────────────────┐
   │ POST /api/leads/capture                  │
   │ Content-Type: application/json           │
   │ Body: {firstName, lastName, email, ...}  │
   └─────────────────────────────────────────┘
                    ↓
   
4. SERVER VALIDATES
   ┌─────────────────────────────────────────┐
   │ Check all fields present                 │
   │ Validate email format                    │
   │ Check for duplicate email                │
   │ Apply rate limiting                      │
   └─────────────────────────────────────────┘
                    ↓
   
5. CREATE & SAVE LEAD
   ┌─────────────────────────────────────────┐
   │ new Lead(formData)                       │
   │ lead.save()                              │
   │ Returns: { success: true, leadId: ... }  │
   └─────────────────────────────────────────┘
                    ↓
   
6. SHOW CONFIRMATION
   ┌─────────────────────────────────────────┐
   │ Display success screen                   │
   │ Show specialist message                  │
   │ Offer "Visit Specialist" button          │
   └─────────────────────────────────────────┘
                    ↓
   
7. BROKER FOLLOWS UP
   ┌─────────────────────────────────────────┐
   │ GET /api/leads/status/new                │
   │ See new lead in dashboard                │
   │ PATCH /api/leads/:id                     │
   │ Update status: contacted                 │
   │ Add notes and contact broker name        │
   └─────────────────────────────────────────┘
```

## Feature Comparison Matrix

```
Feature                  OLD      NEW      Impact
─────────────────────────────────────────────────────
Form Friction            High     Low      ↑ Submissions
Completion Rate          Medium   High     ↑ Leads
Data Accuracy            Variable High     ✓ Quality
Lead Tracking            None     Yes      ✓ Follow-up
Broker Integration       None     Yes      ✓ CRM Ready
Conversion Tracking      No       Yes      ✓ Analytics
User Friction            High     Low      ↑ UX
Instant Results          Misleading None   ✓ Honest
Professional Image       Medium   High     ✓ Trust
Lead Management          Manual   Auto     ↑ Efficiency
```

---

**Ready for**: Production Deployment
**Status**: ✅ Complete & Tested
