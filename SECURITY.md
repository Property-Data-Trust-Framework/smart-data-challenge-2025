# Firebase Functions Security Configuration

## Current Security Setup

### Public Functions (Demo Access)
This function is publicly accessible for demonstration purposes:
- `getPropertyData` - Retrieves comprehensive property data with owners and conveyancing details

**Configuration:** `invoker: "public"`
**URL:** https://getpropertydata-sufe6opz3a-uc.a.run.app

### Private Functions (Restricted Access)
These functions require authentication and are not accessible without proper credentials:
- `getState` - Admin-only NPTN server state
- `getClaims` - Admin-only claims retrieval
- `createClaim` - Secure claim creation
- `processSmartData` - Sensitive data processing
- `getSandboxData` - Raw sandbox data (backend processing only)

**Configuration:** `invoker: "private"`

## Security Features Implemented

### 1. Function-Level Access Control
- Used Firebase Functions v2 `invoker` configuration
- Public functions: Allow unauthenticated access for demo data
- Private functions: Require proper IAM permissions

### 2. Frontend Security
- Private function endpoints are commented out in API client
- Only public endpoints are actively used by the frontend
- Authentication token handling prepared for future implementation

### 3. CORS Configuration
- All functions include CORS headers for web app access
- Configured to work with deployed frontend domain

## Production Security Recommendations

### 1. Authentication Implementation
For production deployment, implement one of:
- Firebase Authentication with ID tokens
- Service account authentication for backend services
- App Check tokens for additional client verification

### 2. Function-to-Function Communication
Use `onCall` functions instead of `onRequest` for authenticated client calls:
```javascript
// Instead of onRequest
exports.secureFunction = onCall({
  enforceAppCheck: true, // Optional: require App Check
}, (request) => {
  // request.auth.uid contains authenticated user ID
  // request.app contains App Check data
});
```

### 3. IAM Role Assignment
For service-to-service authentication:
```bash
gcloud functions add-iam-policy-binding FUNCTION_NAME \
  --member="serviceAccount:SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.invoker"
```

## Current Demo Limitations

- Private functions return generic error messages without proper auth
- No user session management implemented
- Demo uses sandbox data only - not production-ready for sensitive data

## Next Steps for Production

1. Implement Firebase Authentication
2. Add proper error handling for authentication failures
3. Configure App Check for additional security
4. Set up monitoring and logging for security events
5. Implement rate limiting for public endpoints