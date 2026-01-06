# CleanDay Mobile App - Implementation Plan

## Overview
A React Native (Expo) mobile app for cleaners to manage their jobs, clock in/out, and communicate with customers.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React Native with Expo |
| Language | TypeScript |
| State Management | Zustand or React Context |
| Navigation | React Navigation |
| UI Components | React Native Paper or NativeWind (Tailwind) |
| HTTP Client | Axios or fetch |
| Auth Storage | Expo SecureStore |
| Push Notifications | Expo Notifications |
| Maps | React Native Maps |

---

## Core Features for Cleaners

### 1. Authentication
- Login with email/password
- Secure token storage
- Auto-login on app relaunch
- Logout functionality

### 2. Dashboard (Home Screen)
- Today's jobs list
- Upcoming jobs (next 7 days)
- Quick stats (jobs completed this week, earnings)
- Pull-to-refresh

### 3. Job Details Screen
- Client name and address
- Service type and duration
- Special instructions (gate code, parking, pets)
- Map with directions button
- Action buttons based on job status

### 4. Job Workflow Actions
- **"On My Way"** button → Sends SMS to customer
- **"Clock In"** button → Starts time tracking
- **"Clock Out"** button → Ends job, triggers feedback request
- Visual status indicators

### 5. Profile Management
- View/edit personal info
- Emergency contact
- Specialties and experience
- Profile photo

### 6. Navigation & Maps
- One-tap navigation to job address (opens Google Maps/Apple Maps)
- Address display with map preview

### 7. Push Notifications
- New job assigned
- Job schedule changes
- Reminders before jobs

---

## Project Structure

```
/mobile
├── app/                    # Expo Router screens
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/
│   │   ├── index.tsx       # Dashboard/Today's Jobs
│   │   ├── schedule.tsx    # Upcoming Jobs Calendar
│   │   └── profile.tsx     # Profile Screen
│   ├── job/
│   │   └── [id].tsx        # Job Details
│   └── _layout.tsx
├── components/
│   ├── JobCard.tsx
│   ├── ActionButton.tsx
│   ├── StatusBadge.tsx
│   └── ...
├── services/
│   ├── api.ts              # API client
│   ├── auth.ts             # Auth helpers
│   └── storage.ts          # Secure storage
├── hooks/
│   ├── useAuth.ts
│   ├── useJobs.ts
│   └── ...
├── types/
│   └── index.ts
├── app.json
├── package.json
└── tsconfig.json
```

---

## Implementation Phases

### Phase 1: Project Setup & Authentication (Foundation)
1. Initialize Expo project with TypeScript
2. Set up project structure
3. Configure navigation (Expo Router)
4. Implement login screen
5. Set up API client with auth token handling
6. Implement secure token storage
7. Add auth context/provider

### Phase 2: Core Job Features
1. Create Dashboard screen with job list
2. Build JobCard component
3. Implement Job Details screen
4. Add "On My Way" functionality
5. Add "Clock In" functionality
6. Add "Clock Out" functionality
7. Add pull-to-refresh

### Phase 3: Navigation & Maps
1. Add map preview to job details
2. Implement one-tap navigation to address
3. Add address formatting utilities

### Phase 4: Profile & Settings
1. Build Profile screen
2. Implement profile editing
3. Add settings screen (notifications toggle, logout)

### Phase 5: Polish & Notifications
1. Add push notification support
2. Implement loading states and error handling
3. Add offline detection/handling
4. UI polish and animations
5. App icon and splash screen

---

## API Endpoints to Use

| Feature | Endpoint | Method |
|---------|----------|--------|
| Login | `/api/auth/callback/credentials` | POST |
| Get Jobs | `/api/cleaner/jobs` | GET |
| Get Profile | `/api/cleaner/profile` | GET |
| Update Profile | `/api/cleaner/profile` | PUT |
| On My Way | `/api/cleaner/jobs/[id]/on-my-way` | POST |
| Clock In | `/api/cleaner/jobs/[id]/clock-in` | POST |
| Clock Out | `/api/cleaner/jobs/[id]/clock-out` | POST |

---

## Screens Mockup Summary

### Login Screen
- Email input
- Password input
- Login button
- Forgot password link

### Dashboard (Home)
- Header: "Today's Jobs" with date
- List of JobCards with status indicators
- Section: "Upcoming" for future jobs
- Bottom tab navigation

### Job Details
- Client name (large)
- Address with map button
- Service info (type, duration, price)
- Special instructions card
- Large action button (On My Way / Clock In / Clock Out)
- Timeline showing completed steps

### Profile
- Profile photo
- Name, email, phone
- Edit button
- Stats (total jobs, rating)
- Logout button

---

## Timeline Estimate

| Phase | Scope |
|-------|-------|
| Phase 1 | Auth & Setup |
| Phase 2 | Core Job Features |
| Phase 3 | Maps & Navigation |
| Phase 4 | Profile & Settings |
| Phase 5 | Polish & Notifications |

---

## Questions Before Starting

1. **iOS, Android, or both?** (Expo supports both)
2. **Do you have Apple Developer / Google Play accounts?**
3. **Any specific design preferences or brand colors?**
4. **Should we add biometric login (Face ID / fingerprint)?**

---

## Ready to Build?

Once you approve this plan, I'll start with Phase 1: setting up the Expo project and implementing authentication.
