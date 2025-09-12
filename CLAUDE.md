# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Property Data Trust Framework (PDTF) prototype built for Smart Data Challenge 2025. It demonstrates unified property data management across multiple stakeholders using a React frontend and Firebase Functions backend.

## Architecture

### Frontend (React + Vite)
- **Location**: `/frontend/`
- **Framework**: React 19 with Vite 7.1.1 build system
- **UI**: shadcn/ui components with Tailwind CSS
- **Entry Point**: `src/main.jsx` → `src/App.jsx`
- **Key Structure**:
  - `src/components/ui/` - Comprehensive shadcn/ui component library (Dialog, Label, Toast, Skeleton, Tooltip, Button, Card, etc.)
  - `src/components/use-cases/` - Feature-specific components (PropertyViewer, BuyerViewPropertyPack, SurveyorReportSurvey, SellerConsentManagement)
  - `src/lib/api.js` - Centralized API client with public/private function separation
  - `src/lib/utils.js` - Utility functions and cn helper for className merging
  - `src/hooks/use-toast.js` - Toast notification hook for user feedback

### Backend (Firebase Functions v2)
- **Location**: `/functions/`
- **Framework**: Firebase Functions v2 with Node.js 18
- **Entry Point**: `index.js` (imports from modular handlers)
- **Architecture**: Modular handler structure organized by use case:
  - `/handlers/sandbox-data.js` - Smart Data Challenge integration
  - `/handlers/property-pack.js` - Property pack data management
  - `/handlers/pdtf-viewer.js` - PDTF claims and state viewing
  - `/handlers/seller-consent-management.js` - Participant consent management
- **Security Model**: 
  - Public functions: `getPropertyData`, `getPropertyPackData`, `getAggregatedState`, `getPDTFClaims`, `getPDTFState`, `updateParticipantStatus` (demo access)
  - Private functions: `processSmartData`, `getSandboxData` (require authentication)
- **Data Processing**: `/functions/scripts/` contains Smart Data Challenge API processors that join people, property, and conveyancing data

### Data Flow Architecture
1. **Smart Data Challenge Integration**: Backend scripts fetch real data from sandbox APIs
2. **Property-Centric Joining**: `property-centric-fetcher.js` combines people, residences, and conveyancing data by property
3. **PDTF Enhancement**: Each data source enhanced with trust metadata (verification levels, data completeness scores)
4. **Frontend Consumption**: React app consumes processed data via `getPropertyData` endpoint

## Common Commands

### Development Setup
```bash
# Use Node.js 22.12.0 (project uses this version)
nvm use 22.12.0

# Install dependencies
cd frontend && npm install
cd ../functions && npm install
```

### Frontend Development
```bash
cd frontend

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Backend Development
```bash
cd functions

# Start Firebase emulators (functions on :5001, UI on :4000)
firebase emulators:start

# Or start only functions
npm run serve

# Lint functions code
npm run lint

# Deploy functions only
npm run deploy
# or firebase deploy --only functions

# View function logs
npm run logs
```

### Full Stack Development
```bash
# Start both frontend and functions
firebase emulators:start  # Terminal 1
cd frontend && npm run dev  # Terminal 2
```

### Production Deployment
```bash
# Build frontend first
cd frontend && npm run build

# Deploy everything
firebase deploy

