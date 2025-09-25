# Property Data Trust Framework (PDTF) Prototype

## Smart Data Challenge 2025 Implementation

A comprehensive property data management and verification system built for the Smart Data Challenge 2025, demonstrating the Property Data Trust Framework (PDTF) concept through real estate data integration and trust verification.

## 🏠 Project Overview

### The Problem
The UK property market lacks a unified, trustworthy system for sharing property data across stakeholders. Current challenges include:
- **Data Fragmentation**: Property information scattered across multiple sources
- **Trust & Verification**: Difficulty validating data authenticity and accuracy  
- **Access Control**: No standardized way to manage data permissions
- **Integration Complexity**: Hard to combine data from different providers
- **Privacy Concerns**: Sensitive property data needs secure sharing mechanisms

### The Solution: Property Data Trust Framework (PDTF)

PDTF establishes a decentralized trust network for property data that:
- **Unifies Data Sources**: Aggregates property, ownership, and transaction data
- **Verifies Authenticity**: Uses cryptographic proofs and trusted sources
- **Manages Access**: Granular permissions for different stakeholder roles
- **Ensures Privacy**: Secure data sharing with consent management
- **Enables Interoperability**: Standard APIs for cross-platform integration

## 🌐 Live Demo

- **Frontend Application**: https://moverly-smart-data-challenge.web.app
- **Property Data Explorer**: Interactive property search and detailed views
- **Multi-Source Integration**: People, property, and conveyancing data combined

## 🏗️ Architecture

### Frontend (React + Vite)
- **Property Data Explorer**: Property-centric interface with dropdown selector
- **Comprehensive Property Views**: Owners, energy performance, conveyancing details
- **Responsive UI**: Built with shadcn/ui components and Tailwind CSS
- **Real-time API Integration**: Direct connection to Firebase Functions

### Backend (Firebase Functions v2)
```
📦 Functions
├── 🔓 Public Functions (Demo Access)
│   └── getPropertyData - Property data with owners & conveyancing
└── 🔒 Private Functions (Authenticated Access)
    ├── getState - NPTN server state (Admin)
    ├── getClaims - Claims management (Admin) 
    ├── createClaim - Claim creation (Secure)
    ├── processSmartData - Data processing (Secure)
    └── getSandboxData - Raw sandbox data (Backend only)
```

### Data Integration
- **Smart Data Challenge Sandbox**: Real property, people, and conveyancing data
- **Property-Centric Data Processing**: Two focused processors handle all data operations
  - `property-centric-fetcher.js`: Joins all data sources by property for frontend
  - `sandbox-data-fetcher.js`: Raw data retrieval and processing for backend
- **PDTF Metadata**: Trust scores, verification levels, and data provenance
- **OAuth Integration**: Client-credentials flow for secure API access

## 📊 Data Sources & Integration

### Smart Data Challenge Sandbox API
- **People Data**: Personal details, contact info, identity verification
- **Property Data**: Addresses, energy performance, utilities, financial status  
- **Conveyancing Data**: Legal checks, risk assessments, transaction history

### PDTF Data Enhancement
All processed property data includes trust framework metadata:
```javascript
{
  "pdtf_metadata": {
    "data_source": "smart-data-sandbox",
    "processed_at": "2025-01-10T15:30:00.000Z",
    "verification_level": "sandbox-verified",
    "data_points_count": 45
  },
  "data_quality": {
    "has_property_data": true,
    "has_owner_data": true,
    "has_conveyancing_data": true,
    "uprn_match": true,
    "owner_count": 2,
    "data_completeness": 100
  }
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js 22.12.0+ (managed via nvm)
- Firebase CLI
- Smart Data Challenge API key

### Installation

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd smart-data-challenge-2025
   ```

2. **Setup Node Version**
   ```bash
   nvm use
   # Installs and uses Node.js 22.12.0
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

4. **Install Backend Dependencies**
   ```bash
   cd ../functions
   npm install
   ```

5. **Configure Environment**
   ```bash
   # Set Smart Data Challenge API key as environment variable
   firebase functions:config:set smart_data_challenge.api_key="YOUR_API_KEY_HERE"
   ```

### Local Development

1. **Start Firebase Emulators**
   ```bash
   firebase emulators:start
   ```

2. **Start Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Application**
   - Frontend: http://localhost:5173
   - Functions: http://localhost:5001

### Production Deployment

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   # Deploy functions and hosting
   firebase deploy
   ```

## 📱 Features & Demo Use Cases

### Property Data Explorer (TRL6)
- **SDC Sandbox Data**: Dropdown with 10+ real properties from Smart Data Challenge
- **Comprehensive Views**: Tabbed interface for different data categories
- **Owner Information**: Personal details, contact info, verification status
- **Energy Performance**: EPC ratings, consumption data, efficiency metrics
- **Conveyancing Details**: Legal checks, risk assessments, transaction history

### PDTF Claims & State Viewer (TRL9)
- **Real PDTF Integration**: Live connection to Moverly PDTF staging API
- **Claims Provenance**: Individual data claims with verification metadata
- **Transaction State**: Aggregated property transaction state
- **Confidentiality Management**: Display and manage data access levels
- **Multi-Service Support**: Moverly and LMS NPTN service integration

### Consent Management Dashboard (TRL6)
- **Seller Control**: View and manage who has access to property data
- **Participant Management**: Invite, activate, or remove transaction participants
- **Real-time NPTN Integration**: Live updates to participant status via NPTN API
- **History Tracking**: Comprehensive audit trail of data sharing decisions
- **Role-Based Access**: Different permission levels for different stakeholders

