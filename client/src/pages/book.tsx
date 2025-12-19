import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Home as HomeIcon, IndianRupee, CreditCard, Smartphone, Building2, Wallet, Banknote, Building, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/components/auth-gate";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Test, PaymentMethod } from "@shared/schema";

const timeSlots = [
  "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"
];

const paymentMethods: { value: PaymentMethod; label: string; icon: typeof CreditCard; description: string }[] = [
  { value: "upi", label: "UPI", icon: Smartphone, description: "Pay using Google Pay, PhonePe, Paytm, etc." },
  { value: "debit_card", label: "Debit Card", icon: CreditCard, description: "Pay using your debit card" },
  { value: "credit_card", label: "Credit Card", icon: CreditCard, description: "Pay using your credit card" },
  { value: "net_banking", label: "Net Banking", icon: Building2, description: "Pay using your bank's internet banking" },
  { value: "wallet", label: "Wallet", icon: Wallet, description: "Pay using digital wallets" },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building, description: "Direct bank transfer (NEFT/IMPS/RTGS)" },
  { value: "cash_on_delivery", label: "Cash on Delivery", icon: Banknote, description: "Pay when sample is collected at home" },
  { value: "pay_at_lab", label: "Pay at Lab", icon: MapPin, description: "Pay when you visit our lab center" },
];

