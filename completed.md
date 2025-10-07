# COMPLETED

## Infrastructure

- [x] Establish project repository to manage scripts, code, data and documentation
- [x] Add backend function invocation and expose API endpoints
- [x] Build frontend UI infrastructure and deployment model

## Sandbox provenance wrapping and enhancement

- [x] Connect to SDC sandbox via API and extract sample people, residences and conveyancing
- [x] Join SDC sandbox data into transaction-oriented records
- [x] Add selectable demo mini-app components and initial SDC demo data viewer
- [x] Add placeholder UI for buyer, seller and surveyor use cases
- [x] Implement Moverly PDTF staging API access
- [x] Pull complete (non sandbox) single transaction data from Moverly PDTF staging API
- [x] Write script to use Moverly transaction structure to wrap and enhance SDC sandbox data for 3 sample transactions
- [x] Associate one sandbox transaction with Moverly staging, push generated claims and hand-complete missing data
- [x] Add UI to display provenanced sandbox transactions
- [x] Write script to retrieve the missing property_land_registry and property_land_registry_charge_register fields for the sandbox transactions
- [x] Update the fetch-moverly-sample script and rename it fetch-moverly-claims to just retrieve claims for a given transaction ID and save them in a new moverly-properties directory with the file named after line1 of the address claim within that data and with a .json extension
- [x] Using that script, pull updated staging claims back for transaction id 78HJ1ggqJBuMjED6bvhdx7 for further enhancement
- [x] Also pull claims for transaction id CNZSJBPzkKuefQogiBUKcr in the same way
- [x] Enhanced fetch-moverly-claims script with automatic API key fallback to work across all transactions regardless of which API key is required
- [x] Using the claims from moverly-properties/14 Pinfold Place.json as a template and the SDC sandbox data for 91 South Hill Avenue to supply key factual elements, update the title register claim in 91 South Hill Avenue.json with broader synthetic data like charges, restrictions, covenants etc, copying the original file as moverly-properties/91 South Hill Avenue - updated.json
- [x] Updated validate-claims.js to use proper JSON Pointer-based state aggregation mechanism from state-aggregator.js for consistent PDTF transaction state building
- [x] Pull claims from moverly staging for transaction id 2MefoP93oE5DbYpyZy9Tzi using the fetch-moverly-claims script (47 Park Mount)
- [x] Using the claims from moverly-properties/47 Park Mount.json as a template and updating with realistic data, add a planning application claim to 91 South Hill Avenue claims working on a copy of the original file as moverly-properties/91 South Hill Avenue - updated.json
- [x] Remove ID fields from all verified claims in preparation for Moverly API integration
- [x] Update confidentiality levels to "restricted" for sensitive claim types (participants, insurance, servicesCrossing, occupiers, legalBoundaries)
- [x] Fix schema validation issues with empty attachments arrays in electronic_record evidence
- [x] Successfully push enhanced claims data to Moverly NPTN API (transaction 6bQY64R5mjzRDzkiVhDWf1)
- [x] Add confidentiality level display to PDTF viewer with proper color coding and capitalization
- [x] Add title OC2 document data from example Moverly test transactions
- [x] Upload real searches data to be anonymised and added to base claims data

## Demo app - Seller Consent management

- [x] Add Seller demo mini-app use case for viewing participants and managing sharing - "Manage sharing"
- [x] Show participant state as list, with pill indicating roles and status (invited, active or removed)
- [x] Add UI to mark participant as removed or back to active
- [x] Backend calls to NPTN Select to add claim against participant as removed or back to active based on index position in participants array
- [x] Refactor backend functions into modular handlers by use case
- [x] Add Show History button for displaying participant-related claims with friendly formatting
- [x] Implement human-readable history display using participant names instead of indices
- [x] Enhanced claim formatting to show friendly descriptions of JSON changes (names, addresses, contact info, etc.)
- [x] Reconfigure Seller Consent Management to use the live LMS NPTN SIT environment

## Frontend UI Infrastructure and Consistency

- [x] Establish comprehensive shadcn/ui component usage throughout the application
- [x] Replace custom loading spinners with official Skeleton components across all use cases
- [x] Replace browser alert() calls with shadcn/ui Toast notifications for better UX
- [x] Install and configure missing shadcn/ui components: Dialog, Label, Toast, Skeleton, Tooltip, Checkbox
- [x] Audit entire frontend for consistent component library usage
- [x] Implement proper loading states with content-aware skeleton layouts
- [x] Enhanced button loading states using Loader2 icon instead of custom spinners

## Demo app - Conveyancing Diligence & AI Report on Title

