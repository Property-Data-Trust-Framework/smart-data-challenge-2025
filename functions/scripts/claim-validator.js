#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");
// Try to import AJV and formats - fallback if not available
let Ajv; let addFormats;
try {
  Ajv = require("ajv");
  addFormats = require("ajv-formats");
} catch (error) {
  console.warn("⚠️  AJV packages not available, using basic validation only");
}

// Try to import @pdtf/schemas - fallback if not available
let pdtfSchemas;
try {
  pdtfSchemas = require("@pdtf/schemas");
} catch (error) {
  console.warn("⚠️  @pdtf/schemas package not found. Using fallback validation.");
  pdtfSchemas = null;
}

class ClaimValidator {
  constructor() {
    if (Ajv) {
      try {
        this.ajv = new Ajv({
          allErrors: true,
          verbose: true,
          strict: false,
          validateFormats: false, // Disable format validation for now
        });

        if (addFormats) {
          addFormats(this.ajv);
        }
      } catch (error) {
        console.warn("⚠️  Could not initialize AJV, using basic validation only");
        this.ajv = null;
      }
    } else {
      this.ajv = null;
    }

    this.pdtfSchema = null;
    this.validationErrors = [];
    this.validationWarnings = [];

    this.initializeSchemas();
  }

  async initializeSchemas() {
    try {
      if (pdtfSchemas) {
        // Use the @pdtf/schemas package if available
        this.pdtfSchema = pdtfSchemas.v3?.transaction || pdtfSchemas.transaction;
        console.log("✅ Using @pdtf/schemas package for validation");
      } else {
        // Fallback to loading schema from URL or local file
        await this.loadFallbackSchema();
      }

      if (this.pdtfSchema && this.ajv) {
        this.ajv.addSchema(this.pdtfSchema, "pdtf-transaction");
        console.log("✅ PDTF transaction schema loaded successfully");
      }
    } catch (error) {
      console.error("❌ Error loading PDTF schemas:", error.message);
      this.pdtfSchema = null;
    }
  }

  async loadFallbackSchema() {
    try {
      // Try to fetch from the official URL
      const axios = require("axios");
      const response = await axios.get("https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json", {
        timeout: 10000,
      });
      this.pdtfSchema = response.data;
      console.log("✅ Downloaded PDTF schema from official source");
    } catch (error) {
      console.warn("⚠️  Could not fetch PDTF schema from official source:", error.message);

      // Try local schemas directory if it exists
      const localSchemaPath = path.join(__dirname, "../data/schemas/pdtf-transaction-v3.json");
      try {
        const schemaContent = await fs.readFile(localSchemaPath, "utf8");
        this.pdtfSchema = JSON.parse(schemaContent);
        console.log("✅ Loaded PDTF schema from local file");
      } catch (localError) {
        console.warn("⚠️  Could not load local PDTF schema:", localError.message);
      }
    }
  }

