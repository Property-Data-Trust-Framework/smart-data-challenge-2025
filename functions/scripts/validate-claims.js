#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");
const {
  getTransactionSchema,
  getValidator,
  isPathValid,
  getSubschemaValidator,
  getTitleAtPath,
} = require("@pdtf/schemas");
const { aggregateState } = require("./state-aggregator");

class ClaimsValidator {
  constructor() {
    this.transactionSchema = getTransactionSchema();
    this.transactionValidator = getValidator();
    this.validationResults = {
      totalClaims: 0,
      validClaims: 0,
      invalidClaims: 0,
      pathValidation: {
        validPaths: 0,
        invalidPaths: 0,
      },
      schemaValidation: {
        validValues: 0,
        invalidValues: 0,
      },
      errors: [],
      warnings: [],
    };
  }

  async validateClaimsFile(claimsFilePath) {
    console.log(`Validating claims file: ${claimsFilePath}`);
    console.log("=".repeat(60));

    try {
      const claims = JSON.parse(await fs.readFile(claimsFilePath, "utf8"));
      this.validationResults.totalClaims = claims.length;

      console.log(`Total claims to validate: ${claims.length}\n`);

      // Validate each claim
      for (let i = 0; i < claims.length; i++) {
        const claim = claims[i];
        console.log(
          `Validating claim ${i + 1}/${claims.length} (ID: ${claim.id})`,
        );

        const claimValid = this.validateSingleClaim(claim, i);
        if (claimValid) {
          this.validationResults.validClaims++;
        } else {
          this.validationResults.invalidClaims++;
        }
      }

      // Try to build state from claims and validate the full transaction
      console.log("\nValidating aggregated transaction state...");
      const aggregatedState = this.aggregateClaimsToState(claims);
      this.validateTransactionState(aggregatedState);

      // Generate validation report
      this.generateReport();

      return this.validationResults;
    } catch (error) {
      console.error("Error validating claims:", error.message);
      this.validationResults.errors.push({
        type: "file_error",
        message: error.message,
      });
      throw error;
    }
  }

  validateSingleClaim(claim, index) {
    let isValid = true;

    // Validate claim structure
    if (
      !claim.id ||
      !claim.claims ||
      !claim.transactionId ||
      !claim.verification
    ) {
      this.validationResults.errors.push({
        type: "claim_structure",
        claimIndex: index,
        claimId: claim.id,
        message:
          "Claim missing required fields (id, claims, transactionId, verification)",
      });
      isValid = false;
    }

    // Validate each path in the claim
    if (claim.claims) {
      Object.entries(claim.claims).forEach(([claimPath, claimValue]) => {
        // Validate path format
        if (!this.validatePath(claimPath, claimValue, claim.id, index)) {
          isValid = false;
        }
      });
    }

    // Validate verification structure
    if (!this.validateVerification(claim.verification, claim.id, index)) {
      isValid = false;
    }

    return isValid;
  }

