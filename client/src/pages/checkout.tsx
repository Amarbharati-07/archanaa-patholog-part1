import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Check, ChevronLeft, Calendar as CalendarIcon, MapPin, Home as HomeIcon, 
  IndianRupee, CreditCard, Smartphone, Building2, Wallet, Banknote, 
  Building, Loader2, AlertCircle, CheckCircle2, ShoppingBag 
} from "lucide-react";
import { getTestImage, getPackageImage } from "@/lib/test-images";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PaymentMethod } from "@shared/schema";

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

export default function Checkout() {
  const [, navigate] = useLocation();
  const { patient } = useAuth();
  const { items, getCartTotal, getAllTestIds, clearCart } = useCart();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [collectionType, setCollectionType] = useState<"pickup" | "walkin">("walkin");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | "">("");
  const [transactionId, setTransactionId] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<{ distance: number; isWithinRange: boolean; maxDistance: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const { originalTotal, discountAmount, finalTotal } = getCartTotal();

  useEffect(() => {
    if (!patient) {
      localStorage.setItem("redirectAfterLogin", "/checkout");
      navigate("/login");
      return;
    }
    
    if (items.length === 0) {
      navigate("/cart");
      return;
    }

    setFormData({
      name: patient.name || "",
      phone: patient.phone || "",
      email: patient.email || "",
      address: patient.address || "",
    });
  }, [patient, items, navigate]);

  const bookingMutation = useMutation({
    mutationFn: async (data: {
      patientId?: string;
      phone: string;
      email?: string;
      testIds: string[];
      healthPackageId?: string;
      type: string;
      slot: string;
      paymentMethod: string;
      transactionId?: string;
      amountPaid: string;
      discountAmount?: string;
      userLatitude?: number;
      userLongitude?: number;
      distanceFromLab?: number;
      collectionAddress?: string;
    }) => {
      return apiRequest("POST", "/api/bookings", data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      clearCart();
      toast({
        title: "Booking Confirmed!",
        description: `Your booking ID is ${data.booking?.id?.slice(-8).toUpperCase() || "generated"}. You will receive a confirmation shortly.`,
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
            setLocationError("Location access denied. Please enable location permissions.");
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
          description: "Please verify your location is within the service area for home collection.",
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

    const testIds = getAllTestIds();
    const packageItem = items.find(item => item.type === "package");
    const isHomeCollection = collectionType === "pickup" && distanceInfo?.isWithinRange && userLocation;

    bookingMutation.mutate({
      patientId: patient?.id,
      phone: formData.phone,
      email: formData.email || undefined,
      testIds,
      healthPackageId: packageItem?.id,
      type: collectionType,
      slot: slotDate.toISOString(),
      paymentMethod: selectedPaymentMethod,
      transactionId: transactionId || undefined,
      amountPaid: finalTotal.toFixed(2),
      discountAmount: discountAmount > 0 ? discountAmount.toFixed(2) : undefined,
      userLatitude: isHomeCollection ? userLocation.lat : undefined,
      userLongitude: isHomeCollection ? userLocation.lng : undefined,
      distanceFromLab: isHomeCollection ? distanceInfo.distance : undefined,
      collectionAddress: isHomeCollection ? formData.address : undefined,
    });
  };

  const isLocationValid = collectionType === "walkin" || (collectionType === "pickup" && distanceInfo?.isWithinRange === true);
  const canProceedStep1 = formData.name && formData.phone && isLocationValid && (collectionType === "walkin" || formData.address);
  const canProceedStep2 = selectedDate && selectedTime;
  const canProceedStep3 = selectedPaymentMethod !== "";

  if (!patient || items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3" data-testid="text-checkout-title">
              <ShoppingBag className="h-8 w-8 text-primary" />
              Checkout
            </h1>
            <p className="text-muted-foreground">
              Complete your booking in just a few steps
            </p>
          </div>

          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map((s) => (
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
                  {s === 1 ? "Details" : s === 2 ? "Schedule" : "Payment"}
                </span>
                {s < 3 && <div className={`w-12 md:w-24 h-1 mx-2 ${step > s ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Your Details & Collection Type</CardTitle>
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
                            <div className="text-sm text-muted-foreground">Free sample pickup</div>
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
                                    You are {distanceInfo.distance.toFixed(1)} km from our lab. Home collection is available!
                                  </span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-4 w-4 text-destructive" />
                                  <span className="text-sm text-destructive">
                                    You are {distanceInfo.distance.toFixed(1)} km from our lab. Home collection is only available within {distanceInfo.maxDistance} km.
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
                    <Button variant="outline" onClick={() => navigate("/cart")} className="gap-2" data-testid="button-back">
                      <ChevronLeft className="h-4 w-4" />
                      Back to Cart
                    </Button>
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!canProceedStep1}
                      data-testid="button-next-step"
                    >
                      Continue
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Select Date & Time</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Select Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            data-testid="button-select-date"
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
                            disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Select Time Slot</Label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {timeSlots.map((slot) => (
                          <Button
                            key={slot}
                            type="button"
                            variant={selectedTime === slot ? "default" : "outline"}
                            className="text-sm"
                            onClick={() => setSelectedTime(slot)}
                            data-testid={`button-time-${slot.replace(/\s+/g, "-")}`}
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="justify-between gap-4">
                    <Button variant="outline" onClick={() => setStep(1)} className="gap-2" data-testid="button-back">
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!canProceedStep2}
                      data-testid="button-next-step"
                    >
                      Continue to Payment
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {step === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Select Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup
                      value={selectedPaymentMethod}
                      onValueChange={(v) => setSelectedPaymentMethod(v as PaymentMethod)}
                      className="space-y-3"
                    >
                      {paymentMethods.map((method) => (
                        <label
                          key={method.value}
                          className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedPaymentMethod === method.value
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          }`}
                        >
                          <RadioGroupItem value={method.value} data-testid={`radio-payment-${method.value}`} />
                          <method.icon className="h-5 w-5 text-primary" />
                          <div className="flex-1">
                            <div className="font-medium">{method.label}</div>
                            <div className="text-sm text-muted-foreground">{method.description}</div>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>

                    {selectedPaymentMethod && !["cash_on_delivery", "pay_at_lab"].includes(selectedPaymentMethod) && (
                      <div className="space-y-2 pt-4">
                        <Label htmlFor="transactionId">Transaction ID (Optional)</Label>
                        <Input
                          id="transactionId"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          placeholder="Enter transaction ID after payment"
                          data-testid="input-transaction-id"
                        />
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="justify-between gap-4">
                    <Button variant="outline" onClick={() => setStep(2)} className="gap-2" data-testid="button-back">
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={!canProceedStep3 || bookingMutation.isPending}
                      className="gap-2"
                      data-testid="button-confirm-booking"
                    >
                      {bookingMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Confirm Booking
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {items.map((item) => {
                      const imageUrl = item.type === "package" 
                        ? getPackageImage(item.category || "general", item.imageUrl)
                        : getTestImage(item.category || "General", item.imageUrl);
                      
                      return (
                        <div key={item.id} className="flex items-start gap-3 text-sm">
                          <div className="w-10 h-10 rounded-md overflow-hidden shrink-0">
                            <img 
                              src={imageUrl} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            {item.discountPercentage > 0 && (
                              <div className="text-muted-foreground line-through text-xs">
                                Rs. {item.originalPrice.toFixed(0)}
                              </div>
                            )}
                          </div>
                          <span className="font-medium">Rs. {item.finalPrice.toFixed(0)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>Rs. {originalTotal.toFixed(0)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>- Rs. {discountAmount.toFixed(0)}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">Rs. {finalTotal.toFixed(0)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <Badge className="w-full justify-center bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                      You save Rs. {discountAmount.toFixed(0)}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