  /**
   * Extract the schema for a specific JSON Pointer path from the main PDTF schema
   * @param {string} jsonPointerPath The JSON Pointer path to get schema for
   * @return {Object|null} The schema for the path or null if not found
   */
  getSchemaForPath(jsonPointerPath) {
    if (!this.pdtfSchema) {
      return null;
    }

    try {
      // Remove leading slash and split path
      const pathParts = jsonPointerPath.replace(/^\//, "").split("/");
      let currentSchema = this.pdtfSchema;

      // Navigate through the schema following the JSON Pointer path
      for (const part of pathParts) {
        if (currentSchema.properties && currentSchema.properties[part]) {
          currentSchema = currentSchema.properties[part];
        } else if (currentSchema.type === "object" && currentSchema.additionalProperties) {
          // Handle dynamic properties
          currentSchema = currentSchema.additionalProperties;
        } else if (currentSchema.type === "array" && currentSchema.items) {
          // Handle array items (when path ends with -)
          if (part === "-") {
            currentSchema = currentSchema.items;
          } else {
            currentSchema = currentSchema.items;
          }
        } else if (currentSchema.anyOf || currentSchema.oneOf || currentSchema.allOf) {
          // Handle schema compositions - try to find the right branch
          const compositions = currentSchema.anyOf || currentSchema.oneOf || currentSchema.allOf;
          let found = false;
          for (const composition of compositions) {
            if (composition.properties && composition.properties[part]) {
              currentSchema = composition.properties[part];
              found = true;
              break;
            }
          }
          if (!found) {
            console.warn(`⚠️  Could not resolve path part "${part}" in schema composition`);
            return null;
          }
        } else {
          console.warn(`⚠️  Could not resolve path part "${part}" in schema`);
          return null;
        }
      }

      return currentSchema;
    } catch (error) {
      console.warn(`⚠️  Error extracting schema for path "${jsonPointerPath}":`, error.message);
      return null;
    }
  }

  /**
   * Validate a single claim against the appropriate PDTF schema
   * @param {Object} claim The claim to validate
   * @param {number} claimIndex Index of the claim for error reporting
   * @return {Object} Validation result with errors, warnings, and valid status
   */
  validateClaim(claim, claimIndex = 0) {
    const errors = [];
    const warnings = [];

    // Basic claim structure validation
    if (!claim || typeof claim !== "object") {
      errors.push({
        type: "structure",
        message: "Claim must be an object",
        claimIndex,
      });
      return { errors, warnings, valid: false };
    }

    // Required fields validation
    const requiredFields = ["id", "claims", "transactionId", "verification"];
    for (const field of requiredFields) {
      if (!claim[field]) {
        errors.push({
          type: "structure",
          message: `Missing required field: ${field}`,
          claimIndex,
          field,
        });
      }
    }

    // Validate each claim path and value
    if (claim.claims && typeof claim.claims === "object") {
      for (const [claimPath, claimValue] of Object.entries(claim.claims)) {
        const pathValidation = this.validateClaimPath(claimPath, claimValue, claimIndex);
        errors.push(...pathValidation.errors);
        warnings.push(...pathValidation.warnings);
      }
    } else {
      errors.push({
        type: "structure",
        message: "Claims field must be an object with claim paths",
        claimIndex,
        field: "claims",
      });
    }

    // Validate verification structure
    if (claim.verification) {
      const verificationValidation = this.validateVerification(claim.verification, claimIndex);
      errors.push(...verificationValidation.errors);
      warnings.push(...verificationValidation.warnings);
    }

    return {
      errors,
      warnings,
      valid: errors.length === 0,
    };
  }

  /**
   * Validate a claim path and its value against the PDTF schema
   * @param {string} claimPath The JSON Pointer path
   * @param {*} claimValue The value at the path
   * @param {number} claimIndex Index for error reporting
   * @return {Object} Validation result with errors and warnings
   */
  validateClaimPath(claimPath, claimValue, claimIndex) {
    const errors = [];
    const warnings = [];

    // Validate JSON Pointer format
    if (!claimPath.startsWith("/")) {
      errors.push({
        type: "path",
        message: `Claim path must start with "/" (JSON Pointer format): ${claimPath}`,
        claimIndex,
        path: claimPath,
      });
    }

    // Get the appropriate schema for this path
    const pathSchema = this.getSchemaForPath(claimPath);

    if (!pathSchema) {
      warnings.push({
        type: "schema",
        message: `No schema found for path: ${claimPath}`,
        claimIndex,
        path: claimPath,
      });
      // Continue with basic validation even without schema
      this.performBasicValidation(claimPath, claimValue, errors, warnings, claimIndex);
      return { errors, warnings };
    }

    // Validate the claim value against the path schema
    if (this.ajv) {
      try {
        const validator = this.ajv.compile(pathSchema);
        const isValid = validator(claimValue);

        if (!isValid) {
          validator.errors?.forEach((error) => {
            errors.push({
              type: "schema",
              message: `Schema validation failed for ${claimPath}: ${error.message}`,
              claimIndex,
              path: claimPath,
              schemaError: error,
              value: claimValue,
            });
          });
        }
      } catch (compileError) {
        warnings.push({
          type: "schema",
          message: `Could not compile schema for ${claimPath}: ${compileError.message}`,
          claimIndex,
          path: claimPath,
        });
      }
    } else {
      warnings.push({
        type: "schema",
        message: `AJV not available, skipping schema validation for ${claimPath}`,
        claimIndex,
        path: claimPath,
      });
    }

    // Additional specific validations
    this.performSpecificValidations(claimPath, claimValue, pathSchema, errors, warnings, claimIndex);

    return { errors, warnings };
  }

  /**
   * Perform basic validation without schema
   * @param {string} claimPath The JSON Pointer path
   * @param {*} claimValue The value at the path
   * @param {Array} errors Array to collect errors
   * @param {Array} warnings Array to collect warnings
   * @param {number} claimIndex Index for error reporting
   */
  performBasicValidation(claimPath, claimValue, errors, warnings, claimIndex) {
    // Check for common patterns that might indicate issues

    // yesNo fields should be "Yes" or "No", not boolean
    if (claimPath.includes("yesNo") || claimPath.endsWith("/yesNo")) {
      if (typeof claimValue === "boolean") {
        errors.push({
          type: "value",
          message: `yesNo field should be "Yes" or "No" string, not boolean: ${claimPath}`,
          claimIndex,
          path: claimPath,
          value: claimValue,
          suggestion: claimValue ? "Yes" : "No",
        });
      } else if (claimValue !== "Yes" && claimValue !== "No") {
        warnings.push({
          type: "value",
          message: `yesNo field should be "Yes" or "No": ${claimPath}`,
          claimIndex,
          path: claimPath,
          value: claimValue,
        });
      }
    }

    // Check for nested yesNo in objects
    if (typeof claimValue === "object" && claimValue !== null && !Array.isArray(claimValue)) {
      for (const [key, value] of Object.entries(claimValue)) {
        if (key === "yesNo" && typeof value === "boolean") {
          errors.push({
            type: "value",
            message: `Nested yesNo field should be "Yes" or "No" string, not boolean: ${claimPath}.${key}`,
            claimIndex,
            path: `${claimPath}.${key}`,
            value: value,
            suggestion: value ? "Yes" : "No",
          });
        }
      }
    }
  }

  /**
   * Perform specific validations based on schema
   * @param {string} claimPath The JSON Pointer path
   * @param {*} claimValue The value at the path
   * @param {Object} pathSchema The schema for validation
   * @param {Array} errors Array to collect errors
   * @param {Array} warnings Array to collect warnings
   * @param {number} claimIndex Index for error reporting
   */
  performSpecificValidations(claimPath, claimValue, pathSchema, errors, warnings, claimIndex) {
    // Check for enum violations
    if (pathSchema.enum && !pathSchema.enum.includes(claimValue)) {
      errors.push({
        type: "enum",
        message: `Value not in allowed enum values for ${claimPath}`,
        claimIndex,
        path: claimPath,
        value: claimValue,
        allowedValues: pathSchema.enum,
      });
    }

    // Check date formats
    if (pathSchema.format === "date" && typeof claimValue === "string") {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(claimValue)) {
        errors.push({
          type: "format",
          message: `Invalid date format for ${claimPath}, expected YYYY-MM-DD`,
          claimIndex,
          path: claimPath,
          value: claimValue,
        });
      }
    }

    // Check required properties in objects
    if (pathSchema.required && typeof claimValue === "object" && claimValue !== null) {
      for (const requiredProp of pathSchema.required) {
        if (!(requiredProp in claimValue)) {
          errors.push({
            type: "required",
            message: `Missing required property "${requiredProp}" in ${claimPath}`,
            claimIndex,
            path: claimPath,
            missingProperty: requiredProp,
          });
        }
      }
    }
  }

