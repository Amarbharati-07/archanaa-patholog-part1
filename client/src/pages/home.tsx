import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowRight, Shield, Clock, Award, Truck, Star, Quote, FlaskConical, Users, BadgePercent, PenLine, ShoppingCart, Check, Upload, FileText, FileImage } from "lucide-react";
// VIDEO IMPORT REMOVED - Using background image instead
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { StatsCounter } from "@/components/stats-counter";
import { TestCard } from "@/components/test-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getPackageImage } from "@/lib/test-images";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Autoplay from "embla-carousel-autoplay";
import { useRef, useState } from "react";
import type { Test, Review, Advertisement, HealthPackage } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

const features = [
  {
    icon: Shield,
    title: "NABL Accredited",
    description: "Quality assured testing with nationally recognized accreditation",
  },
  {
    icon: Clock,
    title: "Quick Results",
    description: "Most reports ready within 24-48 hours of sample collection",
  },
  {
    icon: Truck,
    title: "Home Collection",
    description: "Free home sample collection for your convenience",
  },
  {
    icon: Award,
    title: "Expert Team",
    description: "Experienced pathologists and trained technicians",
  },
];

const customerReviews = [
  {
    name: "Aman Bharati",
    initials: "PB",
    rating: 5,
    review: "Excellent service! The home collection was on time and the staff was very professional. Got my reports within 24 hours.",
    location: "Mumbai",
  },
  {
    name: "Karan Prasad",
    initials: "KP",
    rating: 4.5,
    review: "Very impressed with the accuracy and quick turnaround. The online booking system made everything so convenient.",
    location: "Dombivali",
  },
  {
    name: "Lalu Singh",
    initials: "LS",
    rating: 5,
    review: "Best diagnostic center in the city. The prices are reasonable and the quality of service is top-notch.",
    location: "Palawa,Dombivali",
  },
  {
    name: "Vikram Chauhan",
    initials: "VC",
    rating: 4,
    review: "Great experience overall. The technician was skilled and made the blood collection painless. Highly recommend!",
    location: "Kopar",
  },
];

const advertisementSlides = [
  {
    id: 1,
    icon: FlaskConical,
    title: "State-of-the-Art Laboratory",
    subtitle: "Advanced Equipment & Technology",
    description: "Our NABL accredited lab uses the latest diagnostic equipment for accurate and reliable results",
    gradient: "from-blue-600 to-cyan-500",
    cta: "Learn More",
    link: "/tests",
  },
  {
    id: 2,
    icon: BadgePercent,
    title: "Special Offers This Month",
    subtitle: "Up to 30% OFF on Health Packages",
    description: "Book comprehensive health checkups at discounted prices. Limited time offer!",
    gradient: "from-emerald-600 to-teal-500",
    cta: "View Offers",
    link: "/tests",
  },
  {
    id: 3,
    icon: Users,
    title: "Trusted by 15,000+ Customers",
    subtitle: "Join Our Growing Family",
    description: "Experience why thousands choose us for their diagnostic needs. Quality care you can trust.",
    gradient: "from-purple-600 to-pink-500",
    cta: "Book Now",
    link: "/book",
  },
  {
    id: 4,
    icon: Truck,
    title: "Free Home Collection",
    subtitle: "Convenience at Your Doorstep",
    description: "Skip the queue! Our trained phlebotomists will collect samples from your home at no extra cost.",
    gradient: "from-orange-500 to-red-500",
    cta: "Schedule Now",
    link: "/book",
  },
];

const iconMap: Record<string, any> = {
  FlaskConical,
  BadgePercent,
  Users,
  Truck,
  Shield,
  Clock,
  Award,
};

