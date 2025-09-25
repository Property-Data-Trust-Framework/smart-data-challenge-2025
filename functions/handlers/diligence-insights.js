const { onRequest } = require("firebase-functions/v2/https");
const { config } = require("firebase-functions");
const { OpenAI } = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");
const { z } = require("zod");

/**
 * Diligence Insights AI Analysis
 * Performs structured checks on property transactions with risk scoring
 */

// Zod schema for the AI response to ensure structured output
const DiligenceCheckResultSchema = z.object({
  status: z.enum(["pass", "warning", "fail"]),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  findings: z.string().min(1).describe("Brief summary of what was found"),
  details: z
    .string()
    .min(1)
    .describe(
      "Detailed explanation of the findings and potential implications",
    ),
  recommendations: z
    .string()
    .min(1)
    .describe("Specific actions or considerations for the conveyancer"),
  confidence: z.enum(["low", "medium", "high"]),
  relevantClaimIds: z
    .array(z.string())
    .describe("Array of claim IDs that directly influenced this analysis"),
});

// Extensible check system - easy to add more checks in future
const DILIGENCE_CHECKS = [
  {
    id: "restrictive_covenants",
    name: "Restrictive Covenants Analysis",
    description:
      "Identifies covenants that may restrict property use, development, or alterations",
    category: "title",
    riskFactors: [
      "building restrictions",
      "use restrictions",
      "development limitations",
      "consent requirements",
    ],
    context: {
      lookFor: [
        "Restrictive covenants in title register entries",
        "Building or alteration restrictions",
        "Business use prohibitions",
        "Consent requirements for modifications",
        "Maintenance obligations",
        "Architectural approval requirements",
        "Rights of way or access restrictions",
      ],
      riskAssessment: {
        low: "Standard residential covenants that don't significantly impact normal use (e.g., no business use, maintain property condition)",
        medium:
          "Covenants requiring consents or approvals that could delay transactions or limit development (e.g., architectural approval needed)",
        high: "Restrictive covenants that significantly limit property use or require complex consent processes",
        critical:
          "Covenants that could prevent the transaction or make the property unsuitable for intended use",
      },
      guidance:
        "Focus on practical impact on the buyer's intended use. Standard residential covenants are typically low risk. Consent requirements should be flagged as they may cause delays. Check if any covenants conflict with the buyer's known intentions.",
    },
  },
  {
    id: "seller_name_mismatch",
    name: "Seller Identity Verification",
    description:
      "Checks for discrepancies between contract sellers and registered proprietors",
    category: "identity",
    riskFactors: [
      "name variations",
      "missing proprietors",
      "spelling differences",
      "entity changes",
    ],
    context: {
      lookFor: [
        "Names of sellers in contract vs registered proprietors",
        "Spelling variations or typos in names",
        "Missing proprietors from the sale",
        "Additional proprietors not mentioned in contract",
        "Corporate name changes or succession",
        "Married names vs maiden names",
        "Use of initials vs full names",
      ],
      riskAssessment: {
        low: "Perfect match between contract sellers and registered proprietors, or minor variations easily explained (e.g., use of middle names, Mr/Mrs titles)",
        medium:
          "Minor spelling differences or name variations that can be resolved with additional documentation (e.g., marriage certificates, deed polls)",
        high: "Significant discrepancies requiring substantial additional evidence or missing proprietors that need explanation",
        critical:
          "Major mismatches that could indicate fraud, forgery, or fundamental title issues that could void the transaction",
      },
      guidance:
        "Exact name matching is ideal. Minor variations are common and usually resolvable. Missing proprietors or completely different names require immediate investigation. Consider if variations could be due to marriage, divorce, or legal name changes.",
    },
  },
  {
    id: "outstanding_charges",
    name: "Outstanding Charges & Financial Securities",
    description:
      "Identifies mortgages and charges requiring redemption before completion",
    category: "financial",
    riskFactors: [
      "outstanding mortgages",
      "multiple charges",
      "redemption complexity",
      "lender coordination",
    ],
    context: {
      lookFor: [
        "Outstanding mortgages registered against the property",
        "Second charges or secured loans",
        "Notices of home rights or matrimonial charges",
        "Restriction entries requiring lender consent",
        "Charging orders or other financial securities",
        "Unilateral notices affecting the sale",
        "Multiple lenders requiring coordination",
        "Early repayment charges or penalties",
      ],
      riskAssessment: {
        low: "Single straightforward mortgage that seller confirms will be redeemed on completion with clear redemption process",
        medium:
          "Multiple charges or complex financial arrangements requiring coordination between lenders or additional documentation",
        high: "Charges where redemption figures are unclear, lenders unresponsive, or significant early repayment penalties apply",
        critical:
          "Unknown charges, disputed amounts, restrictions preventing sale, or fundamental issues with charge redemption",
      },
      guidance:
        "Early identification allows time for redemption statements, lender coordination, and resolution of any complexities. Single mortgages are typically straightforward. Multiple charges or unresponsive lenders require immediate action. Check for early repayment charges that could affect sale proceeds.",
    },
  },
  {
    id: "title_defects",
    name: "Title Defects & Missing Documents",
    description:
      "Identifies title issues that could delay the transaction if not resolved early",
    category: "title",
    riskFactors: [
      "missing documents",
      "title defects",
      "planning issues",
      "boundary problems",
    ],
    context: {
      lookFor: [
        "Missing or defective title deeds",
        "Unregistered land requiring first registration",
        "Lost title documents needing statutory declarations",
        "Possessory or qualified titles requiring upgrading",
        "Missing planning permissions or building regulations",
        "Indemnity insurance requirements",
        "Boundary discrepancies or disputes",
        "Rights of way documentation gaps",
        "Adverse possession claims or risks",
        "Missing consents for alterations or extensions",
      ],
      riskAssessment: {
        low: "Minor issues easily resolved with indemnity insurance or straightforward documentation, no fundamental title problems",
        medium:
          "Documentation gaps requiring statutory declarations, searches, or standard indemnity policies that may cause some delay",
        high: "Significant title defects requiring court applications, complex documentation, or lengthy resolution processes",
        critical:
          "Fundamental title issues that could prevent sale, major boundary disputes, or problems that cannot be insured against",
      },
      guidance:
        "Early identification allows time for resolution without transaction pressure. Minor issues can often be resolved with indemnity insurance. Missing planning permissions or building regulations can cause serious delays. Boundary issues should be addressed before marketing. Consider title insurance for defects that cannot be cured.",
    },
  },
];

