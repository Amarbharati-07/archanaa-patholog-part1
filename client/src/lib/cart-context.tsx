import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Test, HealthPackage } from "@shared/schema";

export interface CartItem {
  id: string;
  type: "test" | "package";
  name: string;
  originalPrice: number;
  discountPercentage: number;
  finalPrice: number;
  testIds?: string[];
  category?: string;
  imageUrl?: string | null;
}

interface CartContextType {
  items: CartItem[];
  addTest: (test: Test) => void;
  addPackage: (pkg: HealthPackage) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  getCartTotal: () => { originalTotal: number; discountAmount: number; finalTotal: number };
  getItemCount: () => number;
  isInCart: (id: string) => boolean;
  getAllTestIds: () => string[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "pathology_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (e) {
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addTest = (test: Test) => {
    if (isInCart(test.id)) return;
    
    const cartItem: CartItem = {
      id: test.id,
      type: "test",
      name: test.name,
      originalPrice: Number(test.price),
      discountPercentage: 0,
      finalPrice: Number(test.price),
      category: test.category,
      imageUrl: test.imageUrl,
    };
    
    setItems(prev => [...prev, cartItem]);
  };

  const addPackage = (pkg: HealthPackage) => {
    if (isInCart(pkg.id)) return;
    
    const originalPrice = Number(pkg.originalPrice);
    const discountPercentage = pkg.discountPercentage || 0;
    const finalPrice = originalPrice * (1 - discountPercentage / 100);
    
    const cartItem: CartItem = {
      id: pkg.id,
      type: "package",
      name: pkg.name,
      originalPrice,
      discountPercentage,
      finalPrice,
      testIds: pkg.testIds,
      category: pkg.category,
      imageUrl: pkg.imageUrl,
    };
    
    setItems(prev => [...prev, cartItem]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const getCartTotal = () => {
    const originalTotal = items.reduce((sum, item) => sum + item.originalPrice, 0);
    const finalTotal = items.reduce((sum, item) => sum + item.finalPrice, 0);
    const discountAmount = originalTotal - finalTotal;
    
    return { originalTotal, discountAmount, finalTotal };
  };

  const getItemCount = () => items.length;

  const isInCart = (id: string) => items.some(item => item.id === id);

  const getAllTestIds = () => {
    const testIds: string[] = [];
    items.forEach(item => {
      if (item.type === "test") {
        testIds.push(item.id);
      } else if (item.type === "package" && item.testIds) {
        testIds.push(...item.testIds);
      }
    });
    return Array.from(new Set(testIds));
  };

  return (
    <CartContext.Provider value={{ 
      items, 
      addTest, 
      addPackage, 
      removeItem, 
      clearCart, 
      getCartTotal, 
      getItemCount, 
      isInCart,
      getAllTestIds 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
