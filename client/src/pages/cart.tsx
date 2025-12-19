import { Link, useLocation } from "wouter";
import { Trash2, ShoppingCart, Plus, Package, FlaskConical, IndianRupee, ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { getTestImage, getPackageImage } from "@/lib/test-images";

export default function Cart() {
  const { items, removeItem, getCartTotal, clearCart } = useCart();
  const { patient } = useAuth();
  const [, navigate] = useLocation();
  const { originalTotal, discountAmount, finalTotal } = getCartTotal();

  const handleProceedToCheckout = () => {
    if (!patient) {
      localStorage.setItem("redirectAfterLogin", "/checkout");
      navigate("/login");
      return;
    }
    navigate("/checkout");
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-background">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your Cart is Empty</h2>
              <p className="text-muted-foreground mb-6">
                Add tests or health packages to get started
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/tests">
                  <Button variant="outline" className="gap-2" data-testid="button-browse-tests">
                    <FlaskConical className="h-4 w-4" />
                    Browse Tests
                  </Button>
                </Link>
                <Link href="/packages">
                  <Button className="gap-2" data-testid="button-browse-packages">
                    <Package className="h-4 w-4" />
                    Health Packages
                  </Button>
                </Link>
              </div>
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
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3" data-testid="text-cart-title">
              <ShoppingBag className="h-8 w-8 text-primary" />
              Your Cart
            </h1>
            <p className="text-muted-foreground">
              Review your selected tests and packages before checkout
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const imageUrl = item.type === "package" 
                  ? getPackageImage(item.category || "general", item.imageUrl)
                  : getTestImage(item.category || "General", item.imageUrl);
                
                return (
                <Card key={item.id} data-testid={`cart-item-${item.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                          <img 
                            src={imageUrl} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            data-testid={`img-cart-item-${item.id}`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{item.name}</h3>
                            <Badge variant="outline">
                              {item.type === "package" ? "Package" : "Test"}
                            </Badge>
                          </div>
                          {item.discountPercentage > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-muted-foreground line-through flex items-center">
                                <IndianRupee className="h-3 w-3" />
                                {item.originalPrice.toFixed(0)}
                              </span>
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                                {item.discountPercentage}% OFF
                              </Badge>
                            </div>
                          )}
                          <div className="text-lg font-bold text-primary flex items-center mt-1">
                            <IndianRupee className="h-4 w-4" />
                            {item.finalPrice.toFixed(0)}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-remove-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                );
              })}

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={clearCart}
                  className="text-destructive"
                  data-testid="button-clear-cart"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cart
                </Button>
                <Link href="/tests">
                  <Button variant="outline" className="gap-2" data-testid="button-add-more">
                    <Plus className="h-4 w-4" />
                    Add More Tests
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                    <span className="flex items-center">
                      <IndianRupee className="h-3 w-3" />
                      {originalTotal.toFixed(0)}
                    </span>
                  </div>
                  
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span className="flex items-center">
                        - <IndianRupee className="h-3 w-3" />
                        {discountAmount.toFixed(0)}
                      </span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="flex items-center text-primary">
                      <IndianRupee className="h-4 w-4" />
                      {finalTotal.toFixed(0)}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <Badge className="w-full justify-center bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                      You save Rs. {discountAmount.toFixed(0)}
                    </Badge>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full gap-2" 
                    size="lg"
                    onClick={handleProceedToCheckout}
                    data-testid="button-proceed-checkout"
                  >
                    {patient ? "Proceed to Checkout" : "Login to Checkout"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