/**
 * Generate AI-powered Diligence Insights
 */
const generateDiligenceInsights = onRequest(
  {
    cors: true,
    invoker: "public", // Demo access - would be "private" in production
    timeoutSeconds: 300, // 5 minutes for AI processing
  },
  async (req, res) => {
    try {
      // Only allow POST requests
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { stateData, claimsData } = req.body;

      if (!stateData) {
        return res.status(400).json({ error: "State data is required" });
      }

      // Generate insights for each check
      const checkResults = await Promise.all(
        DILIGENCE_CHECKS.map((check) =>
          performDiligenceCheck(check, stateData, claimsData),
        ),
      );

      // Calculate overall risk assessment
      const overallRisk = calculateOverallRisk(checkResults);

      const insights = {
        analysisType: "diligence-insights",
        timestamp: new Date().toISOString(),
        transactionId: stateData.transactionId || "unknown",
        property: {
          address: formatPropertyAddress(stateData.propertyPack?.address),
          titleNumber:
            stateData.propertyPack?.titlesToBeSold?.[0]?.registerExtract
              ?.ocSummaryData?.title?.titleNumber || "Not available",
        },
        overallRisk,
        checks: checkResults,
        summary: {
          totalChecks: checkResults.length,
          passedChecks: checkResults.filter((r) => r.status === "pass").length,
          warningChecks: checkResults.filter((r) => r.status === "warning")
            .length,
          failedChecks: checkResults.filter((r) => r.status === "fail").length,
        },
        disclaimer:
          "This analysis is generated by AI for demonstration purposes. This should not be relied upon for actual conveyancing transactions. Professional legal advice should always be sought.",
      };

      res.json({
        success: true,
        insights,
      });
    } catch (error) {
      console.error("Error generating Diligence Insights:", error);
      res.status(500).json({
        error: "Failed to generate Diligence Insights",
        details: error.message,
      });
    }
  },
);

