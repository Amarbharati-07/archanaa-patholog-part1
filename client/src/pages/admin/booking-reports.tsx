import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { ArrowLeft, Check, Clock, FileText, FlaskConical, Package, User, AlertCircle, ChevronRight, X } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Test, TestParameter, Booking, Patient, HealthPackage } from "@shared/schema";

interface TestWithStatus extends Test {
  reportStatus: "pending" | "entered" | "finalized";
  resultId: string | null;
  reportId: string | null;
  enteredAt: string | null;
  finalizedAt: string | null;
}

interface BookingReportDetails {
  booking: Booking;
  patient: Patient | null;
  healthPackage: HealthPackage | null;
  tests: TestWithStatus[];
  progress: {
    total: number;
    completed: number;
    entered: number;
    pending: number;
  };
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

export default function BookingReports() {
  const searchParams = useSearch();
  const bookingId = new URLSearchParams(searchParams).get("booking");
  const { toast } = useToast();

  const [selectedTest, setSelectedTest] = useState<TestWithStatus | null>(null);
  const [parameterInputs, setParameterInputs] = useState<ParameterInput[]>([]);
  const [technician, setTechnician] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [remarks, setRemarks] = useState("");

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/admin/bookings"],
    enabled: !bookingId,
  });

  const { data: bookingDetails, isLoading: detailsLoading, refetch: refetchDetails } = useQuery<BookingReportDetails>({
    queryKey: ["/api/admin/bookings", bookingId, "report-details"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/bookings/${bookingId}/report-details`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch booking details");
      return res.json();
    },
    enabled: !!bookingId,
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
          ? {
              ...p,
              value,
              isAbnormal: isValueAbnormal(value, p.normalRange),
            }
          : p
      )
    );
  };

  const saveReportMutation = useMutation({
    mutationFn: async (finalize: boolean) => {
      if (!selectedTest || !bookingId) {
        throw new Error("Please select a test");
      }
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
      return apiRequest("POST", `/api/admin/bookings/${bookingId}/tests/${selectedTest.id}/report`, data);
    },
    onSuccess: (data: any) => {
      toast({
        title: data.allCompleted ? "All Reports Completed" : "Report Saved",
        description: data.allCompleted
          ? "All test reports for this booking are now complete."
          : "The test report has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings", bookingId, "report-details"] });
      setSelectedTest(null);
      setParameterInputs([]);
      setRemarks("");
      refetchDetails();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Save Report",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
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

  if (!bookingId) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Create Reports by Booking</h1>
        </div>

        {bookingsLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {bookings?.filter(b => b.patientId && b.status !== "report_ready").map((booking) => (
              <Link key={booking.id} href={`/admin/booking-reports?booking=${booking.id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-booking-${booking.id}`}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{booking.guestName || "Patient"}</p>
                        <p className="text-sm text-muted-foreground">{booking.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">{booking.testIds.length} tests</Badge>
                      <Badge variant={booking.status === "collected" ? "default" : "outline"}>
                        {booking.status}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {(!bookings || bookings.filter(b => b.patientId).length === 0) && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No bookings with patients found</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (detailsLoading) {
    return (
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
    );
  }

  if (!bookingDetails) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-lg font-medium">Booking not found</p>
          <Link href="/admin/booking-reports">
            <Button variant="outline" className="mt-4">Go Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { booking, patient, healthPackage, tests, progress } = bookingDetails;
  const progressPercent = progress.total > 0 ? ((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/booking-reports">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Create Reports</h1>
          <p className="text-muted-foreground">Booking #{booking.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Patient Details
                </CardTitle>
                {healthPackage && (
                  <Badge className="gap-1">
                    <Package className="h-3 w-3" />
                    {healthPackage.name}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{patient?.name || booking.guestName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{booking.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Patient ID</p>
                  <p className="font-medium">{patient?.patientId || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Booking Status</p>
                  <Badge variant="secondary" className="capitalize mt-1">{booking.status}</Badge>
                </div>
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
                {tests.map((test) => (
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
  );
}