# Deploy specific targets
firebase deploy --only hosting
firebase deploy --only functions
```

## Key Configuration Files

- **Node Version**: Uses Node.js 22.12.0 (Vite 7.1.1 requirement)
- **Firebase Config**: `firebase.json` - hosting serves `frontend/dist`, functions have lint predeploy hook
- **Frontend Build**: `vite.config.js` - path aliases (`@/` maps to `src/`)
- **API Configuration**: `frontend/src/lib/api.js` - hardcoded production function URLs

## Smart Data Challenge Integration

The backend integrates with Smart Data Challenge sandbox using the `SMART_DATA_CHALLENGE_API_KEY` environment variable.

### Data Processors (`/functions/scripts/`)
- **property-centric-fetcher.js**: Main processor that joins all data sources by property for frontend consumption
- **sandbox-data-fetcher.js**: Raw data fetcher that retrieves and processes Smart Data Challenge API data
- **moverly-api-client.js**: Client for fetching PDTF state and claims from Moverly Staging API
- **state-aggregator.js**: JSON Pointer-based state aggregation for PDTF transaction state building

### Moverly PDTF Data Structure
The Moverly API provides two key endpoints:
- **/state**: Returns the complete aggregated state of a transaction
- **/claims**: Returns individual claims with verification metadata

Important: The state is built by aggregating all claims in timestamp order. Each claim contains:
- A **path** (JSON Pointer format like `/propertyPack/address`) 
- An **object/value** to set or replace at that path
- **verification** metadata showing:
  - Data source (e.g., "HMLR Register Extract Service")
  - Trust framework ("uk_pdtf")
  - Evidence type (e.g., "electronic_record", "digital_attestation")
  - Timestamp of verification

The `/state` endpoint provides the convenience of pre-aggregated data, while `/claims` allows inspection of individual data points and their provenance.

### PDTF Data Enhancement
All processed data includes `pdtf_metadata` with:
- `data_source`: "smart-data-sandbox"
- `verification_level`: "sandbox-verified" 
- `data_completeness`: Percentage score
- `trust_score`: Calculated trust indicator

## Security Architecture

### Function Access Control
- **Public**: `getPropertyData` - uses `invoker: "public"` for demo access
- **Private**: All other functions use `invoker: "private"` requiring IAM permissions
- **Frontend**: Only connects to public functions, private endpoints commented out in API client

### NPTN Integration
- **OAuth 2.0**: Client credentials flow for NPTN API access
- **Environment Variables**: Requires `LMS_NPTN_BASE_URL`, `OAUTH_TOKEN_URL`, `LMS_NPTN_CLIENT_ID`, `LMS_NPTN_CLIENT_SECRET`
- **Testing**: NPTN SIT environment available during working hours only

### Authentication Ready
Private functions prepared for Bearer token authentication but currently return application errors instead of 403s when called unauthenticated.

## UI Components and Design System

### shadcn/ui Integration
- **Consistent Library**: Exclusively use shadcn/ui components throughout the application - never mix with custom implementations
- **Installed Components**: Dialog, Label, Toast, Skeleton, Tooltip, Button, Card, Badge, Alert, Input, Select, Table, Tabs
- **Loading States**: Use Skeleton components for content loading placeholders, never custom CSS spinners
- **Notifications**: Use Toast hook (`useToast`) for user feedback, never browser `alert()` calls
- **Button Loading**: Use Loader2 icon from Lucide React for button loading states
- **Installation**: Add new components via `npx shadcn@latest add <component-name>`

### UI Patterns
- **Loading States**: Content-aware skeleton layouts that match the expected content structure
- **Error Handling**: Toast notifications with appropriate variants (destructive for errors, default for success)
- **Interactive Elements**: Consistent hover states, focus management, and disabled states
- **Responsive Design**: Mobile-first approach with Tailwind CSS breakpoints

### Component Structure
```
src/components/
├── ui/                    # shadcn/ui components only
│   ├── button.jsx
│   ├── card.jsx
│   ├── dialog.jsx
│   ├── skeleton.jsx
│   ├── toast.jsx
│   └── ...
├── use-cases/             # Feature-specific components
│   ├── PropertyViewer.jsx
│   ├── SellerConsentManagement.jsx
│   └── ...
```

## Use Case Components

### PropertyViewer (Primary Interface)
- **Location**: `src/components/use-cases/PropertyViewer.jsx`
- **Function**: Main property explorer with dropdown selector
- **Features**: Property selection, tabbed views (Property Details, Owners, Energy & Utilities, Conveyancing)
- **Data Flow**: Calls `getPropertyData()` with optional `propertyId` parameter

### Other Use Cases
- **BuyerViewPropertyPack**: Purchase decision support interface
- **SurveyorReportSurvey**: Professional assessment tools
- **SellerConsentManagement**: Participant consent and sharing permissions management
  - **Location**: `src/components/use-cases/SellerConsentManagement.jsx`  
  - **Function**: PDTF transaction participant management with NPTN integration
  - **Features**: 
    - Auto-load transaction data with comprehensive participant management
    - Participant list with status pills (active, invited, removed)
    - Consent status updates with real-time NPTN integration
    - Invite new participants with role-based permissions
    - Show History dialog displaying participant-related claims in chronological order
    - Human-readable claim formatting using participant names and friendly descriptions
    - Enhanced JSON claim display with intelligent formatting for names, addresses, contact info
  - **Data Flow**: Calls `getPDTFState()`, `updateParticipantStatus()`, `getPDTFClaims()`, and `inviteParticipant()` for complete NPTN API integration

## Environment Configuration

**IMPORTANT**: Always follow default ESLint rules when writing code - use double quotes, proper formatting, etc.

### Environment Variables

### Local Development
- Frontend: http://localhost:5173
- Functions: http://localhost:5001
- Firebase UI: http://localhost:4000
- Functions API base: `http://127.0.0.1:5001/moverly-smart-data-challenge/us-central1`

### Production
- Frontend: https://moverly-smart-data-challenge.web.app
- Functions: Individual Cloud Run URLs (hardcoded in `api.js`)

## Linting and Code Quality

- **Frontend**: ESLint 9 with React hooks and refresh plugins
- **Functions**: ESLint 8 with Google config, custom rules disable `require-jsdoc` and `max-len`
- **Firebase Deploy**: Automatically runs `npm run lint` before function deployment

## Data Structure

Properties are joined from three sources and enhanced with PDTF metadata. Key data fields:
- `property_id` and `uprn` for identification
- `property.*` for building details and energy performance  
- `owners[]` array with personal and contact information
- `conveyancing_data.*` with legal checks and risk assessments
- `data_quality.*` with completeness and verification metrics