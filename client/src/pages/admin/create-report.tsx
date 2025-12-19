import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { format } from "date-fns";
import { 
  Search, 
  User, 
  AlertCircle, 
  Check, 
  FileText, 
  Phone, 
  Mail, 
  Calendar, 
  FlaskConical, 
  Package, 
  Clock,
  UserPlus,
  X,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Patient, Test, TestParameter, Booking, Report, Result, HealthPackage } from "@shared/schema";

interface ParameterInput {
  parameterName: string;
  value: string;
  unit: string;
  normalRange: string;
  isAbnormal: boolean;
}

interface BookingWithDetails extends Booking {
  tests: Test[];
  healthPackage: HealthPackage | null;
  reports: ReportWithDetails[];
}

interface ReportWithDetails extends Report {
  result: Result | null;
  test: Test | null;
}

interface PatientDetails {
  patient: Patient;
  bookings: BookingWithDetails[];
  standaloneReports: ReportWithDetails[];
  stats: {
    totalBookings: number;
    totalTests: number;
    completedReports: number;
    pendingBookings: number;
  };
}

function isValueAbnormal(value: string, normalRange: string): boolean {
  if (!value || !normalRange) return false;
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return false;
  
  const rangeMatch = normalRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
  if (rangeMatch) {
    const [, min, max] = rangeMatch;
    return numValue < parseFloat(min) || numValue > parseFloat(max);
  }
  
  const lessThan = normalRange.match(/<\s*(\d+\.?\d*)/);
  if (lessThan) {
    return numValue >= parseFloat(lessThan[1]);
  }
  
  const greaterThan = normalRange.match(/>\s*(\d+\.?\d*)/);
  if (greaterThan) {
    return numValue <= parseFloat(greaterThan[1]);
  }
  
  return false;
}