export default function Book() {
  const searchParams = useSearch();
  const preselectedTest = new URLSearchParams(searchParams).get("test");
  const [, navigate] = useLocation();
  const { patient } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [selectedTests, setSelectedTests] = useState<string[]>(preselectedTest ? [preselectedTest] : []);
  const [hasRestoredState, setHasRestoredState] = useState(false);

  useEffect(() => {
    if (patient && !hasRestoredState) {
      const savedTests = localStorage.getItem("pendingBookingTests");
      const savedStep = localStorage.getItem("bookingStep");
      
      if (savedTests) {
        setSelectedTests(JSON.parse(savedTests));
        localStorage.removeItem("pendingBookingTests");
      }
      
      if (savedStep) {
        setStep(parseInt(savedStep, 10));
        localStorage.removeItem("bookingStep");
      }
      
      setHasRestoredState(true);
    }
  }, [patient, hasRestoredState]);
  const [collectionType, setCollectionType] = useState<"pickup" | "walkin">("walkin");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | "">("");
  const [transactionId, setTransactionId] = useState("");
  const [formData, setFormData] = useState({
    name: patient?.name || "",
    phone: patient?.phone || "",
    email: patient?.email || "",
    address: patient?.address || "",
  });
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<{ distance: number; isWithinRange: boolean; maxDistance: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const { data: tests, isLoading } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  const bookingMutation = useMutation({
    mutationFn: async (data: {
      patientId?: string;
      guestName?: string;
      phone: string;
      email?: string;
      testIds: string[];
      type: string;
      slot: string;
      paymentMethod: string;
      transactionId?: string;
      amountPaid: string;
      userLatitude?: number;
      userLongitude?: number;
      distanceFromLab?: number;
      collectionAddress?: string;
    }) => {
      return apiRequest("POST", "/api/bookings", data);
    },
    onSuccess: () => {
      toast({
        title: "Booking Confirmed!",
        description: "Your test booking has been successfully created. You will receive a confirmation shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patient/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Unable to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name || "",
        phone: patient.phone || "",
        email: patient.email || "",
        address: patient.address || "",
      });
    }
  }, [patient]);

  const detectLocationAndCalculateDistance = async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        try {
          const response = await apiRequest("POST", "/api/calculate-distance", {
            userLatitude: latitude,
            userLongitude: longitude,
          });
          const data = await response.json();
          setDistanceInfo({
            distance: data.distance,
            isWithinRange: data.isWithinRange,
            maxDistance: data.maxDistance,
          });
        } catch (error) {
          setLocationError("Unable to calculate distance. Please try again.");
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied. Please enable location permissions to use home collection.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Please try again.");
            break;
          default:
            setLocationError("An unknown error occurred while getting your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCollectionTypeChange = (value: "pickup" | "walkin") => {
    setCollectionType(value);
    if (value === "pickup") {
      detectLocationAndCalculateDistance();
    } else {
      setUserLocation(null);
      setDistanceInfo(null);
      setLocationError(null);
    }
  };

  const selectedTestDetails = tests?.filter((t) => selectedTests.includes(t.id)) || [];
  const totalPrice = selectedTestDetails.reduce((sum, t) => sum + Number(t.price), 0);

  const toggleTest = (testId: string) => {
    setSelectedTests((prev) =>
      prev.includes(testId)
        ? prev.filter((id) => id !== testId)
        : [...prev, testId]
    );
  };

  const handleProceedToPayment = () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Select Date & Time",
        description: "Please select a date and time for your appointment.",
        variant: "destructive",
      });
      return;
    }
    setStep(4);
  };

  const handleSubmit = () => {
    if (!selectedPaymentMethod) {
      toast({
        title: "Select Payment Method",
        description: "Please select a payment method to proceed.",
        variant: "destructive",
      });
      return;
    }

    if (collectionType === "pickup") {
      if (!distanceInfo || !distanceInfo.isWithinRange) {
        toast({
          title: "Location Validation Required",
          description: "Please go back and verify your location is within the service area for home collection.",
          variant: "destructive",
        });
        return;
      }
      if (!formData.address) {
        toast({
          title: "Address Required",
          description: "Please provide a pickup address for home collection.",
          variant: "destructive",
        });
        return;
      }
    }

    const slotDate = new Date(selectedDate!);
    const [time, period] = selectedTime.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    slotDate.setHours(hours, minutes, 0, 0);

    const requiresTransactionId = !["cash_on_delivery", "pay_at_lab"].includes(selectedPaymentMethod);

    const isHomeCollection = collectionType === "pickup" && distanceInfo?.isWithinRange && userLocation;

    bookingMutation.mutate({
      patientId: patient?.id,
      guestName: !patient ? formData.name : undefined,
      phone: formData.phone,
      email: formData.email || undefined,
      testIds: selectedTests,
      type: collectionType,
      slot: slotDate.toISOString(),
      paymentMethod: selectedPaymentMethod,
      transactionId: requiresTransactionId && transactionId ? transactionId : undefined,
      amountPaid: totalPrice.toFixed(2),
      userLatitude: isHomeCollection ? userLocation.lat : undefined,
      userLongitude: isHomeCollection ? userLocation.lng : undefined,
      distanceFromLab: isHomeCollection ? distanceInfo.distance : undefined,
      collectionAddress: isHomeCollection ? formData.address : undefined,
    });
  };

  const canProceedStep1 = selectedTests.length > 0;
  const isLocationValid = collectionType === "walkin" || (collectionType === "pickup" && distanceInfo?.isWithinRange === true);
  const canProceedStep2 = formData.name && formData.phone && isLocationValid && (collectionType === "walkin" || formData.address);
  const canProceedStep3 = selectedDate && selectedTime;
  const canProceedStep4 = selectedPaymentMethod !== "";

  const requiresTransactionId = selectedPaymentMethod && !["cash_on_delivery", "pay_at_lab"].includes(selectedPaymentMethod);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-page-title">
              Book a Test
            </h1>
            <p className="text-muted-foreground">
              Select tests, provide your details, choose a time slot, and select payment method
            </p>
          </div>

          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`step-indicator-${s}`}
                >
                  {step > s ? <Check className="h-5 w-5" /> : s}
                </div>
                <span className={`ml-2 hidden sm:block ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                  {s === 1 ? "Tests" : s === 2 ? "Details" : s === 3 ? "Schedule" : "Payment"}
                </span>
                {s < 4 && <div className={`w-8 md:w-16 h-1 mx-2 ${step > s ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Tests</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tests?.map((test) => (
                      <label
                        key={test.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedTests.includes(test.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                        data-testid={`label-test-${test.code}`}
                      >
                        <Checkbox
                          checked={selectedTests.includes(test.id)}
                          onCheckedChange={() => toggleTest(test.id)}
                          data-testid={`checkbox-test-${test.code}`}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{test.name}</div>
                          <div className="text-sm text-muted-foreground">{test.category} - {test.duration}</div>
                        </div>
                        <div className="flex items-center font-semibold text-primary">
                          <IndianRupee className="h-4 w-4" />
                          {Number(test.price).toFixed(0)}
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {selectedTests.length > 0 && (
                  <div className="mt-6 p-4 bg-muted rounded-lg flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">{selectedTests.length} test(s) selected</div>
                      <div className="font-semibold text-lg flex items-center gap-1">
                        Total: <IndianRupee className="h-4 w-4" />{totalPrice.toFixed(0)}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-end">
                <Button
                  onClick={() => {
                    if (!patient) {
                      localStorage.setItem("pendingBookingTests", JSON.stringify(selectedTests));
                      localStorage.setItem("bookingStep", "2");
                    }
                    requireAuth(() => setStep(2));
                  }}
                  disabled={!canProceedStep1}
                  className="gap-2"
                  data-testid="button-next-step"
                >
                  {patient ? "Continue" : "Login to Continue"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter your name"
                      data-testid="input-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 XXXXX XXXXX"
                      data-testid="input-phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (for report delivery)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-3 pt-4">
                  <Label>Collection Type</Label>
                  <RadioGroup
                    value={collectionType}
                    onValueChange={(v) => handleCollectionTypeChange(v as "pickup" | "walkin")}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <label
                      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer ${
                        collectionType === "walkin" ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <RadioGroupItem value="walkin" data-testid="radio-walkin" />
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Walk-in</div>
                        <div className="text-sm text-muted-foreground">Visit our lab center</div>
                      </div>
                    </label>
                    <label
                      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer ${
                        collectionType === "pickup" ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <RadioGroupItem value="pickup" data-testid="radio-pickup" />
                      <HomeIcon className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Home Collection</div>
                        <div className="text-sm text-muted-foreground">Free sample pickup (within service area)</div>
                      </div>
                    </label>
                  </RadioGroup>

                  {collectionType === "pickup" && (
                    <div className="mt-4">
                      {locationLoading && (
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm">Detecting your location...</span>
                        </div>
                      )}
                      
                      {locationError && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm text-destructive">{locationError}</span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={detectLocationAndCalculateDistance}
                            className="ml-auto"
                          >
                            Retry
                          </Button>
                        </div>
                      )}
                      
                      {distanceInfo && !locationLoading && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg ${
                          distanceInfo.isWithinRange 
                            ? "bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800" 
                            : "bg-destructive/10 border border-destructive/20"
                        }`}>
                          {distanceInfo.isWithinRange ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="text-sm text-green-700 dark:text-green-300">
                                You are {distanceInfo.distance.toFixed(1)} km from our lab. Home collection is available in your area!
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-destructive" />
                              <span className="text-sm text-destructive">
                                You are {distanceInfo.distance.toFixed(1)} km from our lab. Home collection is only available within {distanceInfo.maxDistance} km. 
                                Please select Walk-in option.
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {collectionType === "pickup" && (
                  <div className="space-y-2">
                    <Label htmlFor="address">Pickup Address *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter your complete address"
                      data-testid="input-address"
                    />
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-between gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2" data-testid="button-back">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className="gap-2"
                  data-testid="button-next-step"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Schedule Appointment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Select Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="button-date-picker"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => date < new Date() || date > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Time Slot</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((slot) => (
                        <Button
                          key={slot}
                          variant={selectedTime === slot ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTime(slot)}
                          data-testid={`button-time-${slot.replace(/[:\s]/g, "-")}`}
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <h4 className="font-semibold">Booking Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tests:</span>
                      <span>{selectedTestDetails.map((t) => t.name).join(", ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span>{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{formData.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Collection:</span>
                      <span>{collectionType === "pickup" ? "Home Collection" : "Walk-in"}</span>
                    </div>
                    {collectionType === "pickup" && distanceInfo && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Distance from Lab:</span>
                        <span>{distanceInfo.distance.toFixed(1)} km</span>
                      </div>
                    )}
                    {collectionType === "pickup" && formData.address && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pickup Address:</span>
                        <span className="text-right max-w-[200px]">{formData.address}</span>
                      </div>
                    )}
                    {selectedDate && selectedTime && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Appointment:</span>
                        <span>{format(selectedDate, "PPP")} at {selectedTime}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Total Amount:</span>
                      <span className="flex items-center gap-1">
                        <IndianRupee className="h-4 w-4" />{totalPrice.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-4">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-2" data-testid="button-back">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleProceedToPayment}
                  disabled={!canProceedStep3}
                  className="gap-2"
                  data-testid="button-proceed-to-payment"
                >
                  Proceed to Payment
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Select Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Amount to Pay:</span>
                    <span className="text-2xl font-bold flex items-center gap-1 text-primary">
                      <IndianRupee className="h-5 w-5" />{totalPrice.toFixed(0)}
                    </span>
                  </div>
                </div>

                <RadioGroup
                  value={selectedPaymentMethod}
                  onValueChange={(v) => setSelectedPaymentMethod(v as PaymentMethod)}
                  className="space-y-3"
                >
                  {paymentMethods.map((method) => {
                    const IconComponent = method.icon;
                    return (
                      <label
                        key={method.value}
                        className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedPaymentMethod === method.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                        data-testid={`payment-method-${method.value}`}
                      >
                        <RadioGroupItem value={method.value} data-testid={`radio-payment-${method.value}`} />
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{method.label}</div>
                          <div className="text-sm text-muted-foreground">{method.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>

                {requiresTransactionId && (
                  <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                    <Label htmlFor="transactionId">Transaction/Reference ID (Optional)</Label>
                    <Input
                      id="transactionId"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Enter your transaction or reference ID"
                      data-testid="input-transaction-id"
                    />
                    <p className="text-xs text-muted-foreground">
                      If you have already made the payment, enter the transaction ID for faster verification.
                    </p>
                  </div>
                )}

                {selectedPaymentMethod && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <h4 className="font-semibold mb-2">Payment Instructions</h4>
                    {selectedPaymentMethod === "upi" && (
                      <p className="text-sm text-muted-foreground">
                        You can pay using any UPI app (Google Pay, PhonePe, Paytm, etc.) to our UPI ID. 
                        Your payment will be verified by our team.
                      </p>
                    )}
                    {selectedPaymentMethod === "bank_transfer" && (
                      <p className="text-sm text-muted-foreground">
                        Transfer the amount to our bank account via NEFT/IMPS/RTGS. 
                        Our team will verify your payment once received.
                      </p>
                    )}
                    {(selectedPaymentMethod === "debit_card" || selectedPaymentMethod === "credit_card") && (
                      <p className="text-sm text-muted-foreground">
                        You will receive payment instructions via SMS/Email. 
                        Your payment will be verified by our team.
                      </p>
                    )}
                    {selectedPaymentMethod === "net_banking" && (
                      <p className="text-sm text-muted-foreground">
                        You will receive payment instructions via Email. 
                        Please use your bank&apos;s internet banking to complete the payment.
                      </p>
                    )}
                    {selectedPaymentMethod === "wallet" && (
                      <p className="text-sm text-muted-foreground">
                        You can pay using any digital wallet. 
                        Our team will verify your payment once received.
                      </p>
                    )}
                    {selectedPaymentMethod === "cash_on_delivery" && (
                      <p className="text-sm text-muted-foreground">
                        Pay in cash when our technician arrives at your home for sample collection. 
                        Please keep the exact amount ready.
                      </p>
                    )}
                    {selectedPaymentMethod === "pay_at_lab" && (
                      <p className="text-sm text-muted-foreground">
                        Pay at our lab center when you visit for the test. 
                        We accept cash, UPI, and cards at the counter.
                      </p>
                    )}
                  </div>
                )}

                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <h4 className="font-semibold">Booking Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tests:</span>
                      <span>{selectedTestDetails.map((t) => t.name).join(", ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Appointment:</span>
                      <span>{selectedDate && format(selectedDate, "PPP")} at {selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Collection:</span>
                      <span>{collectionType === "pickup" ? "Home Collection" : "Walk-in"}</span>
                    </div>
                    {collectionType === "pickup" && distanceInfo && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Distance from Lab:</span>
                        <span>{distanceInfo.distance.toFixed(1)} km</span>
                      </div>
                    )}
                    {selectedPaymentMethod && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Method:</span>
                        <span>{paymentMethods.find(m => m.value === selectedPaymentMethod)?.label}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Total Amount:</span>
                      <span className="flex items-center gap-1">
                        <IndianRupee className="h-4 w-4" />{totalPrice.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-4">
                <Button variant="outline" onClick={() => setStep(3)} className="gap-2" data-testid="button-back">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceedStep4 || bookingMutation.isPending}
                  className="gap-2"
                  data-testid="button-confirm-booking"
                >
                  {bookingMutation.isPending ? "Confirming..." : "Confirm Booking"}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