- [x] Add Conveyancing Diligence use case with comprehensive property data display
- [x] Load state and claims from Moverly PDTF API for transaction analysis
- [x] Implement claims mapping using JSON Pointer for hierarchical data navigation
- [x] Add UI to show contributing claims for each data element with provenance tracking
- [x] Create tabbed interface: Property Details, Title Register, and AI Report on Title
- [x] Add comprehensive property data display across 14 organized categories
- [x] Implement dedicated Title Register tab with complete Land Registry data
- [x] Simplified AI Report on Title generation using GPT-4.1
- [x] Backend integration with OpenAI API for comprehensive title analysis
- [x] Enhanced prompt engineering for professional legal document format
- [x] Markdown-formatted report output with proper legal document structure
- [x] Professional React rendering with enhanced typography and formatting
- [x] Full property transaction state analysis without token limitations
- [x] Fixed address object rendering issues and API endpoint configuration
- [x] Professional conveyancer-focused interface with complete PDTF claims provenance
- [x] Add backend support for Insights AI analysis - we'll run a prompt through Open AI based on a small structured set of checks and scenarios and return structured outputs of the results of those checks and a risk score for each
- [x] The initial checks will be to test for any restrictive covenants that may affect the transaction and any mismatch between the names of the sellers and those on the title register, but make the checks set extensible so we can add more checks in the future
- [x] Add frontend support for Insights AI analysis - it's a new tab in conveyancing diligence and we'll show the results of the checks in a table and a risk score for each check
- [x] Enhanced AI insights with comprehensive context system providing specific guidance for risk assessment
- [x] AI responses include claim ID tracking for transparency and provenance
- [x] Frontend displays claim references with "View Source Claims" functionality

## Demo app - Buyer consent to share data with Atom, retrieve offer

- [x] Show basic property view which is the property to be mortgaged (use the same transaction ID as the conveyancer view)
- [x] Show UI to ask for Buyer consent to share ID, credit score and other data with lender
- [x] Simulate retrieving offer when consent is given
- [x] View offer as data (just use demo mortgage demo fields for now) and show button to view PDF (which we'll add support for later)
- [x] Integrate with real Moverly PDTF API data instead of mock data
- [x] Use actual property data (91 South Hill Avenue, Manchester) with correct pricing (£161,000)
- [x] Remove fallback data and show proper API error handling

## Demo app - PDTF Viewer improvements

- [x] Set default transaction ID to 78HJ1ggqJBuMjED6bvhdx7 (consistent across all use cases)
- [x] Add Show/Hide Config button to toggle API configuration panel visibility
- [x] Auto-load PDTF data on component mount with default settings
- [x] Streamline interface to focus on data viewing rather than configuration

## Demo app - Property Chain Timeline View

- [x] Create milestone and chain claims for 91 South Hill Avenue transaction
- [x] Create two additional chain transactions in Moverly/NPTN:
  - 107 Sunbeam Crescent (MQhUGTBjv2wuqrJmA34Yue) - Jon and Agnieszka Jones selling to buy 91 South Hill
  - 101 Broadbridge (8HjwFCAy3EY4UmtpfEyAVo) - Neil and Diane Hardy buying, selling 91 South Hill
- [x] Push milestone and chain claims to Moverly API for all three transactions
- [x] Build Property Chain Timeline component with horizontal milestone visualization
- [x] Implement automatic chain traversal and related transaction data fetching
- [x] Add visual milestone states: completed (green check), expected (blue clock), not started (gray circle)
- [x] Display full property addresses from state data (line1, line2, town, postcode)
- [x] Show chain start/end indicators based on actual chain structure analysis
- [x] Add proper labels for chain relationships (Onward Purchase, Buyer's Sale)
- [x] Integrate Chain View into main app navigation (TRL6)

## UI Refinements

- [x] Update milestone labels to "Legal Forms", "Sold STC", and "Completion"
- [x] Remove redundant "Current Property" label from chain view
- [x] Hide Surveyor Interface from navigation menu
- [x] Remove Property Summary section from Seller Conveyancer Insights tab

## Frontend UI Infrastructure and Consistency

- [x] Add UI for demo TRL level (TRL1, TRL2, TRL3, TRL4)

## Demo app - Conveyancing Diligence & AI Report on Title

- [x] Revise insights prompt to produce more concise and actionable insights

## Demo app - Portal view with property dip

- [x] Mock up OTM page for core transaction inc MI
- [x] Demo UI to fetch property DIP
- [x] Display as Nationwide Mortgage Ready - click to view
- [x] Friendly view of DIP results