### Seller Conveyancer Workspace (TRL6)
- **AI-Assisted Analysis**: GPT-powered insights highlighting potential issues
- **Comprehensive Property Data**: 14+ organized categories of property information
- **Claims Provenance**: View source data for every property detail
- **Title Register Integration**: Complete Land Registry data display
- **Professional Report Generation**: AI-generated Report on Title documents

### Buyer Dashboard View (TRL6)
- **User-Friendly Interface**: Clean property summaries with risk flags
- **Decision Support**: Clear presentation of key property information
- **Multi-Source Data**: Combined property pack from various sources
- **Risk Assessment**: Visual indicators for potential issues
- **Purchase Decision Tools**: Supporting information for buying decisions

### Lender Interaction - Atom Bank (TRL5)
- **Automated Mortgage Checks**: Property pack validation for lending decisions
- **Consent Management**: Buyer consent to share data with lenders
- **Real-Time Offers**: Automated mortgage offer generation
- **Realistic Calculations**: Based on actual property values (£161K, 85% LTV)
- **Integration Ready**: Framework for lender API connections

### Surveyor Interface (TRL6)
- **Pre-Filled Reports**: Reduce duplication with existing property data
- **Structured Data Entry**: Standardized survey data collection
- **Integration Points**: Connect survey findings to property records
- **Quality Assurance**: Cross-reference with existing property information

## 🔒 Security & Privacy

### Access Control
- **Public Functions**: Demo property data (read-only)
- **Private Functions**: Require authentication for sensitive operations
- **CORS Configuration**: Secure cross-origin requests
- **API Key Management**: Secure storage of external API credentials

### Data Protection
- **Sandbox Environment**: No real personal data exposure
- **Consent Management**: Framework ready for GDPR compliance
- **Audit Logging**: Track data access and modifications
- **Encryption**: HTTPS/TLS for all API communications

## 🔧 Technical Stack

### Frontend
- **React 18** - Modern component-based UI
- **Vite 7.1.1** - Fast build tool and dev server
- **shadcn/ui** - Accessible component library
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client for API requests
- **Lucide React** - Icon library

### Backend
- **Firebase Functions v2** - Serverless compute platform
- **Node.js 18** - JavaScript runtime
- **Express.js** - Web framework via Firebase
- **Axios** - External API integration
- **ESLint** - Code quality and consistency

### Infrastructure
- **Firebase Hosting** - Static site hosting
- **Firebase Functions** - Serverless API endpoints
- **Google Cloud Run** - Container-based function execution
- **Cloud Build** - Continuous integration/deployment

## 📈 PDTF Implementation Highlights

### Trust Framework Components
1. **Data Provenance**: Complete traceability from source to display with claim IDs
2. **Verification Levels**: Multi-level verification from sandbox to production data
3. **Property-Centric Architecture**: Unified view combining multiple data domains
4. **Confidentiality Management**: Granular access control with "restricted", "private", "public" levels
5. **Claims Integration**: Real PDTF claims with Moverly and NPTN network integration

### Advanced PDTF Features
- **Live API Integration**: Direct connection to Moverly PDTF staging environment
- **Claims Provenance**: Every data point traceable to its source claim
- **State Aggregation**: JSON Pointer-based transaction state building
- **Multi-Service Support**: Both Moverly and LMS NPTN service integration
- **Confidentiality Badges**: Visual indicators showing data sensitivity levels
- **Schema Validation**: Proper PDTF schema compliance with attachment handling

### Smart Data Challenge Integration
- **Real Data Usage**: Actual property records from SDC sandbox (10 properties)
- **Enhanced Claims Data**: 149 verified claims with restricted confidentiality levels
- **Multi-Domain Joining**: Combines people, property, and conveyancing data
- **Industry Standards**: Follows UK property conventions (UPRN, EPC, etc.)
- **Production PDTF**: Real integration with staging PDTF network

## 🔮 Future Development

### Phase 2 Enhancements
- **Blockchain Integration**: Immutable property transaction records
- **AI/ML Analytics**: Property valuation and risk assessment models
- **Mobile Application**: React Native app for field inspections
- **IoT Integration**: Smart home data integration
- **Marketplace Features**: Property search and comparison tools

### Production Readiness
- **Authentication System**: Firebase Auth with role-based access
- **Real Estate APIs**: Integration with Rightmove, Zoopla, Land Registry
- **Compliance Framework**: GDPR, data protection, and industry regulations
- **Performance Optimization**: Caching, CDN, and database optimization
- **Monitoring & Analytics**: Application performance and usage insights

## 📞 Smart Data Challenge 2025

This project demonstrates innovative use of the Smart Data Challenge dataset to create a unified property data ecosystem. The PDTF approach addresses key industry challenges around data fragmentation, trust, and interoperability while maintaining privacy and security standards.

### Key Innovations
- **Production PDTF Integration**: Real connection to staging PDTF network with 149+ verified claims
- **Trust-by-Design**: Built-in verification, data quality scoring, and confidentiality management
- **Advanced Claims System**: Complete provenance tracking with JSON Pointer state aggregation
- **Multi-Stakeholder Platform**: 7 distinct use cases covering entire property transaction lifecycle
- **Industry Integration**: Standards-based approach using UPRN, EPC, PDTF schemas, and UK conventions

## 📄 License

This project is part of the Smart Data Challenge 2025 submission and follows the challenge's terms and conditions for data usage and intellectual property.

---

**Built for Smart Data Challenge 2025** | **Property Data Trust Framework** | **Powered by Firebase & React**