export default function CreateReport() {
  const searchParams = useSearch();
  const preselectedPatientId = new URLSearchParams(searchParams).get("patient");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [parameterInputs, setParameterInputs] = useState<ParameterInput[]>([]);
  const [technician, setTechnician] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isAddPatientMode, setIsAddPatientMode] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [newPatientGender, setNewPatientGender] = useState("");
  const [newPatientAddress, setNewPatientAddress] = useState("");

  const { data: patients, isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ["/api/admin/patients"],
  });

  const { data: tests, isLoading: testsLoading } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  const [adminToken, setAdminToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    setAdminToken(token);
  }, [selectedPatient]);

  const { data: patientDetails, isLoading: detailsLoading } = useQuery<PatientDetails | null>({
    queryKey: ["/api/admin/patients", selectedPatient?.id, "details"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      if (!token) return null;
      const res = await fetch(`/api/admin/patients/${selectedPatient?.id}/details`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedPatient?.id && !!adminToken,
    staleTime: 0,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (preselectedPatientId && patients) {
      const patient = patients.find((p) => p.id === preselectedPatientId);
      if (patient) {
        setSelectedPatient(patient);
      }
    }
  }, [preselectedPatientId, patients]);

  useEffect(() => {
    setSelectedBooking(null);
    setSelectedTest(null);
  }, [selectedPatient?.id]);

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

  const filteredPatients = patients?.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.patientId.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query) ||
      p.phone.toLowerCase().includes(query)
    );
  });

  const updateParameterValue = (index: number, value: string) => {
    setParameterInputs((prev) =>
      prev.map((p, i) =>
        i === index
          ? {
              ...p,
              value,
              isAbnormal: isValueAbnormal(value, p.normalRange),
            }
          : p
      )
    );
  };

  const createPatientMutation = useMutation({
    mutationFn: async (patientData: { name: string; phone: string; email: string | null; gender: string | null; address: string | null }) => {
      const response = await apiRequest("POST", "/api/admin/patients", patientData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Patient Added", description: "New patient has been created successfully." });
      setSelectedPatient(data);
      resetNewPatientForm();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/patients"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Add Patient", description: error.message, variant: "destructive" });
    },
  });

  const handleCreatePatient = () => {
    if (!newPatientName.trim() || !newPatientPhone.trim()) {
      toast({ 
        title: "Required Fields", 
        description: "Please enter patient name and phone number.", 
        variant: "destructive" 
      });
      return;
    }
    createPatientMutation.mutate({
      name: newPatientName.trim(),
      phone: newPatientPhone.trim(),
      email: newPatientEmail.trim() || null,
      gender: newPatientGender || null,
      address: newPatientAddress.trim() || null,
    });
  };

  const resetNewPatientForm = () => {
    setNewPatientName("");
    setNewPatientPhone("");
    setNewPatientEmail("");
    setNewPatientGender("");
    setNewPatientAddress("");
    setIsAddPatientMode(false);
  };

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatient || !selectedTest) {
        throw new Error("Please select a patient and test");
      }
      
      const data = {
        patientId: selectedPatient.id,
        testId: selectedTest.id,
        technician,
        referredBy: referredBy || undefined,
        collectedAt: new Date().toISOString(),
        parameterResults: parameterInputs.map((p) => ({
          parameterName: p.parameterName,
          value: p.value,
          unit: p.unit,
          normalRange: p.normalRange,
          isAbnormal: p.isAbnormal,
        })),
        remarks: remarks || undefined,
      };
      
      return apiRequest("POST", "/api/admin/reports/generate", data);
    },
    onSuccess: () => {
      toast({
        title: "Report Generated",
        description: "The report has been created and notifications sent.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patient/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/patients", selectedPatient?.id, "details"] });
      navigate("/admin/reports");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Generate Report",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectTestFromBooking = (test: Test, booking: BookingWithDetails) => {
    setSelectedTest(test);
    setSelectedBooking(booking);
  };

  const isFormValid = selectedPatient && selectedTest && technician && parameterInputs.every((p) => p.value);

  // Group tests by booking
  const getTestsByBooking = () => {
    if (!patientDetails?.bookings) return [];
    
    return patientDetails.bookings.map((booking) => {
      const testsWithStatus = booking.tests.map((test) => {
        const hasReport = booking.reports?.some(r => r.test?.id === test.id);
        return {
          test,
          isCompleted: !!hasReport,
        };
      });
      
      return {
        booking,
        tests: testsWithStatus,
        completedCount: testsWithStatus.filter(t => t.isCompleted).length,
        totalCount: testsWithStatus.length,
      };
    }).sort((a, b) => new Date(b.booking.slot).getTime() - new Date(a.booking.slot).getTime());
  };

  const bookingsWithTests = getTestsByBooking();
  const totalCount = bookingsWithTests.reduce((sum, b) => sum + b.totalCount, 0);
  const completedCount = bookingsWithTests.reduce((sum, b) => sum + b.completedCount, 0);

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 h-full bg-muted/30">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Create Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter test results and generate patient report</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-160px)]">
          {/* Left Panel - Patient & Booking Summary */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5 overflow-hidden">
            {/* Patient Selection/Info */}
            <Card className="shrink-0 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold">Patient</CardTitle>
                  {!selectedPatient && !isAddPatientMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setIsAddPatientMode(true)}
                      data-testid="button-add-new-patient"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      New
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                {selectedPatient ? (
                  <div className="space-y-4">
                    {/* Patient Info */}
                    <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-lg border border-border/50">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base truncate">{selectedPatient.name}</div>
                        <div className="text-sm text-primary font-mono mt-0.5">{selectedPatient.patientId}</div>
                      </div>
                    </div>
                    
                    {/* Contact Info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground px-1">
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {selectedPatient.phone}
                      </span>
                      {selectedPatient.email && (
                        <span className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="truncate max-w-[140px]">{selectedPatient.email}</span>
                        </span>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedPatient(null);
                        setSearchQuery("");
                      }}
                      data-testid="button-change-patient"
                    >
                      Change Patient
                    </Button>
                  </div>
                ) : isAddPatientMode ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Add New Patient</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={resetNewPatientForm}
                        data-testid="button-cancel-add-patient"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Input
                          value={newPatientName}
                          onChange={(e) => setNewPatientName(e.target.value)}
                          placeholder="Name *"
                          data-testid="input-new-patient-name"
                        />
                      </div>
                      <Input
                        value={newPatientPhone}
                        onChange={(e) => setNewPatientPhone(e.target.value)}
                        placeholder="Phone *"
                        data-testid="input-new-patient-phone"
                      />
                      <Select value={newPatientGender} onValueChange={setNewPatientGender}>
                        <SelectTrigger data-testid="select-new-patient-gender">
                          <SelectValue placeholder="Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="col-span-2">
                        <Input
                          type="email"
                          value={newPatientEmail}
                          onChange={(e) => setNewPatientEmail(e.target.value)}
                          placeholder="Email"
                          data-testid="input-new-patient-email"
                        />
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleCreatePatient}
                      disabled={createPatientMutation.isPending}
                      className="w-full"
                      data-testid="button-save-new-patient"
                    >
                      {createPatientMutation.isPending ? "Adding..." : "Add Patient"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, ID or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-patient"
                      />
                    </div>
                    {patientsLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-14 w-full" />
                        ))}
                      </div>
                    ) : (
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2 pr-3">
                          {filteredPatients?.slice(0, 10).map((patient) => (
                            <button
                              key={patient.id}
                              className="w-full p-3 rounded-lg border text-left hover-elevate transition-colors"
                              onClick={() => setSelectedPatient(patient)}
                              data-testid={`button-select-patient-${patient.patientId}`}
                            >
                              <div className="font-medium">{patient.name}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                <span className="font-mono text-primary">{patient.patientId}</span>
                                <span className="mx-2">|</span>
                                {patient.phone}
                              </div>
                            </button>
                          ))}
                          {filteredPatients?.length === 0 && searchQuery && (
                            <div className="text-center py-6">
                              <p className="text-sm text-muted-foreground mb-3">No patients found</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAddPatientMode(true)}
                                data-testid="button-add-patient-from-search"
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add New
                              </Button>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking Summary - Only shown when patient is selected */}
            {selectedPatient && (
              <Card className="flex-1 min-h-[300px] flex flex-col shadow-sm overflow-hidden">
                <CardHeader className="pb-3 pt-4 px-5 shrink-0 border-b">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FlaskConical className="h-4 w-4" />
                    Tests to Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
                  {detailsLoading ? (
                    <div className="p-5 space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-28 w-full" />
                    </div>
                  ) : !patientDetails || totalCount === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-5">
                      <div className="text-center py-6">
                        <FlaskConical className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
                        <p className="text-sm text-muted-foreground">No pending tests</p>
                        <p className="text-xs text-muted-foreground mt-2">Select a test manually below</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                      {/* Progress Summary */}
                      <div className="mx-4 mt-4 mb-3 p-3 bg-muted/40 rounded-lg border border-border/50 shrink-0">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold">{completedCount}/{totalCount} completed</span>
                        </div>
                        <Progress value={(completedCount / totalCount) * 100} className="h-2" />
                      </div>
                      
                      {/* Test List - Grouped by Booking */}
                      <div className="flex-1 min-h-0 overflow-y-auto px-4">
                        <div className="space-y-4 pb-2">
                          {bookingsWithTests.map(({ booking, tests, completedCount: bookingCompleted, totalCount: bookingTotal }) => (
                            <div key={booking.id} className="border rounded-lg bg-card overflow-hidden" data-testid={`booking-group-${booking.id}`}>
                              {/* Booking Header */}
                              <div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {booking.healthPackage ? (
                                    <>
                                      <Package className="h-4 w-4 text-primary shrink-0" />
                                      <span className="text-sm font-medium truncate">{booking.healthPackage.name}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                                      <span className="text-sm font-medium">{format(new Date(booking.slot), "dd MMM yyyy, h:mm a")}</span>
                                    </>
                                  )}
                                </div>
                                <Badge variant={bookingCompleted === bookingTotal ? "default" : "secondary"} className="shrink-0">
                                  {bookingCompleted}/{bookingTotal}
                                </Badge>
                              </div>
                              
                              {/* Tests in this booking */}
                              <div className="p-2 space-y-1">
                                {tests.map(({ test, isCompleted }, index) => (
                                  <button
                                    key={`${booking.id}-${test.id}`}
                                    className={`w-full p-2 rounded-md text-left transition-colors flex items-center gap-2 ${
                                      selectedTest?.id === test.id && selectedBooking?.id === booking.id
                                        ? "bg-primary/10 border-2 border-primary"
                                        : isCompleted
                                        ? "bg-muted/30 opacity-60"
                                        : "hover-elevate"
                                    }`}
                                    onClick={() => !isCompleted && handleSelectTestFromBooking(test, booking)}
                                    disabled={isCompleted}
                                    data-testid={`button-select-test-${booking.id}-${test.id}`}
                                  >
                                    <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                                      isCompleted ? "bg-green-600/20" : selectedTest?.id === test.id && selectedBooking?.id === booking.id ? "bg-primary text-primary-foreground" : "bg-primary/10"
                                    }`}>
                                      {isCompleted ? (
                                        <Check className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <span className={`text-xs font-bold ${selectedTest?.id === test.id && selectedBooking?.id === booking.id ? "text-primary-foreground" : "text-primary"}`}>{index + 1}</span>
                                      )}
                                    </div>
                                    <div className={`text-sm flex-1 min-w-0 truncate ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                      {test.name}
                                    </div>
                                    {!isCompleted && !(selectedTest?.id === test.id && selectedBooking?.id === booking.id) && (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Manual Test Selection */}
                      <div className="p-4 border-t bg-muted/20 shrink-0">
                        <Label className="text-sm text-muted-foreground mb-2 block">Or select any test:</Label>
                        {testsLoading ? (
                          <Skeleton className="h-10 w-full" />
                        ) : (
                          <Select
                            value={selectedTest?.id || ""}
                            onValueChange={(v) => {
                              const test = tests?.find((t) => t.id === v);
                              setSelectedTest(test || null);
                              setSelectedBooking(null);
                            }}
                          >
                            <SelectTrigger data-testid="select-test">
                              <SelectValue placeholder="Choose a test" />
                            </SelectTrigger>
                            <SelectContent>
                              {tests?.map((test) => (
                                <SelectItem key={test.id} value={test.id}>
                                  {test.name} ({test.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content - Test Result Entry */}
          <div className="lg:col-span-7 xl:col-span-8">
            <Card className="h-full flex flex-col shadow-sm">
              <CardHeader className="py-5 px-6 shrink-0 border-b bg-muted/20">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      {selectedTest ? selectedTest.name : "Test Results"}
                    </CardTitle>
                    {selectedTest && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedTest.code} | {parameterInputs.length} parameters
                      </p>
                    )}
                  </div>
                  {selectedTest && (
                    <Button
                      onClick={() => generateReportMutation.mutate()}
                      disabled={!isFormValid || generateReportMutation.isPending}
                      className="gap-2"
                      data-testid="button-generate-report"
                    >
                      {generateReportMutation.isPending ? (
                        "Generating..."
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          Generate Report
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-6">
                {selectedTest && parameterInputs.length > 0 ? (
                  <div className="space-y-6">
                    {/* Parameters Table */}
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left py-3 px-4 font-semibold text-sm">Parameter</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm w-32">Value</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm w-24">Unit</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm">Normal Range</th>
                            <th className="text-center py-3 px-4 font-semibold text-sm w-28">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parameterInputs.map((param, index) => (
                            <tr key={param.parameterName} className="border-t">
                              <td className="py-3 px-4 font-medium">{param.parameterName}</td>
                              <td className="py-3 px-4">
                                <Input
                                  type="text"
                                  value={param.value}
                                  onChange={(e) => updateParameterValue(index, e.target.value)}
                                  className={`w-full ${param.isAbnormal ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                  data-testid={`input-param-${param.parameterName.toLowerCase().replace(/\s+/g, "-")}`}
                                />
                              </td>
                              <td className="py-3 px-4 text-muted-foreground text-sm">{param.unit}</td>
                              <td className="py-3 px-4 text-muted-foreground text-sm">{param.normalRange}</td>
                              <td className="py-3 px-4 text-center">
                                {param.value && (
                                  param.isAbnormal ? (
                                    <Badge variant="destructive">
                                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                      Abnormal
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-green-600 text-white">
                                      <Check className="h-3.5 w-3.5 mr-1" />
                                      Normal
                                    </Badge>
                                  )
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Additional Fields */}
                    <div className="p-5 bg-muted/30 rounded-lg border border-border/50">
                      <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Additional Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="technician" className="text-sm font-medium">Technician Name *</Label>
                          <Input
                            id="technician"
                            value={technician}
                            onChange={(e) => setTechnician(e.target.value)}
                            placeholder="Enter name"
                            data-testid="input-technician"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="referredBy" className="text-sm font-medium">Referred By (Doctor Email)</Label>
                          <Input
                            id="referredBy"
                            type="email"
                            value={referredBy}
                            onChange={(e) => setReferredBy(e.target.value)}
                            placeholder="doctor@example.com"
                            data-testid="input-referred-by"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="remarks" className="text-sm font-medium">Remarks</Label>
                          <Input
                            id="remarks"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Additional notes..."
                            data-testid="input-remarks"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p className="font-semibold text-lg">Select a patient and test to enter results</p>
                      <p className="text-sm mt-2">Choose from pending tests or select any test manually</p>
                    </div>
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