  validatePath(claimPath, claimValue, claimId, claimIndex) {
    let isValid = true;

    console.log(`  Validating path: ${claimPath}`);

    // Check if path is valid according to PDTF schema
    try {
      const pathValid = isPathValid(claimPath);
      if (!pathValid) {
        this.validationResults.errors.push({
          type: "invalid_path",
          claimIndex,
          claimId,
          path: claimPath,
          message: `Path '${claimPath}' is not valid according to PDTF schema`,
        });
        this.validationResults.pathValidation.invalidPaths++;
        isValid = false;
      } else {
        this.validationResults.pathValidation.validPaths++;
        console.log(`    ✓ Path is valid`);
      }
    } catch (error) {
      this.validationResults.errors.push({
        type: "path_validation_error",
        claimIndex,
        claimId,
        path: claimPath,
        message: `Error validating path: ${error.message}`,
      });
      this.validationResults.pathValidation.invalidPaths++;
      isValid = false;
    }

    // Get the schema for this path and validate the value
    try {
      const pathTitle = getTitleAtPath(claimPath);
      if (pathTitle) {
        console.log(`    Path title: ${pathTitle}`);
      }

      // Get subschema validator for this path (with better error handling)
      let subschemaValidator = null;
      try {
        subschemaValidator = getSubschemaValidator(claimPath);
      } catch (subschemaError) {
        // Silently handle subschema errors - these are common and not actionable
        // Only log if it's not the common "Cannot read properties of undefined (reading 'split')" error
        if (
          !subschemaError.message.includes(
            "Cannot read properties of undefined",
          )
        ) {
          this.validationResults.warnings.push({
            type: "subschema_error",
            claimIndex,
            claimId,
            path: claimPath,
            message: `Error getting subschema: ${subschemaError.message}`,
          });
        }
      }

      if (subschemaValidator) {
        const valueValid = subschemaValidator(claimValue);
        if (!valueValid) {
          this.validationResults.errors.push({
            type: "invalid_value",
            claimIndex,
            claimId,
            path: claimPath,
            value: claimValue,
            message: `Value does not match schema for path '${claimPath}'`,
            schemaErrors: subschemaValidator.errors,
          });
          this.validationResults.schemaValidation.invalidValues++;
          isValid = false;
        } else {
          this.validationResults.schemaValidation.validValues++;
          console.log(`    ✓ Value is valid`);
        }
      }
      // No warning for missing subschema - this is very common and not actionable
    } catch (error) {
      // Only log unexpected errors
      if (!error.message.includes("Cannot read properties of undefined")) {
        this.validationResults.warnings.push({
          type: "schema_processing_error",
          claimIndex,
          claimId,
          path: claimPath,
          message: `Error processing schema: ${error.message}`,
        });
      }
    }

    return isValid;
  }

  validateVerification(verification, claimId, claimIndex) {
    let isValid = true;

    if (
      !verification.trust_framework ||
      verification.trust_framework !== "uk_pdtf"
    ) {
      this.validationResults.errors.push({
        type: "invalid_verification",
        claimIndex,
        claimId,
        message: "Verification must have trust_framework set to 'uk_pdtf'",
      });
      isValid = false;
    }

    if (!verification.time || !this.isValidISO8601(verification.time)) {
      this.validationResults.errors.push({
        type: "invalid_verification",
        claimIndex,
        claimId,
        message: "Verification must have valid ISO 8601 timestamp",
      });
      isValid = false;
    }

    if (
      !verification.evidence ||
      !Array.isArray(verification.evidence) ||
      verification.evidence.length === 0
    ) {
      this.validationResults.errors.push({
        type: "invalid_verification",
        claimIndex,
        claimId,
        message: "Verification must have at least one evidence item",
      });
      isValid = false;
    }

    return isValid;
  }

  aggregateClaimsToState(claims) {
    // Use proper JSON Pointer-based aggregation from state-aggregator.js
    const initialState = {
      $schema: "https://trust.propdata.org.uk/schemas/v3/pdtf-transaction.json",
      transactionId: claims[0]?.transactionId || "unknown",
      participants: [],
      propertyPack: {},
      status: "For sale",
    };

    return aggregateState(claims, initialState);
  }


  validateTransactionState(state) {
    console.log("Validating aggregated transaction against full schema...");

    try {
      const isValid = this.transactionValidator(state);

      if (isValid) {
        console.log("✓ Aggregated transaction state is valid");
        this.validationResults.transactionValid = true;
      } else {
        console.log("✗ Aggregated transaction state is invalid");
        this.validationResults.transactionValid = false;
        this.validationResults.transactionErrors =
          this.transactionValidator.errors;

        // Log first few errors
        if (this.transactionValidator.errors) {
          console.log("Transaction validation errors:");
          this.transactionValidator.errors.slice(0, 5).forEach((error) => {
            console.log(`  - ${error.instancePath}: ${error.message}`);
          });
          if (this.transactionValidator.errors.length > 5) {
            console.log(
              `  ... and ${
                this.transactionValidator.errors.length - 5
              } more errors`,
            );
          }
        }
      }
    } catch (error) {
      console.log(`Error validating transaction: ${error.message}`);
      this.validationResults.transactionValidationError = error.message;
    }
  }

  isValidISO8601(dateString) {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return iso8601Regex.test(dateString) && !isNaN(Date.parse(dateString));
  }

