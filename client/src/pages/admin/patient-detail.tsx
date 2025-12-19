import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  FlaskConical, 
  Package, 
  Download, 
  ChevronRight, 
  Clock,
  Check,
  AlertCircle,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLayout } from "@/components/admin-layout";
import type { Patient, Test, HealthPackage, Booking, Report, Result } from "@shared/schema";

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

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);

  const { data, isLoading, error } = useQuery<PatientDetails>({
    queryKey: ["/api/admin/patients", id, "details"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/patients/${id}/details`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch patient details");
      return res.json();
    },
    enabled: !!id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "report_ready":
        return <Badge className="bg-green-600 text-white">Report Ready</Badge>;
      case "collected":
        return <Badge className="bg-blue-600 text-white">Collected</Badge>;
      case "processing":
        return <Badge className="bg-yellow-600 text-white">Processing</Badge>;
      case "confirmed":
        return <Badge className="bg-indigo-600 text-white">Confirmed</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-600 text-white">Paid</Badge>;
      case "paid_unverified":
        return <Badge className="bg-yellow-600 text-white">Pending Verification</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium">Patient not found</p>
            <Link href="/admin/patients">
              <Button variant="outline" className="mt-4">Go Back</Button>
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const { patient, bookings, standaloneReports, stats } = data;

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/admin/patients">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Patient Details</h1>
            <p className="text-muted-foreground">{patient.patientId}</p>
          </div>
          <Link href={`/admin/create-report?patient=${patient.id}`}>
            <Button className="gap-2" data-testid="button-create-report">
              <FileText className="h-4 w-4" />
              Create Report
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{patient.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Patient ID</p>
                    <p className="font-medium font-mono">{patient.patientId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{patient.phone}</p>
                  </div>
                  {patient.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{patient.email}</p>
                    </div>
                  )}
                  {patient.gender && (
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      <p className="font-medium capitalize">{patient.gender}</p>
                    </div>
                  )}
                  {patient.address && (
                    <div className="sm:col-span-2 flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="font-medium">{patient.address}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{stats.totalBookings}</p>
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">{stats.totalTests}</p>
                    <p className="text-sm text-muted-foreground">Tests Ordered</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">{stats.completedReports}</p>
                    <p className="text-sm text-muted-foreground">Reports Ready</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-yellow-600">{stats.pendingBookings}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Booking History ({bookings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No bookings found for this patient</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((booking) => {
                      const completedTests = booking.reports?.length || 0;
                      const totalTests = booking.tests.length;
                      const progress = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
                      
                      return (
                        <div
                          key={booking.id}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedBooking?.id === booking.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => setSelectedBooking(
                            selectedBooking?.id === booking.id ? null : booking
                          )}
                          data-testid={`booking-item-${booking.id}`}
                        >
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                {booking.healthPackage ? (
                                  <Package className="h-5 w-5 text-primary" />
                                ) : (
                                  <FlaskConical className="h-5 w-5 text-primary" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {booking.healthPackage?.name || `${booking.tests.length} Test(s)`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(booking.slot), "dd MMM yyyy, hh:mm a")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(booking.status)}
                              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${
                                selectedBooking?.id === booking.id ? "rotate-90" : ""
                              }`} />
                            </div>
                          </div>

                          {selectedBooking?.id === booking.id && (
                            <div className="mt-4 pt-4 border-t space-y-4">
                              <div className="flex items-center justify-between gap-4 text-sm">
                                <span className="text-muted-foreground">Report Progress</span>
                                <span>{completedTests} of {totalTests} completed</span>
                              </div>
                              <Progress value={progress} className="h-2" />

                              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Booking Type</p>
                                  <p className="font-medium capitalize">{booking.type}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Payment Status</p>
                                  {getPaymentBadge(booking.paymentStatus)}
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Tests Included</p>
                                <div className="space-y-2">
                                  {booking.tests.map((test) => {
                                    const testReport = booking.reports?.find(
                                      r => r.test?.id === test.id
                                    );
                                    return (
                                      <div
                                        key={test.id}
                                        className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50"
                                      >
                                        <div className="flex items-center gap-2">
                                          {testReport ? (
                                            <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                              <Check className="h-3 w-3 text-green-600" />
                                            </div>
                                          ) : (
                                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                              <Clock className="h-3 w-3 text-muted-foreground" />
                                            </div>
                                          )}
                                          <span className="text-sm">{test.name}</span>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          {test.category}
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="flex gap-2 pt-2">
                                <Link href={`/admin/booking-reports?booking=${booking.id}`}>
                                  <Button variant="outline" size="sm" className="gap-2">
                                    <FileText className="h-4 w-4" />
                                    Manage Reports
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  All Reports ({stats.completedReports})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                    <TabsTrigger value="recent" className="flex-1">Recent</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all">
                    <ScrollArea className="h-[60vh]">
                      {bookings.length === 0 && standaloneReports.length === 0 ? (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground text-sm">No reports available</p>
                        </div>
                      ) : (
                        <div className="space-y-3 pr-4">
                          {bookings.map((booking) => 
                            booking.reports?.map((report) => (
                              <div
                                key={report.id}
                                className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <p className="font-medium text-sm">{report.test?.name || "Unknown Test"}</p>
                                  <Badge className="bg-green-600 text-white text-xs">Ready</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {format(new Date(report.generatedAt), "dd MMM yyyy")}
                                </p>
                                {report.pdfPath && (
                                  <a
                                    href={`/api/reports/download/${report.secureDownloadToken}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button variant="outline" size="sm" className="w-full gap-2">
                                      <Download className="h-3 w-3" />
                                      Download PDF
                                    </Button>
                                  </a>
                                )}
                              </div>
                            ))
                          )}

                          {standaloneReports.map((report) => (
                            <div
                              key={report.id}
                              className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="font-medium text-sm">{report.test?.name || "Unknown Test"}</p>
                                <Badge className="bg-green-600 text-white text-xs">Ready</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                {format(new Date(report.generatedAt), "dd MMM yyyy")}
                              </p>
                              {report.pdfPath && (
                                <a
                                  href={`/api/reports/download/${report.secureDownloadToken}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="outline" size="sm" className="w-full gap-2">
                                    <Download className="h-3 w-3" />
                                    Download PDF
                                  </Button>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="recent">
                    <ScrollArea className="h-[60vh]">
                      {(() => {
                        const allReports = [
                          ...bookings.flatMap(b => b.reports || []),
                          ...standaloneReports
                        ]
                          .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
                          .slice(0, 5);

                        if (allReports.length === 0) {
                          return (
                            <div className="text-center py-8">
                              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground text-sm">No recent reports</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3 pr-4">
                            {allReports.map((report) => (
                              <div
                                key={report.id}
                                className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <p className="font-medium text-sm">{report.test?.name || "Unknown Test"}</p>
                                  <Badge className="bg-green-600 text-white text-xs">Ready</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {format(new Date(report.generatedAt), "dd MMM yyyy")}
                                </p>
                                {report.pdfPath && (
                                  <a
                                    href={`/api/reports/download/${report.secureDownloadToken}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button variant="outline" size="sm" className="w-full gap-2">
                                      <Download className="h-3 w-3" />
                                      Download PDF
                                    </Button>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
