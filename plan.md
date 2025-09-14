# Infrastructure

- [x] Establish project repository to manage scripts, code, data and documentation
- [x] Add backend function invocation and expose API endpoints
- [x] Build frontend UI infrastructure and deployment model

# Sandbox provenance wrapping and enhancement

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
- [ ] Add synthetic milestone and chain links
- [ ] Add partial survey report data
- [ ] Add searches data from example Moverly test transactions?
- [ ] Create two additional chain transactions in Moverly/NPTN
- [ ] Push all additional claims data to Moverly, ensure reflected in NPTN
- [ ] Script to generate new transactions and push claims data to make demo reproducible?

# Demo app - Seller Consent management

- [x] Add Seller demo mini-app use case for viewing participants and managing sharing - "Manage sharing"
- [x] Show participant state as list, with pill indicating roles and status (invited, active or removed)
- [x] Add UI to mark participant as removed or back to active
- [x] Backend calls to NPTN Select to add claim against participant as removed or back to active based on index position in participants array
- [x] Refactor backend functions into modular handlers by use case
- [x] Add Show History button for displaying participant-related claims with friendly formatting
- [x] Implement human-readable history display using participant names instead of indices
- [x] Enhanced claim formatting to show friendly descriptions of JSON changes (names, addresses, contact info, etc.)
- [x] Reconfigure Seller Consent Management to use the live LMS NPTN SIT environment

# Frontend UI Infrastructure and Consistency

- [x] Establish comprehensive shadcn/ui component usage throughout the application
- [x] Replace custom loading spinners with official Skeleton components across all use cases
- [x] Replace browser alert() calls with shadcn/ui Toast notifications for better UX
- [x] Install and configure missing shadcn/ui components: Dialog, Label, Toast, Skeleton, Tooltip
- [x] Audit entire frontend for consistent component library usage
- [x] Implement proper loading states with content-aware skeleton layouts
- [x] Enhanced button loading states using Loader2 icon instead of custom spinners
- [ ] Add UI for demo category (production live exchange, prototype live exchange, redacted-live exchange, mocked exchange)

# Demo app - Simply Conveyancing Diligence

- [ ] Tabbed view of property pack data, unfold source data into contributing claims
- [ ] Backend calls to GPT-5 summary report
- [ ] Frontend click-to-analyse, display summary report inc provenance
- [ ] Basic evolution of summary prompt for decent results

# Demo app - Survey view and submit

- [ ] Pre-survey property view tab
- [ ] Pre-populate with hardcoded survey claims
- [ ] Post-survey add additional claims (inc pictures) indicating realistic problematic issue

# Demo app - Lender AVM and risk view

- [ ] (Retrieve and?) Display AVM results
- [ ] GPT-5 demo risk analysis and scoring
- [ ] Display property info view, ensure risk of issue is highlighted

# Demo app - Chain milestones view

- [ ] Traverse chain of transactions either side and fetch milestones
- [ ] Display milestones in visual chain view

# Demo app - Portal view with property dip

- [ ] Mock up OTM page for core transaction inc MI
- [ ] Demo UI to fetch property DIP
- [ ] Display as Nationwide Mortgage Ready - click to view
- [ ] Friendly view of DIP results

# Demo app - Broker retrieve Offer

- [ ] UI for Broker view of buyer factfind
- [ ] Mocked retrieve offer
- [ ] UI to display offer as data and view PDF

# Validate other demos of existing functionality

- [ ] Moverly Agent MI view
- [ ] Moverly Seller update forms
- [ ] Moverly Seller quote and instruct via NPTN Select
- [ ] Moverly (Buyer) public MI view
- [ ] LMS conveyancer view for Movera
- [ ] Moverly add buyer
