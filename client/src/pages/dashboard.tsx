import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { User, Phone, Mail, Calendar, FileText, Clock, Download, MapPin, ChevronRight, CreditCard, CheckCircle, AlertCircle, Banknote, ShoppingCart, IndianRupee, Upload, Camera, Pencil, FolderOpen, X, Eye, FlaskConical, Package } from "lucide-react";
import { getTestImage } from "@/lib/test-images";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Booking, Report, Test, HealthPackage, Prescription } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const statusColors: Record<string, string> = {
  pending: "bg-warning text-warning-foreground",
  collected: "bg-info text-info-foreground",
  processing: "bg-info text-info-foreground",
  report_ready: "bg-success text-success-foreground",
  delivered: "bg-success text-success-foreground",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  collected: "Sample Collected",
  processing: "Processing",
  report_ready: "Report Ready",
  delivered: "Delivered",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  paid_unverified: "bg-warning text-warning-foreground",
  verified: "bg-success text-success-foreground",
  cash_on_delivery: "bg-info text-info-foreground",
  pay_at_lab: "bg-info text-info-foreground",
};

const paymentStatusLabels: Record<string, string> = {
  pending: "Payment Pending",
  paid_unverified: "Payment Completed - Verification Pending",
  verified: "Payment Completed",
  cash_on_delivery: "Cash on Delivery",
  pay_at_lab: "Pay at Lab",
};

const paymentMethodLabels: Record<string, string> = {
  upi: "UPI",
  debit_card: "Debit Card",
  credit_card: "Credit Card",
  net_banking: "Net Banking",
  wallet: "Wallet",
  bank_transfer: "Bank Transfer",
  cash_on_delivery: "Cash on Delivery",
  pay_at_lab: "Pay at Lab",
};

interface ExtendedReport extends Report {
  test: Test;
  paymentVerified?: boolean;
  paymentStatus?: string;
}

interface GroupedBookingReports {
  bookingId: string;
  bookingDate: string;
  bookingType: string;
  healthPackageId: string | null;
  healthPackageName: string | null;
  paymentVerified: boolean;
  paymentStatus: string;
  reports: ExtendedReport[];
}

interface PackageWithPrices extends HealthPackage {
  discountedPrice: string;
  savings: string;
}