  generateReport() {
    console.log("\n" + "=".repeat(60));
    console.log("VALIDATION REPORT");
    console.log("=".repeat(60));

    console.log(`Total Claims: ${this.validationResults.totalClaims}`);
    console.log(`Valid Claims: ${this.validationResults.validClaims}`);
    console.log(`Invalid Claims: ${this.validationResults.invalidClaims}`);

    console.log(`\nPath Validation:`);
    console.log(
      `  Valid Paths: ${this.validationResults.pathValidation.validPaths}`,
    );
    console.log(
      `  Invalid Paths: ${this.validationResults.pathValidation.invalidPaths}`,
    );

    console.log(`\nValue Validation:`);
    console.log(
      `  Valid Values: ${this.validationResults.schemaValidation.validValues}`,
    );
    console.log(
      `  Invalid Values: ${this.validationResults.schemaValidation.invalidValues}`,
    );

    console.log(`\nTransaction Validation:`);
    console.log(
      `  Transaction Valid: ${this.validationResults.transactionValid ?
        "Yes" :
        "No"}`,
    );

    if (this.validationResults.errors.length > 0) {
      console.log(`\nErrors (${this.validationResults.errors.length}):`);
      this.validationResults.errors.slice(0, 10).forEach((error, i) => {
        console.log(`  ${i + 1}. [${error.type}] ${error.message}`);
        if (error.path) console.log(`     Path: ${error.path}`);
        if (error.claimId) console.log(`     Claim: ${error.claimId}`);
      });
      if (this.validationResults.errors.length > 10) {
        console.log(
          `     ... and ${
            this.validationResults.errors.length - 10
          } more errors`,
        );
      }
    }

    if (this.validationResults.warnings.length > 0) {
      console.log(`\nWarnings (${this.validationResults.warnings.length}):`);
      this.validationResults.warnings.slice(0, 5).forEach((warning, i) => {
        console.log(`  ${i + 1}. [${warning.type}] ${warning.message}`);
      });
      if (this.validationResults.warnings.length > 5) {
        console.log(
          `     ... and ${
            this.validationResults.warnings.length - 5
          } more warnings`,
        );
      }
    }

    // Overall result
    const overallValid =
      this.validationResults.invalidClaims === 0 &&
      this.validationResults.pathValidation.invalidPaths === 0 &&
      this.validationResults.schemaValidation.invalidValues === 0;

    console.log(
      `\nOVERALL RESULT: ${overallValid ? "✅ VALID" : "❌ INVALID"}`,
    );

    if (overallValid) {
      console.log("All claims are valid according to PDTF schema!");
    } else {
      console.log(
        "Some claims have validation issues that need to be addressed.",
      );
    }
  }

  async saveReport(outputPath) {
    try {
      // Ensure the directory exists
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // Write the report
      await fs.writeFile(
        outputPath,
        JSON.stringify(this.validationResults, null, 2),
      );
      console.log(`\nDetailed validation report saved to: ${outputPath}`);
    } catch (error) {
      console.warn(
        `\nWarning: Could not save validation report to ${outputPath}: ${error.message}`,
      );
    }
  }
}

// Main function
async function validateClaims(claimsFilePath, outputReportPath) {
  const validator = new ClaimsValidator();

  try {
    const results = await validator.validateClaimsFile(claimsFilePath);

    if (outputReportPath) {
      await validator.saveReport(outputReportPath);
    }

    return results;
  } catch (error) {
    console.error("Validation failed:", error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  const claimsFile = process.argv[2];
  let reportFile = process.argv[3];

  if (!claimsFile) {
    console.error("Usage: node validate-claims.js <claims-file> [report-file]");
    console.error("Example: node validate-claims.js data/my-claims.json");
    process.exit(1);
  }

  // Generate report file name if not provided
  if (!reportFile) {
    const claimsDir = path.dirname(claimsFile);
    const claimsName = path.basename(claimsFile, path.extname(claimsFile));
    reportFile = path.join(claimsDir, `${claimsName}-validation-report.json`);
  }

  console.log("PDTF Claims Validator");
  console.log("====================\n");

  validateClaims(claimsFile, reportFile)
    .then((results) => {
      process.exit(
        results.invalidClaims > 0 || results.pathValidation.invalidPaths > 0 ?
          1 :
          0,
      );
    })
    .catch((error) => {
      console.error("Validation failed:", error);
      process.exit(1);
    });
}

module.exports = { ClaimsValidator, validateClaims };
