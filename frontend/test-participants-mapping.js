// Test participants mapping specifically
import jp from 'json-pointer';
import traverse from 'traverse';

// Sample participants claim from the API
const participantClaim = {
  "id": "h7Fr1s1djnQOGlpBW3dt",
  "verification": {
    "trust_framework": "uk_pdtf",
    "time": "2025-09-02T12:25:59.423Z",
    "evidence": [{
      "type": "vouch",
      "verification_method": {"type": "auth"},
      "attestation": {
        "type": "digital_attestation",
        "voucher": {"name": "Ed Molyneux"}
      }
    }]
  },
  "claims": {
    "/participants/-": {
      "name": {"firstName": "Ed", "lastName": "Molyneux"},
      "email": "ed+nptn@moverly.com",
      "role": "Estate Agent",
      "externalIds": {"Moverly": "2Mpx7TnWEDQKKp4PcQZ0QgRo0m62"},
      "organisation": "NPTN Estates"
    }
  },
  "transactionId": "78HJ1ggqJBuMjED6bvhdx7"
};

// Another participant claim
const participantClaim2 = {
  "id": "KThcQLUybjvY7A",
  "claims": {
    "/participants/-": {
      "role": "Estate Agent",
      "name": {"firstName": "Sarah", "lastName": "Mitchell", "title": "Ms"},
      "email": "sarah.mitchell@property-partners.co.uk",
      "externalIds": {"propertyPartnersId": "EA2024001"}
    }
  },
  "transactionId": "78HJ1ggqJBuMjED6bvhdx7",
  "verification": {
    "evidence": [{
      "type": "electronic_record",
      "record": {"source": {"name": "Property Partners Estate Agents - Professional Services Registry"}}
    }],
    "trust_framework": "uk_pdtf",
    "time": "2025-08-12T08:46:21.745Z"
  }
};

const sampleClaims = [participantClaim, participantClaim2];

// Claims mapping function from the component
const getClaimsMap = (verifiedClaims) => {
  const claimsMap = {};

  if (!verifiedClaims || !Array.isArray(verifiedClaims)) {
    console.log('getClaimsMap: No verified claims or not an array:', verifiedClaims);
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
        console.log(`  Array append: ${claimPath} -> ${indexedClaimPath} (index: ${subIndex})`);
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
console.log('=== Testing Participants Claims Mapping ===');
const claimsMap = getClaimsMap(sampleClaims);

console.log('\n=== Claims Map Structure ===');
console.log(JSON.stringify(claimsMap, null, 2));

console.log('\n=== Flattened Paths ===');
const flatPaths = flatten(claimsMap);
Object.keys(flatPaths).forEach(path => {
  console.log(`${path}: ${flatPaths[path].length} claims`);
});

// Test specific participant lookups
console.log('\n=== Testing Participant Path Lookups ===');
const testPaths = [
  '/participants',
  '/participants/0',
  '/participants/1',
  '/participants/0/name',
  '/participants/0/name/firstName',
  '/participants/0/email',
  '/participants/1/name/firstName',
];

testPaths.forEach(path => {
  let claims = null;
  try {
    claims = jp.get(claimsMap, path);
  } catch (e) {
    // Path doesn't exist
  }
  console.log(`Path: ${path} -> Found: ${claims ? claims.length : 0} claims`);
  if (claims && claims.length > 0) {
    claims.forEach((claim, i) => {
      console.log(`    Claim ${i+1}: ${claim.id}`);
    });
  }
});

// Test contributing claims function
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

console.log('\n=== Testing contributingClaimsFromMapForData Function ===');

// Test with participant string data (like what's displayed in UI)
const participantDisplayString = "Ed Molyneux (ed+nptn@moverly.com) - Status: Active";
const contributingClaims1 = contributingClaimsFromMapForData(claimsMap, '/participants/0', participantDisplayString);
console.log(`Found ${contributingClaims1.length} contributing claims for participant 0 string data`);

// Test with just the path (null data)
const contributingClaims2 = contributingClaimsFromMapForData(claimsMap, '/participants/0', null);
console.log(`Found ${contributingClaims2.length} contributing claims for participant 0 null data`);

// Test with participant object data (what might be in state)
const participantObject = {
  name: {firstName: "Ed", lastName: "Molyneux"},
  email: "ed+nptn@moverly.com",
  role: "Estate Agent"
};
const contributingClaims3 = contributingClaimsFromMapForData(claimsMap, '/participants/0', participantObject);
console.log(`Found ${contributingClaims3.length} contributing claims for participant 0 object data`);
contributingClaims3.forEach((claim, i) => {
  console.log(`  Claim ${i+1}: ${claim.id}`);
});