  /**
   * Validate verification structure
   * @param {Object} verification The verification object to validate
   * @param {number} claimIndex Index for error reporting
   * @return {Object} Validation result with errors and warnings
   */
  validateVerification(verification, claimIndex) {
    const errors = [];
    const warnings = [];

    if (!verification.evidence || !Array.isArray(verification.evidence)) {
      errors.push({
        type: "verification",
        message: "Verification must have evidence array",
        claimIndex,
      });
    }

    if (!verification.trust_framework) {
      warnings.push({
        type: "verification",
        message: "Verification missing trust_framework",
        claimIndex,
      });
    }

    if (!verification.time) {
      warnings.push({
        type: "verification",
        message: "Verification missing timestamp",
        claimIndex,
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate an entire claims file
   * @param {string} filePath Path to the claims file
   * @return {Object} Validation result for the entire file
   */
  async validateClaimsFile(filePath) {
    console.log(`🔍 Validating claims file: ${filePath}`);

    try {
      const fileContent = await fs.readFile(filePath, "utf8");
      const claims = JSON.parse(fileContent);

      if (!Array.isArray(claims)) {
        return {
          valid: false,
          errors: [{ type: "structure", message: "Claims file must contain an array of claims" }],
          warnings: [],
        };
      }

      const allErrors = [];
      const allWarnings = [];

      for (let i = 0; i < claims.length; i++) {
        const claimValidation = this.validateClaim(claims[i], i);
        allErrors.push(...claimValidation.errors);
        allWarnings.push(...claimValidation.warnings);
      }

      const result = {
        valid: allErrors.length === 0,
        totalClaims: claims.length,
        errors: allErrors,
        warnings: allWarnings,
        summary: {
          errorCount: allErrors.length,
          warningCount: allWarnings.length,
          errorTypes: this.categorizeIssues(allErrors),
          warningTypes: this.categorizeIssues(allWarnings),
        },
      };

      this.printValidationReport(filePath, result);
      return result;
    } catch (error) {
      console.error(`❌ Error validating claims file ${filePath}:`, error.message);
      return {
        valid: false,
        errors: [{ type: "file", message: `Could not read or parse file: ${error.message}` }],
        warnings: [],
      };
    }
  }

  /**
   * Categorize issues by type
   * @param {Array} issues Array of validation issues
   * @return {Object} Object with issue counts by type
   */
  categorizeIssues(issues) {
    const categories = {};
    issues.forEach((issue) => {
      const type = issue.type || "unknown";
      categories[type] = (categories[type] || 0) + 1;
    });
    return categories;
  }

  /**
   * Print a formatted validation report
   * @param {string} filePath Path to the validated file
   * @param {Object} result Validation result object
   */
  printValidationReport(filePath, result) {
    const filename = path.basename(filePath);

    if (result.valid) {
      console.log(`✅ ${filename}: All ${result.totalClaims} claims are valid!`);
      if (result.warnings.length > 0) {
        console.log(`⚠️  ${result.warnings.length} warnings found`);
      }
    } else {
      console.log(`❌ ${filename}: ${result.errors.length} validation errors found`);
    }

    if (result.errors.length > 0) {
      console.log("\n🚨 ERRORS:");
      result.errors.slice(0, 10).forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.type}] ${error.message}`);
        if (error.path) console.log(`     Path: ${error.path}`);
        if (error.suggestion) console.log(`     Suggestion: ${error.suggestion}`);
      });

      if (result.errors.length > 10) {
        console.log(`     ... and ${result.errors.length - 10} more errors`);
      }
    }

    if (result.warnings.length > 0 && result.warnings.length <= 5) {
      console.log("\n⚠️  WARNINGS:");
      result.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. [${warning.type}] ${warning.message}`);
        if (warning.path) console.log(`     Path: ${warning.path}`);
      });
    }