export default function Dashboard() {
  const { patient } = useAuth();
  const { addTest, addPackage, isInCart, getItemCount } = useCart();
  const { toast } = useToast();
  const [showPaymentAlert, setShowPaymentAlert] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPrescription, setUploadingPrescription] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
  });
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const prescriptionInputRef = useRef<HTMLInputElement>(null);

  const { data: bookings, isLoading: bookingsLoading } = useQuery<(Booking & { tests: Test[] })[]>({
    queryKey: ["/api/patient/bookings"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchIntervalInBackground: true,
    enabled: !!patient,
  });

  const { data: groupedReports, isLoading: reportsLoading } = useQuery<GroupedBookingReports[]>({
    queryKey: ["/api/patient/reports"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchIntervalInBackground: true,
    enabled: !!patient,
  });

  const { data: tests, isLoading: testsLoading } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
    enabled: !!patient,
  });

  const { data: packages, isLoading: packagesLoading } = useQuery<PackageWithPrices[]>({
    queryKey: ["/api/health-packages"],
    enabled: !!patient,
  });

  const { data: prescriptions, isLoading: prescriptionsLoading } = useQuery<Prescription[]>({
    queryKey: ["/api/prescriptions"],
    enabled: !!patient,
  });

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const token = localStorage.getItem("token");
      const response = await fetch("/api/profile/photo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      toast({
        title: "Photo Updated",
        description: "Your profile photo has been updated successfully.",
      });
      window.location.reload();
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload profile photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePrescriptionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPrescription(true);
    try {
      const formData = new FormData();
      formData.append("prescription", file);

      const token = localStorage.getItem("token");
      const response = await fetch("/api/prescriptions/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      toast({
        title: "Prescription Uploaded",
        description: "Your prescription has been uploaded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload prescription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPrescription(false);
    }
  };

  const handleProfileEdit = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error("Update failed");
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setEditProfileOpen(false);
      window.location.reload();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReportDownload = (report: ExtendedReport) => {
    if (!report.paymentVerified) {
      setShowPaymentAlert(true);
      return;
    }
    window.open(`/api/reports/download/${report.secureDownloadToken}`, '_blank');
  };

  if (!patient) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Login Required</h2>
              <p className="text-muted-foreground mb-4">Please login to access your dashboard</p>
              <Link href="/login">
                <Button data-testid="button-login">Login Now</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-welcome">
              Welcome, {patient.name}
            </h1>
            <p className="text-muted-foreground">
              Manage your bookings and access your reports
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
                <Dialog open={editProfileOpen} onOpenChange={(open) => {
                  setEditProfileOpen(open);
                  if (open) {
                    setEditForm({
                      name: patient.name || "",
                      phone: patient.phone || "",
                    });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid="button-edit-profile">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>
                        Update your profile information. Email cannot be changed.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-name">Name</Label>
                        <Input
                          id="edit-name"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          data-testid="input-edit-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-phone">Phone</Label>
                        <Input
                          id="edit-phone"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          data-testid="input-edit-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-email">Email (Read Only)</Label>
                        <Input
                          id="edit-email"
                          value={patient.email || ""}
                          disabled
                          className="bg-muted"
                          data-testid="input-edit-email"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditProfileOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleProfileEdit} data-testid="button-save-profile">
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center mb-4">
                  <div className="relative group">
                    <Avatar className="h-20 w-20">
                      <AvatarImage 
                        src={patient.profilePhoto ? `/uploads/profile-photos/${patient.profilePhoto}` : undefined} 
                        alt={patient.name} 
                      />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {patient.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => profilePhotoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      data-testid="button-upload-photo"
                    >
                      {uploadingPhoto ? (
                        <span className="text-white text-xs">Uploading...</span>
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                    </button>
                    <input
                      ref={profilePhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePhotoUpload}
                    />
                  </div>
                  <h3 className="font-semibold mt-2">{patient.name}</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold">{patient.patientId.slice(-4)}</span>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Patient ID</div>
                      <div className="font-medium" data-testid="text-patient-id">{patient.patientId}</div>
                    </div>
                  </div>

                  {patient.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span data-testid="text-phone">{patient.phone}</span>
                    </div>
                  )}

                  {patient.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span data-testid="text-email">{patient.email}</span>
                    </div>
                  )}

                  {patient.gender && (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{patient.gender}</span>
                    </div>
                  )}

                  {patient.address && (
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>{patient.address}</span>
                    </div>
                  )}
                </div>

                <Link href="/book">
                  <Button className="w-full gap-2" data-testid="button-book-new">
                    Book New Test
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <Tabs defaultValue="bookings" className="w-full">
                <CardHeader>
                  <TabsList className="w-full justify-start flex-wrap gap-1">
                    <TabsTrigger value="bookings" data-testid="tab-bookings">
                      <Calendar className="h-4 w-4 mr-2" />
                      Bookings
                    </TabsTrigger>
                    <TabsTrigger value="reports" data-testid="tab-reports">
                      <FileText className="h-4 w-4 mr-2" />
                      Reports
                    </TabsTrigger>
                    <TabsTrigger value="documents" data-testid="tab-documents">
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Documents
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent>
                  <TabsContent value="bookings" className="mt-0">
                    {bookingsLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                      </div>
                    ) : bookings && bookings.length > 0 ? (
                      <div className="space-y-4">
                        {bookings.map((booking) => (
                          <div
                            key={booking.id}
                            className="p-4 rounded-lg border space-y-3"
                            data-testid={`booking-${booking.id}`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-3">
                              {booking.tests && booking.tests.length > 0 && (
                                <div className="flex -space-x-2 shrink-0">
                                  {booking.tests.slice(0, 3).map((t, idx) => (
                                    <div key={idx} className="w-10 h-10 rounded-md overflow-hidden border-2 border-background">
                                      <img 
                                        src={getTestImage(t.category, t.imageUrl)} 
                                        alt={t.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    </div>
                                  ))}
                                  {booking.tests.length > 3 && (
                                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border-2 border-background text-xs font-medium">
                                      +{booking.tests.length - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {booking.tests?.map((t) => t.name).join(", ") || "Test Booking"}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(booking.slot), "PPP")}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(booking.slot), "p")}
                                  </div>
                                  <Badge variant="outline">
                                    {booking.type === "pickup" ? "Home Collection" : "Walk-in"}
                                  </Badge>
                                </div>
                              </div>
                              </div>
                              <Badge className={statusColors[booking.status] || "bg-muted"}>
                                {statusLabels[booking.status] || booking.status}
                              </Badge>
                            </div>

                            {/* Payment Status Section */}
                            <div className="pt-3 border-t">
                              <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Payment Details</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Status:</span>
                                  <Badge 
                                    className={paymentStatusColors[booking.paymentStatus || 'pending'] || "bg-muted"}
                                    data-testid={`payment-status-${booking.id}`}
                                  >
                                    {booking.paymentStatus === 'verified' && <CheckCircle className="h-3 w-3 mr-1" />}
                                    {booking.paymentStatus === 'paid_unverified' && <AlertCircle className="h-3 w-3 mr-1" />}
                                    {(booking.paymentStatus === 'cash_on_delivery' || booking.paymentStatus === 'pay_at_lab') && <Banknote className="h-3 w-3 mr-1" />}
                                    {paymentStatusLabels[booking.paymentStatus || 'pending'] || 'Payment Pending'}
                                  </Badge>
                                </div>
                                {booking.paymentMethod && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Method:</span>
                                    <span>{paymentMethodLabels[booking.paymentMethod] || booking.paymentMethod}</span>
                                  </div>
                                )}
                                {booking.amountPaid && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Amount:</span>
                                    <span className="font-medium">Rs. {booking.amountPaid}</span>
                                  </div>
                                )}
                                {booking.transactionId && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Transaction ID:</span>
                                    <span className="font-mono text-xs">{booking.transactionId}</span>
                                  </div>
                                )}
                                {booking.paymentDate && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Payment Date:</span>
                                    <span>{format(new Date(booking.paymentDate), "PPp")}</span>
                                  </div>
                                )}
                                {booking.paymentVerifiedAt && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Verified At:</span>
                                    <span>{format(new Date(booking.paymentVerifiedAt), "PPp")}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-medium mb-2">No Bookings Yet</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                          Book your first diagnostic test today
                        </p>
                        <Link href="/book">
                          <Button variant="outline" data-testid="button-book-first">
                            Book a Test
                          </Button>
                        </Link>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="reports" className="mt-0">
                    {reportsLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                      </div>
                    ) : groupedReports && groupedReports.length > 0 ? (
                      <div className="space-y-4">
                        {groupedReports.map((group) => (
                          <div
                            key={group.bookingId}
                            className="p-4 rounded-lg border space-y-3"
                            data-testid={`booking-reports-${group.bookingId}`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="font-medium flex items-center gap-2">
                                  {group.healthPackageName ? (
                                    <>
                                      <Package className="h-4 w-4 text-primary" />
                                      {group.healthPackageName}
                                    </>
                                  ) : group.reports.length === 1 ? (
                                    <>
                                      <FlaskConical className="h-4 w-4 text-primary" />
                                      {group.reports[0].test?.name || "Test Report"}
                                    </>
                                  ) : (
                                    <>
                                      <FlaskConical className="h-4 w-4 text-primary" />
                                      {group.reports.length} Tests
                                    </>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(group.bookingDate), "PPP")}
                                  </div>
                                  <Badge variant="outline">
                                    {group.bookingType === "pickup" ? "Home Collection" : group.bookingType === "walkin" ? "Walk-in" : "Lab Visit"}
                                  </Badge>
                                </div>
                              </div>
                              {!group.paymentVerified && (
                                <Badge className="bg-warning text-warning-foreground">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {paymentStatusLabels[group.paymentStatus || 'pending']}
                                </Badge>
                              )}
                            </div>

                            <div className="pt-3 border-t space-y-2">
                              {group.reports.map((report) => (
                                <div
                                  key={report.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 px-3 rounded-md bg-muted/50"
                                  data-testid={`report-${report.id}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">{report.test?.name || "Test Report"}</span>
                                  </div>
                                  <Button 
                                    variant={report.paymentVerified ? "outline" : "secondary"}
                                    size="sm" 
                                    className="gap-2" 
                                    data-testid={`button-download-${report.id}`}
                                    onClick={() => handleReportDownload(report)}
                                    disabled={!report.paymentVerified}
                                  >
                                    <Download className="h-4 w-4" />
                                    {report.paymentVerified ? "Download" : "Locked"}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-medium mb-2">No Reports Yet</h3>
                        <p className="text-muted-foreground text-sm">
                          Your test reports will appear here once ready
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="documents" className="mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Your Prescriptions</h3>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => prescriptionInputRef.current?.click()}
                          disabled={uploadingPrescription}
                          data-testid="button-upload-new-prescription"
                        >
                          {uploadingPrescription ? (
                            "Uploading..."
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Upload New
                            </>
                          )}
                        </Button>
                        <input
                          ref={prescriptionInputRef}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={handlePrescriptionUpload}
                        />
                      </div>

                      {prescriptionsLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                          ))}
                        </div>
                      ) : prescriptions && prescriptions.length > 0 ? (
                        <div className="space-y-3">
                          {prescriptions.map((prescription) => (
                            <div
                              key={prescription.id}
                              className="p-4 rounded-lg border flex items-center justify-between gap-4"
                              data-testid={`prescription-${prescription.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{prescription.fileName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Uploaded {format(new Date(prescription.uploadedAt), "PPP")}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => window.open(`/uploads/prescriptions/${prescription.filePath}`, '_blank')}
                                  data-testid={`button-view-prescription-${prescription.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = `/uploads/prescriptions/${prescription.filePath}`;
                                    link.download = prescription.filePath;
                                    link.click();
                                  }}
                                  data-testid={`button-download-prescription-${prescription.id}`}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="font-medium mb-2">No Documents Yet</h3>
                          <p className="text-muted-foreground text-sm mb-4">
                            Upload prescriptions to keep track of your medical records
                          </p>
                          <Button 
                            variant="outline" 
                            onClick={() => prescriptionInputRef.current?.click()}
                            data-testid="button-upload-first-prescription"
                          >
                            Upload Prescription
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Quick Access to Tests and Packages */}
          <div className="space-y-8">
            {/* Cart Banner */}
            {getItemCount() > 0 && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-medium">You have {getItemCount()} item(s) in your cart</p>
                      <p className="text-sm text-muted-foreground">Complete your booking now</p>
                    </div>
                  </div>
                  <Link href="/cart">
                    <Button className="gap-2" data-testid="button-go-to-cart">
                      Go to Cart
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Popular Tests Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-primary" />
                  Popular Tests
                </h2>
                <Link href="/tests">
                  <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-tests">
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              {testsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : tests && tests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tests.slice(0, 6).map((test) => (
                    <Card key={test.id} className="hover:shadow-md transition-shadow" data-testid={`card-test-${test.id}`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h3 className="font-medium line-clamp-1">{test.name}</h3>
                          <Badge variant="secondary" className="shrink-0 text-xs">{test.category}</Badge>
                        </div>
                        <div className="flex items-center gap-1 text-lg font-semibold text-primary mb-3">
                          <IndianRupee className="h-4 w-4" />
                          {Number(test.price).toFixed(0)}
                        </div>
                        <Button
                          variant={isInCart(test.id) ? "secondary" : "outline"}
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => addTest(test)}
                          disabled={isInCart(test.id)}
                          data-testid={`button-add-test-${test.id}`}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          {isInCart(test.id) ? "In Cart" : "Add to Cart"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No tests available</p>
              )}
            </div>

            {/* Health Packages Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Health Packages
                </h2>
                <Link href="/packages">
                  <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-packages">
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              {packagesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-40" />
                  ))}
                </div>
              ) : packages && packages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {packages.slice(0, 6).map((pkg) => (
                    <Card key={pkg.id} className="hover:shadow-md transition-shadow" data-testid={`card-package-${pkg.id}`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h3 className="font-medium line-clamp-1">{pkg.name}</h3>
                          {pkg.discountPercentage > 0 && (
                            <Badge variant="destructive" className="shrink-0 text-xs">
                              {pkg.discountPercentage}% OFF
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                          <FlaskConical className="h-3 w-3" />
                          {pkg.testIds.length} tests included
                        </div>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-lg font-semibold text-primary flex items-center">
                            <IndianRupee className="h-4 w-4" />
                            {Number(pkg.discountedPrice).toFixed(0)}
                          </span>
                          {pkg.discountPercentage > 0 && (
                            <span className="text-sm text-muted-foreground line-through flex items-center">
                              <IndianRupee className="h-3 w-3" />
                              {Number(pkg.originalPrice).toFixed(0)}
                            </span>
                          )}
                        </div>
                        <Button
                          variant={isInCart(pkg.id) ? "secondary" : "outline"}
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => addPackage(pkg as any)}
                          disabled={isInCart(pkg.id)}
                          data-testid={`button-add-package-${pkg.id}`}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          {isInCart(pkg.id) ? "In Cart" : "Add to Cart"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No packages available</p>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <AlertDialog open={showPaymentAlert} onOpenChange={setShowPaymentAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Payment Required
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your payment is not completed yet. Please complete your payment or wait for verification to access the report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction data-testid="button-close-payment-alert">Okay</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
