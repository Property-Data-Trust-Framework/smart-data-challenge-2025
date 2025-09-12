import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Mail,
  Building,
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
  Scale,
  Home,
  Briefcase,
  FileText,
  Shield,
  DollarSign,
  History,
  Clock,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { pdtfAPI } from "@/lib/api";

const PARTICIPANT_STATUS = {
  active: {
    label: "Active",
    color: "default",
    icon: CheckCircle2,
    description: "Active participant",
  },
  invited: {
    label: "Invited",
    color: "secondary",
    icon: User,
    description: "Invitation pending",
  },
  removed: {
    label: "Removed",
    color: "destructive",
    icon: XCircle,
    description: "Access revoked",
  },
};

const PARTICIPANT_ROLES = [
  "Seller",
  "Seller's Conveyancer",
  "Prospective Buyer",
  "Buyer",
  "Buyer's Conveyancer",
  "Estate Agent",
  "Buyer's Agent",
  "Surveyor",
  "Mortgage Broker",
  "Lender",
  "Landlord",
  "Tenant",
];

function SellerConsentManagement() {
  const [transactionId] = useState("78HJ1ggqJBuMjED6bvhdx7");
  const [, setTransactionState] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [updatingParticipant, setUpdatingParticipant] = useState(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
  });
  const [inviting, setInviting] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [participantHistory, setParticipantHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Current user identification
  const currentUserEmail = "ed+nptn_diane@moverly.com";

  const loadTransactionData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const stateResponse = await pdtfAPI.getPDTFState(
        "moverly",
        transactionId
      );
      setTransactionState(stateResponse);

      // Extract participants from transaction state
      const extractedParticipants = stateResponse?.participants || [];
      setParticipants(extractedParticipants);
    } catch (err) {
      console.error("Failed to load transaction data:", err);
      const errorMessage = err.response?.data?.error || err.message;
      setError(`Failed to load transaction data: ${errorMessage}`);
      setTransactionState(null);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  const updateParticipantStatus = async (participantIndex, newStatus) => {
    setUpdatingParticipant(participantIndex);
    setError(null);

    try {
      await pdtfAPI.updateParticipantStatus(
        transactionId,
        participantIndex,
        newStatus
      );

      // Update local state immediately for better UX
      setParticipants((prev) =>
        prev.map((participant, index) =>
          index === participantIndex
            ? { ...participant, participantStatus: newStatus }
            : participant
        )
      );

      // Optionally reload full state to ensure consistency
      // await loadTransactionData();
    } catch (err) {
      console.error("Failed to update participant status:", err);
      const errorMessage = err.response?.data?.error || err.message;
      setError(`Failed to update participant status: ${errorMessage}`);
    } finally {
      setUpdatingParticipant(null);
    }
  };

  const inviteParticipant = async () => {
    if (!inviteForm.firstName || !inviteForm.lastName || !inviteForm.email || !inviteForm.role) {
      setError("All fields are required for inviting a participant");
      return;
    }

    setInviting(true);
    setError(null);

    try {
      await pdtfAPI.inviteParticipant(
        transactionId,
        inviteForm.firstName,
        inviteForm.lastName,
        inviteForm.email,
        inviteForm.role
      );

      // Reset form and close dialog
      setInviteForm({
        firstName: "",
        lastName: "",
        email: "",
        role: "",
      });
      setInviteDialogOpen(false);

      // Reload transaction data to show new participant
      await loadTransactionData();
    } catch (err) {
      console.error("Failed to invite participant:", err);
      const errorMessage = err.response?.data?.error || err.message;
      setError(`Failed to invite participant: ${errorMessage}`);
    } finally {
      setInviting(false);
    }
  };

  const loadParticipantHistory = async () => {
    setLoadingHistory(true);
    setError(null);

    try {
      const claims = await pdtfAPI.getPDTFClaims("moverly", transactionId);
      
      // Filter claims that affect participants
      const participantClaims = claims.filter(claim => {
        return claim.claims && Object.keys(claim.claims).some(path => 
          path.startsWith("/participants/")
        );
      });

      // Sort by timestamp (most recent first)
      const sortedClaims = participantClaims.sort((a, b) => 
        new Date(b.verification.time) - new Date(a.verification.time)
      );

      // Process claims into friendly format
      const processedHistory = sortedClaims.map(claim => {
        const claimPath = Object.keys(claim.claims)[0];
        const claimValue = claim.claims[claimPath];
        
        return {
          id: claim.id,
          timestamp: claim.verification.time,
          path: claimPath,
          value: claimValue,
          author: claim.verification.evidence?.[0]?.attestation?.voucher?.name || "System",
          change: formatParticipantChange(claimPath, claimValue, participants),
        };
      });

      setParticipantHistory(processedHistory);
    } catch (err) {
      console.error("Failed to load participant history:", err);
      const errorMessage = err.response?.data?.error || err.message;
      setError(`Failed to load participant history: ${errorMessage}`);
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatParticipantChange = (path, value, currentParticipants) => {
    const pathParts = path.split("/");
    
    // Helper function to get participant name by index
    const getParticipantName = (index) => {
      const participant = currentParticipants[index];
      if (participant?.name?.firstName && participant?.name?.lastName) {
        return `${participant.name.firstName} ${participant.name.lastName}`;
      }
      return `Participant ${index}`;
    };
    
    // Helper function to format complex values in a user-friendly way
    const formatValue = (val, fieldName) => {
      if (val === null || val === undefined) {
        return "Not specified";
      }
      
      if (typeof val === 'string') {
        return val;
      }
      
      if (typeof val === 'boolean') {
        return val ? "Yes" : "No";
      }
      
      if (typeof val === 'number') {
        return val.toString();
      }
      
      if (typeof val === 'object') {
        // Handle name objects
        if (fieldName === 'name' && val.firstName && val.lastName) {
          return `${val.firstName} ${val.lastName}${val.title ? ` (${val.title})` : ''}`;
        }
        
        // Handle address objects
        if (fieldName === 'address' || (val.line1 || val.postcode)) {
          const parts = [
            val.line1,
            val.line2,
            val.line3,
            val.town,
            val.county,
            val.postcode
          ].filter(Boolean);
          return parts.join(', ');
        }
        
        // Handle contact information
        if (fieldName === 'contact' || val.phone || val.email) {
          const contacts = [];
          if (val.email) contacts.push(`Email: ${val.email}`);
          if (val.phone) contacts.push(`Phone: ${val.phone}`);
          if (val.mobile) contacts.push(`Mobile: ${val.mobile}`);
          return contacts.join(', ') || 'Contact details';
        }
        
        // Handle other objects by showing key-value pairs
        const entries = Object.entries(val).filter(([, v]) => v !== null && v !== undefined);
        if (entries.length === 1) {
          const [key, value] = entries[0];
          return `${key}: ${value}`;
        } else if (entries.length <= 3) {
          return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
        } else {
          return `Updated ${entries.length} fields`;
        }
      }
      
      return String(val);
    };
    
    if (path === "/participants/-") {
      // New participant added
      const name = value.name ? formatValue(value.name, 'name') : 'Unnamed participant';
      const role = value.role || 'No role specified';
      const email = value.email || 'No email';
      const status = value.participantStatus || 'Active';
      
      return {
        type: "participant_added",
        summary: `Added new participant: ${name}`,
        details: `Role: ${role} • Email: ${email} • Status: ${status}`,
      };
    } else if (path.includes("/participantStatus")) {
      // Status change
      const participantIndex = parseInt(pathParts[2]);
      const participantName = getParticipantName(participantIndex);
      const statusLabel = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      
      return {
        type: "status_change",
        summary: `Changed ${participantName}'s status to ${statusLabel}`,
        details: `Access level updated to: ${statusLabel}`,
      };
    } else if (path.includes("/participants/") && pathParts.length > 3) {
      // Other participant field change
      const participantIndex = parseInt(pathParts[2]);
      const field = pathParts[3];
      const participantName = getParticipantName(participantIndex);
      
      // Create friendly field names
      const fieldLabels = {
        'name': 'name',
        'email': 'email address',
        'role': 'role',
        'address': 'address',
        'contact': 'contact information',
        'phone': 'phone number',
        'mobile': 'mobile number',
        'title': 'title',
        'dateOfBirth': 'date of birth',
        'nationalInsurance': 'national insurance number',
        'passport': 'passport details',
        'drivingLicense': 'driving license',
        'bankDetails': 'bank details',
        'solicitor': 'solicitor details',
        'mortgage': 'mortgage information',
      };
      
      const friendlyField = fieldLabels[field] || field.replace(/([A-Z])/g, ' $1').toLowerCase();
      const formattedValue = formatValue(value, field);
      
      return {
        type: "field_change",
        summary: `Updated ${participantName}'s ${friendlyField}`,
        details: `${friendlyField.charAt(0).toUpperCase() + friendlyField.slice(1)}: ${formattedValue}`,
      };
    } else if (path.includes("/participants/") && pathParts.length > 4) {
      // Nested field change (e.g., /participants/0/name/firstName)
      const participantIndex = parseInt(pathParts[2]);
      const parentField = pathParts[3];
      const subField = pathParts[4];
      const participantName = getParticipantName(participantIndex);
      
      const formattedValue = formatValue(value, subField);
      
      return {
        type: "field_change",
        summary: `Updated ${participantName}'s ${parentField}`,
        details: `${subField.charAt(0).toUpperCase() + subField.slice(1)}: ${formattedValue}`,
      };
    }
    
    return {
      type: "unknown",
      summary: "Participant data updated",
      details: formatValue(value, 'data'),
    };
  };

  const getEffectiveStatus = (participant) => {
    const status = participant.participantStatus || "active";
    // Normalize capitalized API responses to lowercase for consistent UI handling
    return status.toLowerCase();
  };

  const getStatusInfo = (status) => {
    return PARTICIPANT_STATUS[status] || PARTICIPANT_STATUS.active;
  };

  const canToggleStatus = (currentStatus) => {
    return currentStatus !== "invited";
  };

  const getToggleAction = (currentStatus) => {
    return currentStatus === "active" ? "removed" : "active";
  };

  const getToggleButtonText = (currentStatus) => {
    return currentStatus === "active" ? "Remove Access" : "Reactivate";
  };

  const getToggleButtonVariant = (currentStatus) => {
    return currentStatus === "active" ? "destructive" : "default";
  };

  const getRoleIcon = (role) => {
    // Official PDTF schema role mappings
    const roleIconMap = {
      Seller: Home,
      "Seller's Conveyancer": Scale,
      "Prospective Buyer": Home,
      Buyer: Home,
      "Buyer's Conveyancer": Scale,
      "Estate Agent": Building,
      "Buyer's Agent": Building,
      Surveyor: FileText,
      "Mortgage Broker": DollarSign,
      Lender: DollarSign,
      Landlord: Building,
      Tenant: User,
    };

    return roleIconMap[role] || User;
  };

  const getRolePlural = (role) => {
    // Convert singular role names to plural for group headings
    const pluralMap = {
      Seller: "Sellers",
      "Seller's Conveyancer": "Seller's Conveyancers",
      "Prospective Buyer": "Prospective Buyers",
      Buyer: "Buyers",
      "Buyer's Conveyancer": "Buyer's Conveyancers",
      "Estate Agent": "Estate Agents",
      "Buyer's Agent": "Buyer's Agents",
      Surveyor: "Surveyors",
      "Mortgage Broker": "Mortgage Brokers",
      Lender: "Lenders",
      Landlord: "Landlords",
      Tenant: "Tenants",
    };

    return pluralMap[role] || role;
  };

  const isCurrentUser = (participant) => {
    return participant.email === currentUserEmail;
  };

  const groupParticipantsByRole = (participants) => {
    const groups = participants.reduce((acc, participant, index) => {
      const role = participant.role || "Other";
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push({ ...participant, index });
      return acc;
    }, {});

    // Sort roles to ensure consistent ordering
    const sortedRoles = Object.keys(groups).sort();
    const sortedGroups = {};
    sortedRoles.forEach((role) => {
      sortedGroups[role] = groups[role];
    });

    return sortedGroups;
  };

  // Auto-load transaction data on component mount
  useEffect(() => {
    if (transactionId && !hasSearched) {
      loadTransactionData();
    }
  }, [transactionId, hasSearched, loadTransactionData]);

  return (
    <div className="space-y-6">
      {/* User Status */}
      <div className="flex justify-end items-center space-x-3">
        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          Logged in as Diane Hardy
        </div>
        <Button variant="link" size="sm">
          Logout
        </Button>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Seller Consent Management
        </h2>
        <p className="text-gray-600">
          91 South Hill Avenue • Manage participant access and sharing
          permissions
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <p className="text-gray-600">Loading transaction participants...</p>
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Participants List */}
      {!loading && hasSearched && participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Participants ({participants.length})</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setHistoryDialogOpen(true);
                    loadParticipantHistory();
                  }}
                >
                  <History className="h-4 w-4 mr-2" />
                  Show History
                </Button>
                
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Participant
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Invite New Participant</DialogTitle>
                    <DialogDescription>
                      Add a new participant to this property transaction.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="firstName" className="text-right">
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        value={inviteForm.firstName}
                        onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="lastName" className="text-right">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        value={inviteForm.lastName}
                        onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="role" className="text-right">
                        Role
                      </Label>
                      <Select
                        value={inviteForm.role}
                        onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {PARTICIPANT_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      onClick={inviteParticipant}
                      disabled={inviting}
                    >
                      {inviting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Inviting...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Invitation
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </CardTitle>
            <CardDescription>
              Manage access permissions for each participant in this transaction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(groupParticipantsByRole(participants)).map(
                ([role, roleParticipants]) => (
                  <div key={role}>
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                      {(() => {
                        const RoleHeaderIcon = getRoleIcon(role);
                        return <RoleHeaderIcon className="h-4 w-4" />;
                      })()}
                      <span>{getRolePlural(role)}</span>
                    </h3>
                    <div className="space-y-3">
                      {roleParticipants.map((participant) => {
                        const effectiveStatus = getEffectiveStatus(participant);
                        const statusInfo = getStatusInfo(effectiveStatus);
                        const RoleIcon = getRoleIcon(participant.role);
                        const isUpdating =
                          updatingParticipant === participant.index;
                        const isCurrent = isCurrentUser(participant);

                        return (
                          <Card
                            key={participant.index}
                            className={`border-l-4 ${
                              isCurrent ? "border-l-green-500" : "border-l-blue-500"
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className={`p-2 rounded-lg ${
                                    isCurrent ? "bg-green-100" : "bg-blue-100"
                                  }`}>
                                    <RoleIcon
                                      className={`h-5 w-5 ${
                                        effectiveStatus === "active"
                                          ? "text-green-600"
                                          : effectiveStatus === "removed"
                                          ? "text-red-600"
                                          : "text-yellow-600"
                                      }`}
                                    />
                                  </div>

                                  <div>
                                    <h4 className="font-semibold">
                                      {isCurrent ? "Me" : `${participant.name?.firstName} ${participant.name?.lastName}`}
                                      {isCurrent && (
                                        <span className="ml-2 text-sm font-normal text-gray-500">
                                          ({participant.name?.firstName} {participant.name?.lastName})
                                        </span>
                                      )}
                                    </h4>
                                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                                      {participant.organisation && (
                                        <span>{participant.organisation}</span>
                                      )}
                                      {participant.email && (
                                        <span className="flex items-center space-x-1">
                                          <Mail className="h-4 w-4" />
                                          <span>{participant.email}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                  <Badge variant={statusInfo.color}>
                                    {statusInfo.label}
                                  </Badge>

                                  {!isCurrent && canToggleStatus(effectiveStatus) && (
                                    <Button
                                      size="sm"
                                      variant={getToggleButtonVariant(
                                        effectiveStatus
                                      )}
                                      onClick={() =>
                                        updateParticipantStatus(
                                          participant.index,
                                          getToggleAction(effectiveStatus)
                                        )
                                      }
                                      disabled={isUpdating}
                                    >
                                      {isUpdating ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Updating...
                                        </>
                                      ) : (
                                        <>
                                          {effectiveStatus === "active" ? (
                                            <UserX className="h-4 w-4 mr-1" />
                                          ) : (
                                            <UserCheck className="h-4 w-4 mr-1" />
                                          )}
                                          {getToggleButtonText(effectiveStatus)}
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2 text-sm text-gray-500">
                                {isCurrent ? "This is your account" : statusInfo.description}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && hasSearched && participants.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No participants found</p>
            <p className="text-sm text-gray-500">
              This transaction doesn't have any participants to manage, or the
              transaction ID was not found.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Search State */}
      {!loading && !hasSearched && (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No transaction loaded</p>
            <p className="text-sm text-gray-500">
              Enter a transaction ID and click "Load Participants" to manage
              sharing permissions
            </p>
          </CardContent>
        </Card>
      )}

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Participant History</span>
            </DialogTitle>
            <DialogDescription>
              All changes made to participants in this transaction, most recent first.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {loadingHistory ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : participantHistory.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No participant history found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {participantHistory.map((entry) => (
                  <div key={entry.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      entry.change.type === 'participant_added' ? 'bg-green-500' :
                      entry.change.type === 'status_change' ? 'bg-blue-500' :
                      entry.change.type === 'field_change' ? 'bg-orange-500' :
                      'bg-gray-500'
                    }`}>
                      {entry.change.type === 'participant_added' ? <UserPlus className="h-4 w-4" /> :
                       entry.change.type === 'status_change' ? <UserCheck className="h-4 w-4" /> :
                       entry.change.type === 'field_change' ? <FileText className="h-4 w-4" /> :
                       <User className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-gray-900 truncate">
                          {entry.change.summary}
                        </p>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {entry.change.details}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <span>by {entry.author}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SellerConsentManagement;
