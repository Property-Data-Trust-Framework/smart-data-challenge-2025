import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { usePDTF } from "@/contexts/PDTFContext";

function PDTFConfigDialog({ open, onOpenChange }) {
  const {
    services,
    selectedService,
    setSelectedService,
    transactionId,
    setTransactionId,
    loadPDTFData,
    loading,
  } = usePDTF();

  const [localTransactionId, setLocalTransactionId] = useState(transactionId);

  const handleApply = () => {
    setTransactionId(localTransactionId);
    loadPDTFData(selectedService.id, localTransactionId);
    onOpenChange(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleApply();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>PDTF Configuration</DialogTitle>
          <DialogDescription>
            Configure the PDTF service and transaction to view across all demos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="service-select">PDTF Service</Label>
            <Select
              value={selectedService.id}
              onValueChange={(value) => {
                setSelectedService(services.find((s) => s.id === value));
              }}
            >
              <SelectTrigger id="service-select">
                <SelectValue>
                  <div className="flex items-center space-x-2">
                    <span>{selectedService.icon}</span>
                    <span>{selectedService.name}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    <div className="flex items-center space-x-2">
                      <span>{service.icon}</span>
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-xs text-gray-500">
                          {service.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction-id">Transaction ID</Label>
            <Input
              id="transaction-id"
              type="text"
              placeholder={
                selectedService.id === "moverly"
                  ? "e.g., 78HJ1ggqJBuMjED6bvhdx7"
                  : "e.g., TX-2024-001"
              }
              value={localTransactionId}
              onChange={(e) => setLocalTransactionId(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>

          {selectedService.id === "lms-nptn" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>LMS NPTN Service</AlertTitle>
              <AlertDescription>
                This service uses OAuth authentication with the NPTN network.
                Ensure you have valid credentials configured in the backend.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={loading || !localTransactionId.trim()}
          >
            {loading ? "Loading..." : "Apply"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PDTFConfigDialog;