export default function Home() {
  const { toast } = useToast();
  const { addPackage, isInCart } = useCart();
  const { patient } = useAuth();
  const [, navigate] = useLocation();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    name: "",
    location: "",
    rating: 5,
    review: "",
  });

  const { data: tests, isLoading } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  const { data: dynamicReviews } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const { data: dynamicAds } = useQuery<Advertisement[]>({
    queryKey: ["/api/advertisements"],
  });

  const { data: healthPackages, isLoading: packagesLoading } = useQuery<HealthPackage[]>({
    queryKey: ["/api/health-packages"],
  });

  const reviewMutation = useMutation({
    mutationFn: async (data: typeof reviewForm) => {
      return apiRequest("POST", "/api/reviews", data);
    },
    onSuccess: () => {
      toast({
        title: "Review Submitted",
        description: "Thank you! Your review will appear after approval.",
      });
      setReviewDialogOpen(false);
      setReviewForm({ name: "", location: "", rating: 5, review: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePrescriptionUpload = async () => {
    if (!patient) {
      localStorage.setItem("redirectAfterLogin", "/dashboard");
      navigate("/login");
      return;
    }

    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a prescription file to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("prescription", selectedFile);

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
        description: "Your prescription has been uploaded successfully. You can now book tests.",
      });
      setPrescriptionDialogOpen(false);
      setSelectedFile(null);
      navigate("/book");
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload prescription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const popularTests = tests?.slice(0, 6) || [];

  const featuredPackages = healthPackages
    ?.filter(pkg => pkg.isActive && pkg.discountPercentage > 0)
    .sort((a, b) => b.discountPercentage - a.discountPercentage)
    .slice(0, 4) || [];

  const displayReviews = dynamicReviews && dynamicReviews.length > 0
    ? dynamicReviews.slice(0, 4).map(r => ({
        name: r.name,
        initials: r.name.split(" ").map(n => n[0]).join("").toUpperCase(),
        rating: r.rating,
        review: r.review,
        location: r.location,
      }))
    : customerReviews;

  const displayAds = dynamicAds && dynamicAds.length > 0
    ? dynamicAds.map(ad => ({
        id: ad.id,
        icon: iconMap[ad.icon] || FlaskConical,
        title: ad.title,
        subtitle: ad.subtitle,
        description: ad.description,
        gradient: ad.gradient,
        cta: ad.ctaText,
        link: ad.ctaLink,
      }))
    : advertisementSlides;

  const autoplayPlugin = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section - Video replaced with background image */}
      <section className="relative text-white py-20 md:py-32 overflow-hidden">
        {/* Background Image - Medical Laboratory */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1579154204601-01588f351e67?w=1920&q=80')",
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 text-white drop-shadow-lg" data-testid="text-hero-title">
            Your Health, Our Priority
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8 drop-shadow-md">
            Trusted diagnostic services with accurate results. 
            Book tests online and get reports delivered to your doorstep.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/book">
              <Button size="lg" variant="secondary" className="gap-2" data-testid="button-hero-book">
                Book a Test
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/tests">
              <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white backdrop-blur-sm" data-testid="button-hero-tests">
                View All Tests
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-8 bg-card">
        <div className="max-w-7xl mx-auto px-4">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[autoplayPlugin.current]}
            className="w-full"
            data-testid="carousel-advertisement"
          >
            <CarouselContent>
              {displayAds.map((slide) => (
                <CarouselItem key={slide.id} className="md:basis-1/2 lg:basis-1/2">
                  <div className={`relative overflow-hidden rounded-lg bg-gradient-to-r ${slide.gradient} p-6 md:p-8 h-full min-h-[200px]`}>
                    <div className="absolute top-4 right-4 opacity-20">
                      <slide.icon className="h-24 w-24 text-white" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                        <p className="text-white/80 text-sm font-medium mb-1">{slide.subtitle}</p>
                        <h3 className="text-white text-xl md:text-2xl font-bold mb-3">{slide.title}</h3>
                        <p className="text-white/90 text-sm md:text-base max-w-md">{slide.description}</p>
                      </div>
                      <div className="mt-4">
                        <Link href={slide.link}>
                          <Button 
                            variant="secondary" 
                            className="gap-2"
                            data-testid={`button-ad-${slide.id}`}
                          >
                            {slide.cta}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 bg-white/90 border-0" />
            <CarouselNext className="right-2 bg-white/90 border-0" />
          </Carousel>
        </div>
      </section>

      <StatsCounter />

      <section className="py-12 bg-gradient-to-r from-primary/5 to-primary/10" data-testid="section-prescription-upload">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                Have a Prescription?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-lg">
                Upload your doctor's prescription and we'll help you book the right tests. 
                Our team will review it and ensure accurate test selection.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Dialog open={prescriptionDialogOpen} onOpenChange={setPrescriptionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="gap-2" data-testid="button-upload-prescription">
                      <Upload className="h-5 w-5" />
                      Upload Prescription
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Upload Prescription</DialogTitle>
                      <DialogDescription>
                        Upload your doctor's prescription (PDF, JPG, or PNG). We'll review it and help you book the right tests.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div 
                        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-muted-foreground/25 hover:border-primary/50"
                        onClick={() => document.getElementById("prescription-input")?.click()}
                        data-testid="dropzone-prescription"
                      >
                        {selectedFile ? (
                          <div className="flex flex-col items-center gap-2">
                            {selectedFile.type.includes("pdf") ? (
                              <FileText className="h-12 w-12 text-primary" />
                            ) : (
                              <FileImage className="h-12 w-12 text-primary" />
                            )}
                            <p className="font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="h-12 w-12 text-muted-foreground" />
                            <p className="text-muted-foreground">Click to upload or drag and drop</p>
                            <p className="text-sm text-muted-foreground">PDF, JPG, PNG (max 10MB)</p>
                          </div>
                        )}
                        <input
                          id="prescription-input"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          data-testid="input-prescription-file"
                        />
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={handlePrescriptionUpload}
                        disabled={!selectedFile || uploading}
                        data-testid="button-submit-prescription"
                      >
                        {uploading ? "Uploading..." : "Upload & Book Tests"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Link href="/book">
                  <Button size="lg" variant="outline" className="gap-2" data-testid="button-book-without-prescription">
                    Book Without Prescription
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="relative w-64 h-64 bg-primary/10 rounded-full flex items-center justify-center">
                <FileText className="h-24 w-24 text-primary" />
                <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-3">
                  <Upload className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">Why Choose Us?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We combine advanced technology with expert care to deliver accurate and timely results
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center" data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="pt-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-2">Featured Health Packages</h2>
              <p className="text-muted-foreground">Comprehensive checkups at special discounted prices</p>
            </div>
            <Link href="/packages">
              <Button variant="outline" className="gap-2" data-testid="button-view-all-packages">
                View All Packages
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {packagesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6 space-y-3">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full mt-4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredPackages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredPackages.map((pkg) => {
                const originalPrice = parseFloat(pkg.originalPrice);
                const discountedPrice = originalPrice * (1 - pkg.discountPercentage / 100);
                const savings = originalPrice - discountedPrice;
                const imageUrl = getPackageImage(pkg.category, pkg.imageUrl);
                return (
                  <Card key={pkg.id} className="relative overflow-hidden" data-testid={`card-featured-package-${pkg.id}`}>
                    <div className="relative h-32 overflow-hidden">
                      <img 
                        src={imageUrl} 
                        alt={pkg.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        data-testid={`img-featured-package-${pkg.id}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      {pkg.discountPercentage > 0 && (
                        <Badge variant="destructive" className="absolute top-2 right-2">
                          {pkg.discountPercentage}% OFF
                        </Badge>
                      )}
                      <Badge variant="secondary" className="absolute bottom-2 left-2 capitalize text-xs">
                        {pkg.category}
                      </Badge>
                    </div>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{pkg.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{pkg.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Clock className="h-3 w-3" />
                        <span>{pkg.reportTime}</span>
                        <span className="mx-1">|</span>
                        <span>{((pkg.testIds as string[]) || []).length} tests</span>
                      </div>
                      <div className="space-y-1 mb-4">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-xl font-bold text-primary">Rs. {discountedPrice.toFixed(0)}</span>
                          {pkg.discountPercentage > 0 && (
                            <span className="text-sm text-muted-foreground line-through">Rs. {originalPrice.toFixed(0)}</span>
                          )}
                        </div>
                        {pkg.discountPercentage > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400">Save Rs. {savings.toFixed(0)}</p>
                        )}
                      </div>
                      <Button 
                        variant={isInCart(pkg.id) ? "secondary" : "default"}
                        className="w-full gap-2" 
                        data-testid={`button-book-package-${pkg.id}`}
                        disabled={isInCart(pkg.id)}
                        onClick={() => {
                          if (!isInCart(pkg.id)) {
                            addPackage(pkg as any);
                            toast({
                              title: "Added to Cart",
                              description: `${pkg.name} has been added to your cart.`,
                            });
                          }
                        }}
                      >
                        {isInCart(pkg.id) ? (
                          <>
                            <Check className="h-4 w-4" />
                            In Cart
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4" />
                            Book Now
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No featured packages available at the moment.</p>
              <Link href="/packages">
                <Button variant="outline" className="mt-4" data-testid="button-browse-all-packages">Browse All Packages</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-2">Popular Tests</h2>
              <p className="text-muted-foreground">Book from our most requested diagnostic tests</p>
            </div>
            <Link href="/tests">
              <Button variant="outline" className="gap-2" data-testid="button-view-all-tests">
                View All Tests
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6 space-y-3">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full mt-4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularTests.map((test) => (
                <TestCard key={test.id} test={test} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">Ready to Book Your Test?</h2>
          <p className="opacity-90 mb-8 max-w-xl mx-auto">
            Schedule your diagnostic test today with our easy online booking system. 
            Home sample collection available.
          </p>
          <Link href="/book">
            <Button size="lg" variant="secondary" className="gap-2" data-testid="button-cta-book">
              Book Now
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-12">
            <div className="text-center sm:text-left">
              <h2 className="text-2xl md:text-3xl font-semibold mb-2">What Our Customers Say</h2>
              <p className="text-muted-foreground max-w-2xl">
                Trusted by thousands of patients for accurate and reliable diagnostic services
              </p>
            </div>
            <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-write-review">
                  <PenLine className="h-4 w-4" />
                  Write a Review
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Share Your Experience</DialogTitle>
                  <DialogDescription>
                    Tell us about your experience with our services. Your review will help others.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    reviewMutation.mutate(reviewForm);
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                      id="name"
                      value={reviewForm.name}
                      onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
                      placeholder="Enter your name"
                      required
                      data-testid="input-review-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={reviewForm.location}
                      onChange={(e) => setReviewForm({ ...reviewForm, location: e.target.value })}
                      placeholder="Your city"
                      required
                      data-testid="input-review-location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                          className="focus:outline-none"
                          data-testid={`button-star-${star}`}
                        >
                          <Star
                            className={`h-6 w-6 cursor-pointer transition-colors ${
                              star <= reviewForm.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="review">Your Review</Label>
                    <Textarea
                      id="review"
                      value={reviewForm.review}
                      onChange={(e) => setReviewForm({ ...reviewForm, review: e.target.value })}
                      placeholder="Share your experience..."
                      rows={4}
                      required
                      data-testid="textarea-review"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={reviewMutation.isPending}
                    data-testid="button-submit-review"
                  >
                    {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayReviews.map((review, index) => (
              <Card key={index} className="relative" data-testid={`card-review-${index}`}>
                <CardContent className="pt-6">
                  <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {review.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{review.name}</p>
                      <p className="text-xs text-muted-foreground">{review.location}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {review.review}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
