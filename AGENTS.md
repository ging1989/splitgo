<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# SplitGo - Project Context

## Overview

SplitGo is a web application for managing shared travel expenses among friends.

The goal is to allow users to:

* Create trips
* Invite friends to join trips
* Add expenses during trips
* Split expenses among participants
* Calculate who owes whom
* View trip summaries and settlement information

Target users are groups of friends traveling together.

---

## Tech Stack

### Frontend

* Next.js 16 (App Router)
* React 19
* TypeScript
* Tailwind CSS

### Backend

* Supabase

### Authentication

* Google OAuth via Supabase Auth

### Database

* PostgreSQL (Supabase)

---

## Current Progress

### In Progress

* Google Login
* Supabase Connection
* User Profile Creation
* Create Trip
* List Trips
* Row Level Security for Trips
* Trips Page UI
* Create Trip Modal

### Not Started

* Trip Detail Page
* Members Management
* Expense Management
* Expense Categories
* Expense Splitting
* Settlement Calculation
* Invite Links
* Dashboard

---

## Database Schema

### profiles

Stores user information.

Fields:

* id (UUID, PK)
* full_name
* avatar_url
* created_at

### trips

Stores trip information.

Fields:

* id (UUID, PK)
* name
* description
* created_by (FK -> profiles.id)
* created_at

### trip_members

Stores membership of users in trips.

Fields:

* id (UUID)
* trip_id
* user_id
* role
* joined_at

Role values:

* owner
* member

### expense_categories

Stores expense categories.

Examples:

* Accommodation
* Transportation
* Food
* Shopping
* Activities
* Other

### expenses

Stores expense records.

Fields:

* id
* trip_id
* category_id
* title
* amount
* paid_by
* expense_date
* note
* created_at

### expense_participants

Stores users sharing an expense.

Fields:

* id
* expense_id
* user_id
* share_amount

---

## User Flow

### Authentication

User opens application

→ Login with Google

→ Redirect to Trips Page

---

### Trip Management

Trips Page

→ Create Trip

→ View Trip List

→ Open Trip Detail

---

### Expense Management

Trip Detail

→ Add Expense

→ Select Category

→ Select Payer

→ Select Participants

→ Save Expense

---

### Settlement Calculation

For each user:

Balance = Paid Amount - Shared Amount

Example:

User A paid 3000

User share = 1000

Balance = +2000

User B paid 500

User share = 1500

Balance = -1000

Settlement:

User B pays User A 1000

---

## UI Design Principles

Design Style:

* Mobile First
* Clean
* Modern
* Similar to Splitwise
* Fast and minimal clicks

Preferred Colors:

* Green primary color
* White background
* Soft gray borders

---

## Folder Structure

src/
├── lib/
│ └── supabase.ts
│
├── components/
│ ├── trips/
│ ├── expenses/
│ └── shared/
│
└── app/
├── page.tsx
├── trips/
│ ├── page.tsx
│ └── [id]/
│ └── page.tsx

---

## Coding Rules

* Use TypeScript strictly
* Prefer functional components
* Use async/await
* Avoid any when possible
* Keep components small
* Reuse components
* Use Supabase directly
* Follow Next.js App Router conventions

---

## Next Feature To Build

Priority Order:

1. Trips List UI
2. Create Trip Modal
3. Trip Detail Page
4. Add Expense
5. Expense List
6. Members Management
7. Settlement Calculation
8. Invite Users
9. Dashboard
10. Reports

<!-- END:nextjs-agent-rules -->
