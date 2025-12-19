import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Clock, IndianRupee, Users, Heart, Sparkles, UserCheck, FlaskConical, Droplets, Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getPackageImage } from "@/lib/test-images";
import type { HealthPackage, Test } from "@shared/schema";

interface PackageWithPrices extends HealthPackage {
  discountedPrice: string;
  savings: string;
}

interface PackageWithTests extends PackageWithPrices {
  tests: Test[];
}

const categories = [
  { id: "all", label: "All Packages", icon: Package },
  { id: "men", label: "Men", icon: Users },
  { id: "women", label: "Women", icon: Heart },
  { id: "general", label: "Young/General", icon: Sparkles },
  { id: "senior", label: "Senior Citizen", icon: UserCheck },
];

function groupTestsByCategory(tests: Test[]): Record<string, Test[]> {
  return tests.reduce((acc, test) => {
    const category = test.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(test);
    return acc;
  }, {} as Record<string, Test[]>);
}

export default function Packages() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { addPackage, isInCart } = useCart();
  const { toast } = useToast();

  const { data: packages, isLoading } = useQuery<PackageWithPrices[]>({
    queryKey: ["/api/health-packages", activeCategory !== "all" ? activeCategory : undefined],
    queryFn: async () => {
      const url = activeCategory !== "all" 
        ? `/api/health-packages?category=${activeCategory}`
        : "/api/health-packages";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch packages");
      return res.json();
    },
  });

  const { data: packageDetails, isLoading: isLoadingDetails } = useQuery<PackageWithTests>({
    queryKey: ["/api/health-packages", selectedPackageId],
    queryFn: async () => {
      const res = await fetch(`/api/health-packages/${selectedPackageId}`);
      if (!res.ok) throw new Error("Failed to fetch package details");
      return res.json();
    },
    enabled: !!selectedPackageId && dialogOpen,
  });

  const handleBookPackage = (pkg: PackageWithPrices) => {
    if (isInCart(pkg.id)) {
      toast({
        title: "Already in Cart",
        description: `${pkg.name} is already in your cart.`,
      });
      return;
    }
    addPackage(pkg as any);
    toast({
      title: "Added to Cart",
      description: `${pkg.name} has been added to your cart.`,
    });
  };

  const handleViewDetails = (packageId: string) => {
    setSelectedPackageId(packageId);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedPackageId(null);
  };

  const groupedTests = packageDetails?.tests ? groupTestsByCategory(packageDetails.tests) : {};
  const categoryOrder = [
    "Hematology",
    "Diabetes",
    "Liver Profile",
    "Kidney Profile",
    "Lipid Profile",
    "Thyroid",
    "Vitamins",
    "Cardiac",
    "Infection",
    "Serology",
    "Hormones",
    "Urine",
    "Stool",
    "Special Tests",
  ];

  const sortedCategories = Object.keys(groupedTests).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-3" data-testid="text-packages-title">
              Health Packages
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Comprehensive health checkup packages at discounted prices. Choose the package that suits your needs.
            </p>
          </div>

          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
            <TabsList className="grid w-full grid-cols-5 max-w-2xl mx-auto">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <TabsTrigger 
                    key={cat.id} 
                    value={cat.id} 
                    className="gap-1 px-2"
                    data-testid={`tab-category-${cat.id}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline text-xs lg:text-sm">{cat.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : packages && packages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => {
                const imageUrl = getPackageImage(pkg.category, pkg.imageUrl);
                return (
                <Card 
                  key={pkg.id} 
                  className="flex flex-col hover:shadow-lg transition-shadow overflow-hidden"
                  data-testid={`card-package-${pkg.id}`}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img 
                      src={imageUrl} 
                      alt={pkg.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      data-testid={`img-package-${pkg.id}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {pkg.discountPercentage > 0 && (
                      <Badge variant="destructive" className="absolute top-2 right-2">
                        {pkg.discountPercentage}% OFF
                      </Badge>
                    )}
                    <Badge variant="secondary" className="absolute bottom-2 left-2 capitalize">
                      {pkg.category === "senior" ? "Senior Citizen" : pkg.category}
                    </Badge>
                  </div>
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  </CardHeader>
                  
                  <CardContent className="flex-1 space-y-4">
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {pkg.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Reports in {pkg.reportTime}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FlaskConical className="h-4 w-4" />
                      <span>{pkg.testIds.length} tests included</span>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-primary flex items-center">
                          <IndianRupee className="h-5 w-5" />
                          {Number(pkg.discountedPrice).toFixed(0)}
                        </span>
                        {pkg.discountPercentage > 0 && (
                          <span className="text-sm text-muted-foreground line-through flex items-center">
                            <IndianRupee className="h-3 w-3" />
                            {Number(pkg.originalPrice).toFixed(0)}
                          </span>
                        )}
                      </div>
                      {pkg.discountPercentage > 0 && (
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                          You save ₹{Number(pkg.savings).toFixed(0)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex flex-col gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleViewDetails(pkg.id)}
                      data-testid={`button-view-details-${pkg.id}`}
                    >
                      View Details
                    </Button>
                    <Button 
                      variant={isInCart(pkg.id) ? "secondary" : "default"}
                      className="flex-1 gap-2"
                      onClick={() => handleBookPackage(pkg)}
                      disabled={isInCart(pkg.id)}
                      data-testid={`button-book-package-${pkg.id}`}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {isInCart(pkg.id) ? "In Cart" : "Book Now"}
                    </Button>
                  </CardFooter>
                </Card>
              );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No packages available</h3>
              <p className="text-muted-foreground mb-4">
                {activeCategory !== "all" 
                  ? `No packages found in the ${activeCategory} category.`
                  : "Health packages will be added soon."}
              </p>
              {activeCategory !== "all" && (
                <Button variant="outline" onClick={() => setActiveCategory("all")}>
                  View All Packages
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl h-[85vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b bg-background shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {isLoadingDetails ? (
                  <Skeleton className="h-7 w-3/4 mb-2" />
                ) : (
                  <DialogTitle className="text-xl font-bold" data-testid="text-modal-package-name">
                    {packageDetails?.name}
                  </DialogTitle>
                )}
                {packageDetails && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="secondary" className="capitalize">
                      {packageDetails.category === "senior" ? "Senior Citizen" : packageDetails.category}
                    </Badge>
                    {packageDetails.discountPercentage > 0 && (
                      <Badge variant="destructive">
                        {packageDetails.discountPercentage}% OFF
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {packageDetails.reportTime}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              {isLoadingDetails ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : packageDetails ? (
                <>
                  {packageDetails.description && (
                    <p className="text-muted-foreground" data-testid="text-modal-description">
                      {packageDetails.description}
                    </p>
                  )}
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <FlaskConical className="h-5 w-5 text-primary" />
                      Tests Included ({packageDetails.tests?.length || 0})
                    </h3>
                    
                    {sortedCategories.map((category) => (
                      <div key={category} className="space-y-2" data-testid={`section-category-${category}`}>
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                          <Droplets className="h-4 w-4" />
                          {category} ({groupedTests[category].length})
                        </h4>
                        <div className="grid gap-2">
                          {groupedTests[category].map((test) => (
                            <div 
                              key={test.id} 
                              className="flex items-start gap-2 py-2 px-3 rounded-md bg-muted/50"
                              data-testid={`item-test-${test.id}`}
                            >
                              <Check className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{test.name}</p>
                                {test.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {test.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </ScrollArea>
          
          {packageDetails && (
            <div className="p-6 pt-4 border-t bg-muted/30 shrink-0">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-primary flex items-center">
                      <IndianRupee className="h-5 w-5" />
                      {Number(packageDetails.discountedPrice).toFixed(0)}
                    </span>
                    {packageDetails.discountPercentage > 0 && (
                      <span className="text-sm text-muted-foreground line-through flex items-center">
                        <IndianRupee className="h-3 w-3" />
                        {Number(packageDetails.originalPrice).toFixed(0)}
                      </span>
                    )}
                  </div>
                  {packageDetails.discountPercentage > 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                      You save ₹{Number(packageDetails.savings).toFixed(0)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    onClick={handleCloseDialog}
                    className="flex-1 sm:flex-none"
                  >
                    Close
                  </Button>
                  <Button 
                    variant={packageDetails && isInCart(packageDetails.id) ? "secondary" : "default"}
                    className="flex-1 sm:flex-none gap-2"
                    onClick={() => {
                      if (packageDetails && !isInCart(packageDetails.id)) {
                        addPackage(packageDetails as any);
                        toast({
                          title: "Added to Cart",
                          description: `${packageDetails.name} has been added to your cart.`,
                        });
                      }
                    }}
                    disabled={packageDetails ? isInCart(packageDetails.id) : true}
                    data-testid="button-modal-book-now"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {packageDetails && isInCart(packageDetails.id) ? "In Cart" : "Book Now"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
