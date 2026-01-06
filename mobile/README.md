# CleanDay Mobile App

A React Native mobile app for CleanDay CRM cleaners to manage their jobs.

## Features

- **Authentication** - Secure login with JWT tokens
- **Dashboard** - View today's and upcoming jobs
- **Job Details** - See client info, address, and special instructions
- **Job Workflow** - On My Way, Clock In, Clock Out actions
- **Profile** - View and manage cleaner profile
- **Maps Integration** - One-tap navigation to job addresses

## Tech Stack

- React Native with Expo
- TypeScript
- Expo Router for navigation
- Expo SecureStore for secure token storage

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (for testing)

### Installation

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update the API URL in `.env`:
   ```
   EXPO_PUBLIC_API_URL=http://your-local-ip:3000
   ```

5. Start the development server:
   ```bash
   npm start
   ```

6. Scan the QR code with Expo Go app

## Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Auth screens (login)
│   ├── (tabs)/            # Tab screens (dashboard, schedule, profile)
│   └── job/               # Job detail screen
├── components/            # Reusable components
├── hooks/                 # Custom React hooks
├── services/              # API and storage services
├── types/                 # TypeScript types
└── constants/             # App constants
```

## Building for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## API Endpoints Used

| Feature | Endpoint | Method |
|---------|----------|--------|
| Login | `/api/auth/mobile-login` | POST |
| Get Jobs | `/api/cleaner/jobs` | GET |
| On My Way | `/api/cleaner/jobs/[id]/on-my-way` | POST |
| Clock In | `/api/cleaner/jobs/[id]/clock-in` | POST |
| Clock Out | `/api/cleaner/jobs/[id]/clock-out` | POST |
| Get Profile | `/api/cleaner/profile` | GET |
| Update Profile | `/api/cleaner/profile` | PUT |