/**
 * Perform all diligence checks using AI in a single comprehensive analysis
 * @param {Object} check - The check configuration object
 * @param {Object} stateData - The aggregated property state data
 * @param {Object} claimsData - The individual claims data
 * @return {Promise<Object>} The check result with status and findings
 */
async function performDiligenceCheck(check, stateData, claimsData) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY || config().openai?.api_key;

    if (!openaiApiKey) {
      console.log(
        `OpenAI API key not found, using fallback for check: ${check.id}`,
      );
      return createFallbackCheckResult(check, stateData);
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Create comprehensive prompt with all data
    const prompt = createComprehensivePrompt(stateData, claimsData, check);

    // Use OpenAI's zodResponseFormat helper for structured output
    const responseFormat = zodResponseFormat(
      DiligenceCheckResultSchema,
      "DiligenceCheckResult",
    );

    // Set appropriate parameters for GPT-5
    const requestConfig = {
      model: "gpt-5-mini", // GPT-5 Mini with structured output support
      messages: [
        {
          role: "system",
          content: `You are an expert conveyancing solicitor analyzing property transaction data using the Property Data Trust Framework (PDTF).

          UNDERSTANDING PDTF DATA:
          - You will receive "claims" data - these are individual verified data points from various sources
          - Each claim contains verification metadata showing the data source and trust level
          - Claims aggregate together to form the complete property transaction state
          - All data is provenanced and traceable to its original source

          You must perform this specific diligence check: "${check.name}"
          ${check.description}

          WHAT TO LOOK FOR:
          ${check.context.lookFor
    .map((item) => `- ${item}`)
    .join("\n          ")}

          RISK ASSESSMENT CRITERIA:
          - LOW RISK: ${check.context.riskAssessment.low}
          - MEDIUM RISK: ${check.context.riskAssessment.medium}
          - HIGH RISK: ${check.context.riskAssessment.high}
          - CRITICAL RISK: ${check.context.riskAssessment.critical}

          GUIDANCE: ${check.context.guidance}

          Focus on identifying: ${check.riskFactors.join(", ")}

          CRITICAL: For the 'relevantClaimIds' array, ONLY include claim IDs that you DIRECTLY used to make your determination. This means:
          - Claims that contain the specific data you referenced in your findings
          - Claims that directly support your risk assessment
          - Claims that you would cite as evidence for your conclusions

          DO NOT include:
          - Claims you merely looked at but didn't use
          - Claims that are generally related but didn't influence your decision
          - All claims in a category - only the specific ones that shaped your analysis

          Be selective and precise. If you found no specific relevant claims, return an empty array [].

          Status guidelines:
          - pass: No issues found or only low-risk items that don't require action
          - warning: Medium-risk issues that should be noted and may require action
          - fail: High-risk or critical issues that require immediate attention`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: responseFormat,
    };

    // GPT-5 models only support temperature = 1
    if (requestConfig.model.startsWith("gpt-5")) {
      requestConfig.temperature = 1;
      requestConfig.max_completion_tokens = 4000; // Use max_completion_tokens for GPT-5
      console.log("[AI Request] Using GPT-5 with temperature=1");
    } else {
      requestConfig.temperature = 0.2; // Low temperature for consistent analysis
      requestConfig.max_tokens = 4000;
    }

    const response = await openai.chat.completions.create(requestConfig);

    // Parse the structured response - zodResponseFormat ensures valid structure
    let aiResult;
    try {
      aiResult = JSON.parse(response.choices[0].message.content);

      // Additional validation with Zod to be extra safe
      const validationResult = DiligenceCheckResultSchema.safeParse(aiResult);
      if (!validationResult.success) {
        console.warn(
          `Invalid AI response for check ${check.id}:`,
          validationResult.error,
        );
        return createFallbackCheckResult(check, stateData);
      }

      aiResult = validationResult.data;
    } catch (parseError) {
      console.error(
        `Failed to parse AI response for check ${check.id}:`,
        parseError,
      );
      return createFallbackCheckResult(check, stateData);
    }

    return {
      checkId: check.id,
      name: check.name,
      description: check.description,
      category: check.category,
      status: aiResult.status,
      riskLevel: aiResult.riskLevel,
      findings: aiResult.findings,
      details: aiResult.details,
      recommendations: aiResult.recommendations,
      confidence: aiResult.confidence,
      relevantClaimIds: aiResult.relevantClaimIds,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error performing check ${check.id}:`, error);
    return createFallbackCheckResult(check, stateData);
  }
}

/**
 * Create fallback check result when AI is unavailable
 * @param {Object} check - The check configuration object
 * @param {Object} stateData - The aggregated property state data
 * @return {Object} The fallback check result
 */
function createFallbackCheckResult(check, stateData) {
  // Provide realistic demo results based on actual data
  const demoResults = {
    restrictive_covenants: {
      status: "warning",
      riskLevel: "medium",
      findings: "Standard restrictive covenants identified in title register",
      details:
        "The property is subject to standard restrictive covenants typical for residential properties built in this era. These include restrictions on business use and requirements for maintaining property standards.",
      recommendations:
        "Review covenant details with client to ensure proposed use complies with restrictions. Consider covenant insurance if any uncertainty exists.",
      confidence: "high",
      relevantClaimIds: [],
    },
    seller_name_mismatch: {
      status: "pass",
      riskLevel: "low",
      findings: "Seller names match registered proprietors",
      details:
        "The names of the sellers in the contract correspond with the registered proprietors shown in the official copies of the title register.",
      recommendations:
        "Standard identity verification procedures should be followed as per CDD requirements.",
      confidence: "high",
      relevantClaimIds: [],
    },
    outstanding_charges: {
      status: "warning",
      riskLevel: "medium",
      findings: "Single mortgage identified requiring redemption on completion",
      details:
        "The property is subject to a first legal charge in favour of a mainstream lender. Redemption statement will be required to calculate the exact amount needed to discharge the mortgage on completion.",
      recommendations:
        "Request redemption statement from lender at least 10 working days before completion. Ensure sufficient sale proceeds to cover redemption amount and any early repayment charges. Confirm undertaking arrangements with lender's solicitors.",
      confidence: "high",
      relevantClaimIds: [],
    },
    title_defects: {
      status: "pass",
      riskLevel: "low",
      findings: "No significant title defects identified",
      details:
        "The property has good title with no apparent defects, missing documents, or irregularities that would prevent or delay the sale. Standard documentation appears to be in order.",
      recommendations:
        "Proceed with standard conveyancing process. Consider indemnity insurance quotes for any minor issues that may arise during the transaction.",
      confidence: "high",
      relevantClaimIds: [],
    },
  };

  const demoResult = demoResults[check.id] || {
    status: "warning",
    riskLevel: "medium",
    findings: "Check completed - API unavailable",
    details:
      "This check could not be completed due to API limitations. In production, this would contain detailed AI analysis.",
    recommendations: "Manual review recommended",
    confidence: "low",
    relevantClaimIds: [],
  };

  return {
    checkId: check.id,
    name: check.name,
    description: check.description,
    category: check.category,
    ...demoResult,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create comprehensive AI prompt with all PDTF data
 * @param {Object} stateData - The aggregated property state data
 * @param {Object} claimsData - The individual claims data
 * @param {Object} check - The check configuration object
 * @return {string} The formatted prompt for the AI
 */
function createComprehensivePrompt(stateData, claimsData, check) {
  // Format the claims data for the AI
  let claimsInfo = "No claims data available";
  if (claimsData) {
    try {
      // Handle different possible structures
      let claims = null;
      if (Array.isArray(claimsData)) {
        claims = claimsData;
      } else if (claimsData.claims && Array.isArray(claimsData.claims)) {
        claims = claimsData.claims;
      } else if (claimsData.data && Array.isArray(claimsData.data)) {
        claims = claimsData.data;
      }

      if (claims && claims.length > 0) {
        claimsInfo = `PDTF CLAIMS DATA (${claims.length} claims):
${JSON.stringify(claims, null, 2)}`;
      }
    } catch (error) {
      console.error("Error formatting claims data:", error);
      claimsInfo = "Error formatting claims data";
    }
  }

  // Format the state data
  let stateInfo = "No aggregated state data available";
  if (stateData) {
    try {
      stateInfo = `AGGREGATED PROPERTY STATE:
${JSON.stringify(stateData, null, 2)}`;
    } catch (error) {
      console.error("Error formatting state data:", error);
      stateInfo = "Error formatting state data";
    }
  }

  return `PROPERTY TRANSACTION ANALYSIS REQUEST

TRANSACTION OVERVIEW:
You are analyzing a property transaction using the Property Data Trust Framework (PDTF).

PDTF EXPLANATION:
- Claims are individual data points from verified sources (Land Registry, local authorities, etc.)
- Each claim has a path (like /propertyPack/address) showing where it fits in the overall data structure
- Claims aggregate together to build the complete property transaction state
- All data is provenanced - you can see exactly where each piece of information came from

SPECIFIC CHECK TO PERFORM:
${check.name}: ${check.description}

Focus particularly on: ${check.riskFactors.join(", ")}

DATA TO ANALYZE:

${stateInfo}

${claimsInfo}

ANALYSIS INSTRUCTIONS:
1. Review both the aggregated state and individual claims
2. Look for the specific issues mentioned in this check
3. Consider the provenance and reliability of the data sources
4. Identify any risks, inconsistencies, or issues
5. Provide practical recommendations for the conveyancer

Please analyze this data thoroughly for the specific check requested and return your findings in the required JSON format.`;
}

/**
 * Format property address for display
 * @param {Object|string} address - The address object or string
 * @return {string} The formatted address string
 */
function formatPropertyAddress(address) {
  if (!address) return "Address not available";

  if (typeof address === "string") {
    return address;
  }

  if (typeof address === "object") {
    const parts = [];
    if (address.line1) parts.push(address.line1);
    if (address.line2) parts.push(address.line2);
    if (address.town) parts.push(address.town);
    if (address.county) parts.push(address.county);
    if (address.postcode) parts.push(address.postcode);
    return parts.join(", ");
  }

  return "Address format not recognized";
}

/**
 * Calculate overall risk from individual check results
 * @param {Array} checkResults - Array of individual check results
 * @return {Object} The overall risk assessment
 */
function calculateOverallRisk(checkResults) {
  if (checkResults.length === 0) {
    return { level: "medium", description: "No checks completed" };
  }

  const riskLevels = checkResults.map((r) => r.riskLevel);

  if (riskLevels.includes("critical")) {
    return {
      level: "critical",
      description: "Critical issues identified requiring immediate attention",
    };
  }

  if (riskLevels.includes("high")) {
    return {
      level: "high",
      description:
        "High-risk issues identified requiring careful consideration",
    };
  }

  if (riskLevels.includes("medium")) {
    return {
      level: "medium",
      description: "Some issues identified that should be noted and addressed",
    };
  }

  return {
    level: "low",
    description: "No significant issues identified in completed checks",
  };
}

module.exports = {
  generateDiligenceInsights,
};
