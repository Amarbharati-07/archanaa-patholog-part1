import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch, Link } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, Check, Clock, FileText, FlaskConical, Plus, User, 
  AlertCircle, ChevronRight, X, Search, Stethoscope, Building2, Trash2, UserPlus 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Test, TestParameter, Patient, WalkinCollection, TestReportStatus } from "@shared/schema";

interface TestWithStatus extends Test {
  reportStatus: "pending" | "entered" | "finalized";
  resultId: string | null;
  reportId: string | null;
}

interface WalkinDetails {
  collection: WalkinCollection;
  patient: Patient | null;
  tests: Test[];
}

interface ParameterInput {
  parameterName: string;
  value: string;
  unit: string;
  normalRange: string;
  isAbnormal: boolean;
}

function isValueAbnormal(value: string, normalRange: string): boolean {
  if (!value || !normalRange) return false;
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return false;
  const rangeMatch = normalRange.match(/(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    return numValue < min || numValue > max;
  }
  return false;
}

export default function WalkinCollections() {
  const searchParams = useSearch();
  const collectionId = new URLSearchParams(searchParams).get("id");
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestWithStatus | null>(null);
  const [parameterInputs, setParameterInputs] = useState<ParameterInput[]>([]);
  const [technician, setTechnician] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [remarks, setRemarks] = useState("");
  
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [doctorName, setDoctorName] = useState("");
  const [doctorClinic, setDoctorClinic] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  
  // New patient form states
  const [isAddPatientMode, setIsAddPatientMode] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [newPatientGender, setNewPatientGender] = useState("");
  const [newPatientAddress, setNewPatientAddress] = useState("");

  const { data: collections, isLoading: collectionsLoading } = useQuery<WalkinCollection[]>({
    queryKey: ["/api/admin/walkin-collections"],
    enabled: !collectionId,
  });

  const { data: walkinDetails, isLoading: detailsLoading, refetch: refetchDetails } = useQuery<WalkinDetails>({
    queryKey: ["/api/admin/walkin-collections", collectionId],
    enabled: !!collectionId,
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/admin/patients"],
  });

  const { data: allTests } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  useEffect(() => {
    if (selectedTest && selectedTest.parameters) {
      const params = selectedTest.parameters as TestParameter[];
      setParameterInputs(
        params.map((p) => ({
          parameterName: p.name,
          value: "",
          unit: p.unit,
          normalRange: p.normalRange,
          isAbnormal: false,
        }))
      );
    } else {
      setParameterInputs([]);
    }
  }, [selectedTest]);

  const updateParameterValue = (index: number, value: string) => {
    setParameterInputs((prev) =>
      prev.map((p, i) =>
        i === index
          ? { ...p, value, isAbnormal: isValueAbnormal(value, p.normalRange) }
          : p
      )
    );
  };

  const createCollectionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatient || selectedTestIds.length === 0) {
        throw new Error("Please select a patient and at least one test");
      }
      return apiRequest("POST", "/api/admin/walkin-collections", {
        patientId: selectedPatient.id,
        doctorName: doctorName || null,
        doctorClinic: doctorClinic || null,
        testIds: selectedTestIds,
        notes: notes || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Collection Created", description: "Walk-in collection has been created successfully." });
      setIsAddDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/walkin-collections"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Create", description: error.message, variant: "destructive" });
    },
  });

  const saveReportMutation = useMutation({
    mutationFn: async (finalize: boolean) => {
      if (!selectedTest || !collectionId) throw new Error("Please select a test");
      const data = {
        technician: technician || "Lab Technician",
        referredBy: referredBy || undefined,
        parameterResults: parameterInputs.map((p) => ({
          parameterName: p.parameterName,
          value: p.value,
          unit: p.unit,
          normalRange: p.normalRange,
          isAbnormal: p.isAbnormal,
        })),
        remarks: remarks || undefined,
        finalize,
      };
      return apiRequest("POST", `/api/admin/walkin-collections/${collectionId}/tests/${selectedTest.id}/report`, data);
    },
    onSuccess: async (response: any) => {
      const data = await response.json();
      toast({
        title: data.allCompleted ? "All Reports Completed" : "Report Saved",
        description: data.allCompleted
          ? "All test reports for this collection are now complete."
          : "The test report has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/walkin-collections", collectionId] });
      setSelectedTest(null);
      setParameterInputs([]);
      setRemarks("");
      refetchDetails();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Save Report", description: error.message, variant: "destructive" });
    },
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/walkin-collections/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Walk-in collection deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/walkin-collections"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Delete", description: error.message, variant: "destructive" });
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async () => {
      if (!newPatientName || !newPatientPhone) {
        throw new Error("Patient name and phone are required");
      }
      const response = await apiRequest("POST", "/api/admin/patients", {
        name: newPatientName,
        phone: newPatientPhone,
        email: newPatientEmail || null,
        gender: newPatientGender || null,
        address: newPatientAddress || null,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Patient Added", description: "New patient has been created successfully." });
      setSelectedPatient(data);
      resetNewPatientForm();
      setIsAddPatientMode(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/patients"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Add Patient", description: error.message, variant: "destructive" });
    },
  });

  const resetNewPatientForm = () => {
    setNewPatientName("");
    setNewPatientPhone("");
    setNewPatientEmail("");
    setNewPatientGender("");
    setNewPatientAddress("");
    setIsAddPatientMode(false);
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setPatientSearchQuery("");
    setDoctorName("");
    setDoctorClinic("");
    setSelectedTestIds([]);
    setNotes("");
    resetNewPatientForm();
  };

  const filteredPatients = patients?.filter((p) => {
    const query = patientSearchQuery.toLowerCase();
    return (
      p.patientId.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query) ||
      p.phone.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "finalized":
        return <Badge className="bg-green-600 text-white">Completed</Badge>;
      case "entered":
        return <Badge className="bg-yellow-600 text-white">Entered</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (!collectionId) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Walk-in Collections</h1>
              <p className="text-muted-foreground">Direct sample collections from doctors/clinics</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-add-collection">
                  <Plus className="h-4 w-4" />
                  New Collection
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Walk-in Collection</DialogTitle>
                  <DialogDescription>
                    Record a sample collected directly from a doctor or clinic
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Select Patient *</Label>
                      {!selectedPatient && !isAddPatientMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => setIsAddPatientMode(true)}
                          data-testid="button-add-new-patient"
                        >
                          <UserPlus className="h-4 w-4" />
                          Add New Patient
                        </Button>
                      )}
                    </div>
                    
                    {selectedPatient ? (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{selectedPatient.name}</div>
                          <div className="text-sm text-muted-foreground">{selectedPatient.patientId}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedPatient(null)}
                          data-testid="button-clear-patient"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : isAddPatientMode ? (
                      <div className="border rounded-md p-4 space-y-4 bg-muted/30">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Add New Patient
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              resetNewPatientForm();
                            }}
                            data-testid="button-cancel-add-patient"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="newPatientName">Name *</Label>
                            <Input
                              id="newPatientName"
                              value={newPatientName}
                              onChange={(e) => setNewPatientName(e.target.value)}
                              placeholder="Patient name"
                              data-testid="input-new-patient-name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newPatientPhone">Phone *</Label>
                            <Input
                              id="newPatientPhone"
                              value={newPatientPhone}
                              onChange={(e) => setNewPatientPhone(e.target.value)}
                              placeholder="Phone number"
                              data-testid="input-new-patient-phone"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="newPatientEmail">Email</Label>
                            <Input
                              id="newPatientEmail"
                              type="email"
                              value={newPatientEmail}
                              onChange={(e) => setNewPatientEmail(e.target.value)}
                              placeholder="Email address"
                              data-testid="input-new-patient-email"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newPatientGender">Gender</Label>
                            <Select value={newPatientGender} onValueChange={setNewPatientGender}>
                              <SelectTrigger data-testid="select-new-patient-gender">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="newPatientAddress">Address</Label>
                          <Input
                            id="newPatientAddress"
                            value={newPatientAddress}
                            onChange={(e) => setNewPatientAddress(e.target.value)}
                            placeholder="Patient address"
                            data-testid="input-new-patient-address"
                          />
                        </div>
                        
                        <Button
                          onClick={() => createPatientMutation.mutate()}
                          disabled={!newPatientName || !newPatientPhone || createPatientMutation.isPending}
                          className="w-full gap-2"
                          data-testid="button-save-new-patient"
                        >
                          <UserPlus className="h-4 w-4" />
                          {createPatientMutation.isPending ? "Adding..." : "Add Patient & Select"}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search patient by name, ID, or phone..."
                            value={patientSearchQuery}
                            onChange={(e) => setPatientSearchQuery(e.target.value)}
                            className="pl-10"
                            data-testid="input-search-patient"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                          {filteredPatients?.slice(0, 8).map((patient) => (
                            <button
                              key={patient.id}
                              className="w-full p-2 rounded-md border text-left hover-elevate transition-colors"
                              onClick={() => setSelectedPatient(patient)}
                              data-testid={`button-select-patient-${patient.patientId}`}
                            >
                              <div className="font-medium">{patient.name}</div>
                              <div className="text-sm text-muted-foreground">
                                <span className="font-mono text-primary">{patient.patientId}</span> | {patient.phone}
                              </div>
                            </button>
                          ))}
                          {filteredPatients?.length === 0 && patientSearchQuery && (
                            <div className="text-center py-4 text-muted-foreground">
                              <p className="text-sm mb-2">No patients found</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAddPatientMode(true)}
                                data-testid="button-add-patient-from-search"
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add New Patient
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doctorName">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4" />
                          Doctor Name
                        </div>
                      </Label>
                      <Input
                        id="doctorName"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        placeholder="Dr. Name"
                        data-testid="input-doctor-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doctorClinic">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Clinic/Hospital
                        </div>
                      </Label>
                      <Input
                        id="doctorClinic"
                        value={doctorClinic}
                        onChange={(e) => setDoctorClinic(e.target.value)}
                        placeholder="Clinic name"
                        data-testid="input-doctor-clinic"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Tests *</Label>
                    <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                      {allTests?.map((test) => (
                        <div
                          key={test.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted"
                        >
                          <Checkbox
                            id={`test-${test.id}`}
                            checked={selectedTestIds.includes(test.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTestIds([...selectedTestIds, test.id]);
                              } else {
                                setSelectedTestIds(selectedTestIds.filter((id) => id !== test.id));
                              }
                            }}
                            data-testid={`checkbox-test-${test.id}`}
                          />
                          <label
                            htmlFor={`test-${test.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="font-medium">{test.name}</div>
                            <div className="text-sm text-muted-foreground">{test.category}</div>
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedTestIds.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedTestIds.length} test(s) selected
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes..."
                      className="resize-none"
                      data-testid="input-notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }} data-testid="button-cancel-dialog">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createCollectionMutation.mutate()}
                    disabled={!selectedPatient || selectedTestIds.length === 0 || createCollectionMutation.isPending}
                    data-testid="button-create-collection"
                  >
                    {createCollectionMutation.isPending ? "Creating..." : "Create Collection"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {collectionsLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : collections && collections.length > 0 ? (
            <div className="grid gap-4">
              {collections.map((collection) => {
                const testReportStatus = collection.testReportStatus || [];
                const completed = testReportStatus.filter(t => t.status === "finalized").length;
                const total = collection.testIds.length;
                
                return (
                  <Card key={collection.id} data-testid={`card-collection-${collection.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <Link href={`/admin/walkin-collections?id=${collection.id}`} data-testid={`link-collection-${collection.id}`}>
                          <div className="flex items-center gap-4 cursor-pointer hover-elevate rounded-md p-2 -m-2">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <FlaskConical className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Collection #{collection.id.slice(0, 8)}</span>
                                <Badge variant="secondary" className="capitalize">{collection.status}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                                {collection.doctorName && (
                                  <span className="flex items-center gap-1">
                                    <Stethoscope className="h-3 w-3" />
                                    {collection.doctorName}
                                  </span>
                                )}
                                {collection.doctorClinic && (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {collection.doctorClinic}
                                  </span>
                                )}
                                <span>{format(new Date(collection.createdAt), "dd MMM yyyy")}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">{completed}/{total} tests</div>
                            <Progress value={(completed / total) * 100} className="h-2 w-24" />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCollectionMutation.mutate(collection.id)}
                            data-testid={`button-delete-${collection.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <Link href={`/admin/walkin-collections?id=${collection.id}`}>
                            <Button variant="ghost" size="icon" data-testid={`button-open-${collection.id}`}>
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Walk-in Collections</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Create a new collection for samples collected directly from doctors/clinics
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-collection">
                  <Plus className="h-4 w-4 mr-2" />
                  New Collection
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </AdminLayout>
    );
  }

  if (detailsLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-96 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!walkinDetails) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium">Collection not found</p>
            <Link href="/admin/walkin-collections">
              <Button variant="outline" className="mt-4" data-testid="button-go-back-error">Go Back</Button>
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const { collection, patient, tests } = walkinDetails;
  const testReportStatus = collection.testReportStatus || [];
  
  const testsWithStatus: TestWithStatus[] = tests.map((test) => {
    const status = testReportStatus.find((t) => t.testId === test.id);
    return {
      ...test,
      reportStatus: (status?.status || "pending") as "pending" | "entered" | "finalized",
      resultId: status?.resultId || null,
      reportId: status?.reportId || null,
    };
  });

  const progress = {
    total: tests.length,
    completed: testReportStatus.filter((t) => t.status === "finalized").length,
    entered: testReportStatus.filter((t) => t.status === "entered").length,
    pending: tests.length - testReportStatus.filter((t) => t.status === "finalized" || t.status === "entered").length,
  };
  const progressPercent = progress.total > 0 ? ((progress.completed / progress.total) * 100) : 0;

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/admin/walkin-collections">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Create Reports</h1>
            <p className="text-muted-foreground">Collection #{collection.id.slice(0, 8)}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Patient Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{patient?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{patient?.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Patient ID</p>
                    <p className="font-medium">{patient?.patientId || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Collection Status</p>
                    <Badge variant="secondary" className="capitalize mt-1">{collection.status}</Badge>
                  </div>
                  {collection.doctorName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Referring Doctor</p>
                      <p className="font-medium">{collection.doctorName}</p>
                    </div>
                  )}
                  {collection.doctorClinic && (
                    <div>
                      <p className="text-sm text-muted-foreground">Clinic/Hospital</p>
                      <p className="font-medium">{collection.doctorClinic}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5" />
                    Tests ({progress.total})
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {progress.completed} of {progress.total} completed
                  </div>
                </div>
                <Progress value={progressPercent} className="h-2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testsWithStatus.map((test) => (
                    <div
                      key={test.id}
                      className={`flex items-center justify-between gap-4 p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedTest?.id === test.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      } ${test.reportStatus === "finalized" ? "opacity-60" : ""}`}
                      onClick={() => test.reportStatus !== "finalized" && setSelectedTest(test)}
                      data-testid={`test-item-${test.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {test.reportStatus === "finalized" ? (
                          <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                        ) : test.reportStatus === "entered" ? (
                          <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <FlaskConical className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{test.name}</p>
                          <p className="text-sm text-muted-foreground">{test.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(test.reportStatus)}
                        {test.reportStatus !== "finalized" && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">
                    {selectedTest ? "Enter Report" : "Select a Test"}
                  </CardTitle>
                  {selectedTest && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedTest(null)}
                      data-testid="button-close-form"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {selectedTest && (
                  <p className="text-sm text-muted-foreground">{selectedTest.name}</p>
                )}
              </CardHeader>
              <CardContent>
                {selectedTest ? (
                  <ScrollArea className="h-[60vh]">
                    <div className="space-y-4 pr-4">
                      <div>
                        <Label htmlFor="technician">Technician Name</Label>
                        <Input
                          id="technician"
                          value={technician}
                          onChange={(e) => setTechnician(e.target.value)}
                          placeholder="Enter technician name"
                          data-testid="input-technician"
                        />
                      </div>

                      <div>
                        <Label htmlFor="referredBy">Referred By (Optional)</Label>
                        <Input
                          id="referredBy"
                          value={referredBy}
                          onChange={(e) => setReferredBy(e.target.value)}
                          placeholder="Doctor name"
                          data-testid="input-referred-by"
                        />
                      </div>

                      <div className="border-t pt-4">
                        <Label className="text-base font-medium">Test Parameters</Label>
                        <div className="space-y-3 mt-3">
                          {parameterInputs.map((param, index) => (
                            <div key={index} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">{param.parameterName}</Label>
                                <span className="text-xs text-muted-foreground">
                                  {param.normalRange} {param.unit}
                                </span>
                              </div>
                              <Input
                                value={param.value}
                                onChange={(e) => updateParameterValue(index, e.target.value)}
                                placeholder={`Enter value (${param.unit})`}
                                className={param.isAbnormal ? "border-red-500" : ""}
                                data-testid={`input-param-${index}`}
                              />
                              {param.isAbnormal && (
                                <p className="text-xs text-red-500">Value is abnormal</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="remarks">Remarks (Optional)</Label>
                        <Textarea
                          id="remarks"
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="Additional notes"
                          className="resize-none"
                          data-testid="input-remarks"
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => saveReportMutation.mutate(false)}
                          disabled={saveReportMutation.isPending || parameterInputs.some(p => !p.value)}
                          data-testid="button-save-draft"
                        >
                          Save Draft
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => saveReportMutation.mutate(true)}
                          disabled={saveReportMutation.isPending || parameterInputs.some(p => !p.value)}
                          data-testid="button-finalize"
                        >
                          {saveReportMutation.isPending ? "Saving..." : "Finalize"}
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Click on a pending test from the list to enter its report values.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
