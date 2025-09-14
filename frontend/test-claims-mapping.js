// Test script to debug claims mapping
import jp from 'json-pointer';
import traverse from 'traverse';

// Sample claims data from Moverly (first few claims)
const sampleClaims = [
  {
    "id": "02TFAVkGAscTuI5e6eTa",
    "verification": {
      "trust_framework": "uk_pdtf",
      "time": "2024-12-03T10:53:33.994Z"
    },
    "claims": {
      "/propertyPack/uprn": 100030544304
    },
    "transactionId": "CNZSJBPzkKuefQogiBUKcr"
  },
  {
    "id": "KHXrXu2wFyWxQwaiwsdV",
    "verification": {
      "trust_framework": "uk_pdtf",
      "time": "2024-12-03T10:53:33.982Z"
    },
    "claims": {
      "/status": "For sale"
    },
    "transactionId": "CNZSJBPzkKuefQogiBUKcr"
  },
  {
    "id": "TestClaimWithAddress",
    "verification": {
      "trust_framework": "uk_pdtf",
      "time": "2024-12-03T10:53:33.970Z"
    },
    "claims": {
      "/propertyPack/address": {
        "line1": "14 Pinfold Place",
        "town": "Birmingham",
        "postcode": "B15 2JJ"
      }
    },
    "transactionId": "CNZSJBPzkKuefQogiBUKcr"
  }
];

// Claims mapping function from the component
const getClaimsMap = (verifiedClaims) => {
  const claimsMap = {};

  if (!verifiedClaims || !Array.isArray(verifiedClaims)) {
    console.log('getClaimsMap: No claims or claims is not an array:', verifiedClaims);
    return claimsMap;
  }

  console.log('getClaimsMap: Processing', verifiedClaims.length, 'verified claims');

  verifiedClaims.forEach((verifiedClaim, index) => {
    if (!verifiedClaim.claims || typeof verifiedClaim.claims !== 'object') {
      console.log(`Verified claim ${index}: No claims object found`, verifiedClaim);
      return;
    }

    Object.entries(verifiedClaim.claims).forEach(([claimPath, claimObject]) => {
      console.log(`Processing claim path: ${claimPath}`, claimObject);

      let subIndex = 0;
      // if the path ends with a dash, it means it is an array append
      let indexedClaimPath = claimPath;
      if (claimPath.endsWith("-")) {
        try {
          const existingIndexedObject = jp.get(claimsMap, claimPath.slice(0, -2));
          if (existingIndexedObject) {
            subIndex = existingIndexedObject.length;
          }
        } catch (e) {
          // Path doesn't exist yet, use 0
          subIndex = 0;
        }
        indexedClaimPath = `${claimPath.slice(0, -2)}/${subIndex}`;
      }

      traverse(claimObject).forEach(function () {
        if (this.isLeaf) {
          const fullPath =
            // json pointer is weird with "/" as the path
            this.path.length === 0
              ? indexedClaimPath
              : indexedClaimPath + "/" + this.path.join("/");

          console.log(`  Mapping leaf path: ${fullPath} = ${this.node}`);

          try {
            const existing = jp.get(claimsMap, fullPath);
            if (existing && Array.isArray(existing)) {
              jp.set(claimsMap, fullPath, [...existing, verifiedClaim]);
            } else {
              jp.set(claimsMap, fullPath, [verifiedClaim]);
            }
          } catch (e) {
            // Path doesn't exist, create it
            jp.set(claimsMap, fullPath, [verifiedClaim]);
          }
        }
      });
    });
  });

  return claimsMap;
};

// Helper function to flatten nested objects to see all paths
const flatten = (obj, prefix = '') => {
  let result = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}/${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(result, flatten(obj[key], newKey));
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
};

// Test the mapping
console.log('=== Testing Claims Mapping ===');
const claimsMap = getClaimsMap(sampleClaims);

console.log('\n=== Claims Map Structure ===');
console.log(JSON.stringify(claimsMap, null, 2));

console.log('\n=== Flattened Paths ===');
const flatPaths = flatten(claimsMap);
Object.keys(flatPaths).forEach(path => {
  console.log(`${path}: ${flatPaths[path].length} claims`);
});

console.log('\n=== Testing Specific Path Lookups ===');

// Test lookups for paths we expect to find
const testPaths = [
  '/propertyPack/uprn',
  '/status',
  '/propertyPack/address',
  '/propertyPack/address/line1',
  '/propertyPack/address/town',
  '/propertyPack/address/postcode'
];

testPaths.forEach(path => {
  let claims = null;
  try {
    claims = jp.get(claimsMap, path);
  } catch (e) {
    // Path doesn't exist
  }
  console.log(`Path: ${path}`);
  console.log(`  Found: ${claims ? claims.length : 0} claims`);
  if (claims && claims.length > 0) {
    claims.forEach((claim, i) => {
      console.log(`    Claim ${i+1}: ${claim.id}`);
    });
  }
  console.log();
});

console.log('\n=== Testing contributingClaimsFromMapForData Function ===');

// Function from the component
const contributingClaimsFromMapForData = (claimsMap, dataPath, data) => {
  const claims = [];

  if (data === null || data === undefined) {
    // For simple paths, just check if there are claims directly
    try {
      const directClaims = jp.get(claimsMap, dataPath);
      if (directClaims && Array.isArray(directClaims)) {
        claims.push(...directClaims);
      }
    } catch (e) {
      // Path doesn't exist in claims map
    }
  } else {
    traverse(data).forEach(function () {
      if (this.isLeaf) {
        const sourcePath =
          // json pointer is weird with "/" as the path
          this.path.length === 0
            ? dataPath
            : dataPath + "/" + this.path.join("/");
        try {
          const claimsToBeAdded = jp.get(claimsMap, sourcePath);
          if (claimsToBeAdded && Array.isArray(claimsToBeAdded)) {
            claims.push(...claimsToBeAdded);
          }
        } catch (e) {
          // Path doesn't exist in claims map
        }
      }
    });
  }

  const dedupedClaims = Array.from(new Set(claims));
  return dedupedClaims.sort((a, b) =>
    (a.verification?.time || '').localeCompare(b.verification?.time || '')
  );
};

// Test contributing claims
console.log('Testing contributingClaimsFromMapForData:');
const testData = {
  line1: "14 Pinfold Place",
  town: "Birmingham",
  postcode: "B15 2JJ"
};

const contributingClaims = contributingClaimsFromMapForData(claimsMap, '/propertyPack/address', testData);
console.log(`Found ${contributingClaims.length} contributing claims for address data`);
contributingClaims.forEach((claim, i) => {
  console.log(`  Claim ${i+1}: ${claim.id}`);
});