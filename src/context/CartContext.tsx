import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CartItem, Product } from '../types';
import { toast } from 'react-hot-toast';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartCount: number;
  totalAmount: number;
  giftItem: Product | null;
  wishlist: Product[];
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [giftItem, setGiftItem] = useState<Product | null>(null);

  useEffect(() => {
    const fetchGift = async () => {
      try {
        const q = query(collection(db, 'products'), orderBy('price'), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setGiftItem({ id: snap.docs[0].id, ...snap.docs[0].data() } as Product);
        }
      } catch (err) {
        console.error("Error fetching gift:", err);
      }
    };
    fetchGift();
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        toast.success(`Đã cập nhật số lượng ${product.name} trong giỏ hàng`);
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      toast.success(`Đã thêm ${product.name} vào giỏ hàng`);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
    toast.error('Đã xóa khỏi giỏ hàng');
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty < 1) return;
    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, quantity: qty } : item))
    );
  };

  const clearCart = () => setCart([]);

  const toggleWishlist = (product: Product) => {
    setWishlist((prev) => {
      const isFav = prev.some(p => p.id === product.id);
      if (isFav) {
        toast.error('Đã xóa khỏi danh sách yêu thích');
        return prev.filter(p => p.id !== product.id);
      }
      toast.success('Đã thêm vào danh sách yêu thích');
      return [...prev, product];
    });
  };

  const isInWishlist = (productId: string) => wishlist.some(p => p.id === productId);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = cart.reduce((acc, item) => {
    const price = item.onFlashSale ? item.price * (1 - (item.flashSaleDiscount || 25) / 100) : item.price;
    return acc + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ 
      cart, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, totalAmount,
      wishlist, toggleWishlist, isInWishlist,
      giftItem
    }}>
      {children}
    </CartContext.Provider>
  );
};
