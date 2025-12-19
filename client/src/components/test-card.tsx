import { Clock, IndianRupee, ShoppingCart, Check } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { getTestImage } from "@/lib/test-images";
import type { Test } from "@shared/schema";

interface TestCardProps {
  test: Test;
}

export function TestCard({ test }: TestCardProps) {
  const { addTest, isInCart } = useCart();
  const { toast } = useToast();
  const inCart = isInCart(test.id);
  const imageUrl = getTestImage(test.category, test.imageUrl);

  const handleAddToCart = () => {
    if (inCart) {
      toast({
        title: "Already in Cart",
        description: `${test.name} is already in your cart.`,
      });
      return;
    }
    addTest(test);
    toast({
      title: "Added to Cart",
      description: `${test.name} has been added to your cart.`,
    });
  };

  return (
    <Card className="h-full flex flex-col hover-elevate transition-shadow duration-200 overflow-hidden" data-testid={`card-test-${test.code}`}>
      <div className="relative h-36 overflow-hidden">
        <img 
          src={imageUrl} 
          alt={test.name}
          className="w-full h-full object-cover"
          loading="lazy"
          data-testid={`img-test-${test.code}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <Badge variant="secondary" className="absolute bottom-2 left-2">{test.category}</Badge>
      </div>
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg leading-tight">{test.name}</h3>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        {test.description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{test.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-primary font-semibold">
            <IndianRupee className="h-4 w-4" />
            <span data-testid={`price-${test.code}`}>{Number(test.price).toFixed(0)}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{test.duration}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t">
        <Button 
          variant={inCart ? "secondary" : "default"}
          className="w-full gap-2"
          onClick={handleAddToCart}
          disabled={inCart}
          data-testid={`button-book-${test.code}`}
        >
          {inCart ? (
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
      </CardFooter>
    </Card>
  );
}