    if (result.summary) {
      console.log(`\n📊 Summary: ${Object.entries(result.summary.errorTypes).map(([type, count]) => `${count} ${type}`).join(", ")}`);
    }
    console.log("");
  }
}

// CLI usage
async function main() {
  const claimPath = process.argv[2];

  if (!claimPath) {
    console.error("❌ Usage: node claim-validator.js <path-to-claims-file-or-directory>");
    console.error("Examples:");
    console.error("  node claim-validator.js ../data/sandbox-claims-v3/59-hawkley-gardens-claims.json");
    console.error("  node claim-validator.js ../data/sandbox-claims-v3/");
    process.exit(1);
  }

  const validator = new ClaimValidator();

  // Wait for schema initialization
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    const stats = await fs.stat(claimPath);

    if (stats.isDirectory()) {
      // Validate all claim files in directory
      const files = await fs.readdir(claimPath);
      const claimFiles = files.filter((file) => file.endsWith("-claims.json"));

      console.log(`🔍 Found ${claimFiles.length} claim files to validate\n`);

      const results = [];
      for (const file of claimFiles) {
        const filePath = path.join(claimPath, file);
        const result = await validator.validateClaimsFile(filePath);
        results.push({ file, result });
      }

      // Overall summary
      const totalErrors = results.reduce((sum, r) => sum + r.result.errors.length, 0);
      const totalWarnings = results.reduce((sum, r) => sum + r.result.warnings.length, 0);
      const validFiles = results.filter((r) => r.result.valid).length;

      console.log(`\n📋 OVERALL SUMMARY:`);
      console.log(`   ${validFiles}/${results.length} files passed validation`);
      console.log(`   ${totalErrors} total errors, ${totalWarnings} total warnings`);

      if (totalErrors > 0) {
        process.exit(1);
      }
    } else {
      // Validate single file
      const result = await validator.validateClaimsFile(claimPath);
      if (!result.valid) {
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ClaimValidator, main };
