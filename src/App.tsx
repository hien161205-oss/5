import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { ShoppingCart, User, LogOut, Menu, X, Search, Facebook, Instagram, Heart } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { UserProfile } from './types';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { CartProvider, useCart } from './context/CartContext';

// Pages
import Home from './pages/Home';
import Admin from './pages/Admin';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import StaticPage from './pages/StaticPage';
import Profile from './pages/Profile';
import CategoryPage from './pages/CategoryPage';
import WishlistPage from './pages/Wishlist';
import BlogList from './pages/BlogList';
import ErrorBoundary from './ErrorBoundary'; 
import BlogDetail from './pages/BlogDetail';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
          const isAdminEmail = firebaseUser.email === 'nghyn5851@gmail.com';
          
          try {
            const docRef = doc(db, 'users', firebaseUser.uid);
            const docSnap = await getDoc(docRef);
            
            let userData: UserProfile;
            if (docSnap.exists()) {
              userData = docSnap.data() as UserProfile;
              // Update last active
              await setDoc(docRef, { lastActive: serverTimestamp() }, { merge: true });
            } else {
              userData = { 
                uid: firebaseUser.uid, 
                email: firebaseUser.email || '', 
                role: isAdminEmail ? 'admin' : 'user'
              };
              // Create missing profile
              await setDoc(docRef, {
                ...userData,
                createdAt: serverTimestamp(),
                lastActive: serverTimestamp()
              });
            }

            if (isAdminEmail && userData.role !== 'admin') {
              userData.role = 'admin';
              await setDoc(docRef, { role: 'admin' }, { merge: true });
            }
            
            setUser(userData);
          } catch (err: any) {
            console.warn("User profile sync issue:", err.message);
            setUser({ 
              uid: firebaseUser.uid, 
              email: firebaseUser.email || '', 
              role: isAdminEmail ? 'admin' : 'user' 
            });
          }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-brand-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <CartProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Content user={user} setUser={setUser} />
        </div>
      </Router>
    </CartProvider>
  );
}

function Content({ user, setUser }: { user: UserProfile | null; setUser: (u: UserProfile | null) => void }) {
  const { cartCount } = useCart();
  
  return (
    <ErrorBoundary> {/* Bọc toàn bộ nội dung với ErrorBoundary */}
      <>
        <Navbar user={user} cartCount={cartCount} />
        <main className="flex-grow pt-24 md:pt-40 bg-gray-50/50">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/category/:categoryId" element={<CategoryPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/*" element={user?.role === 'admin' ? <Admin /> : <Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:id" element={<BlogDetail />} />
            <Route path="/page/:slug" element={<StaticPage />} />
          </Routes>
        </main>
        <Footer />
        <Toaster position="bottom-right" />
      </>
    </ErrorBoundary>
  );
}

function Navbar({ user, cartCount }: { user: UserProfile | null; cartCount: number }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/');
    }
  };

  return (
    <header className={cn(
      "fixed top-0 w-full z-50 transition-all duration-300",
      scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-brand-100" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between h-20 px-6">
        <Link to="/" className="text-3xl font-serif font-bold tracking-tight text-brand-600 shrink-0">
          Q&H LUMINA
        </Link>

        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="relative w-full group">
            <input 
              type="text" 
              placeholder="Tìm kiếm sản phẩm..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-brand-50 border border-brand-100 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 transition-all"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
          </form>
        </div>

        <div className="hidden md:flex items-center space-x-10 text-base font-medium uppercase tracking-widest text-gray-600">
          {user?.role === 'admin' && <Link to="/admin" className="hover:text-brand-500 transition-colors px-2">Admin</Link>}
          <div className="flex items-center space-x-6 pl-8 border-l border-brand-100">
            <Link to="/wishlist" className="relative hover:text-brand-500 transition-colors">
              <Heart className="w-6 h-6" />
            </Link>
            <Link to="/cart" className="relative hover:text-brand-500 transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-500 text-white text-[11px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Link>
            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/profile" className="flex items-center space-x-2 group">
                   <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 group-hover:bg-brand-100 transition-colors">
                     <User className="w-5 h-5" />
                   </div>
                   <div className="hidden lg:flex flex-col">
                     <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tài khoản</span>
                     <span className="text-[11px] text-brand-500 font-black uppercase truncate max-w-[80px]">
                       {user.name || user.email.split('@')[0]}
                     </span>
                   </div>
                </Link>
                <button onClick={() => signOut(auth).then(() => toast.success('Đã đăng xuất'))} className="hover:text-brand-500 transition-colors">
                  <LogOut className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="hover:text-brand-500 transition-colors">
                <User className="w-6 h-6" />
              </Link>
            )}
          </div>
        </div>

        <button className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
          <Menu className="w-6 h-6 text-brand-600" />
        </button>
      </div>

      {/* Navigation Row */}
      <div className="max-w-7xl mx-auto px-6 pb-8 hidden md:block">
        <div className="flex items-center justify-between space-x-1">
          {[
            { id: 'all', label: 'TẤT CẢ' },
            { id: 'skincare', label: 'CHĂM SÓC DA' },
            { id: 'makeup', label: 'TRANG ĐIỂM' },
            { id: 'fragrance', label: 'NƯỚC HOA' },
            { id: 'bodycare', label: 'CHĂM SÓC CƠ THỂ' },
            { id: 'blog', label: 'XU HƯỚNG LÀM ĐẸP' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                if (cat.id === 'all') {
                  navigate('/');
                  setTimeout(() => {
                    const element = document.getElementById('products');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100);
                } else if (cat.id === 'blog') {
                  navigate('/blog');
                } else {
                  navigate(`/category/${cat.id}`);
                }
              }}
              className={cn(
                "flex-1 px-2 py-4 rounded-2xl text-[10px] font-black tracking-[0.1em] transition-all uppercase border text-center whitespace-nowrap",
                (cat.id === 'all' && location.pathname === '/') || 
                (cat.id === 'blog' && location.pathname.startsWith('/blog')) ||
                (location.pathname === `/category/${cat.id}`)
                  ? "bg-brand-500 text-white border-brand-500 shadow-xl shadow-brand-100/50" 
                  : "bg-white text-gray-400 border-gray-100 hover:border-brand-200 hover:text-brand-500 hover:bg-brand-50/20"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 bg-white z-[60] flex flex-col p-8"
          >
            <div className="flex justify-end">
              <button onClick={() => setMobileMenuOpen(false)}>
                <X className="w-8 h-8 text-brand-600" />
              </button>
            </div>
            <div className="flex-grow flex flex-col items-center justify-center space-y-6 text-xl font-serif">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>Trang chủ</Link>
              <div className="flex flex-col items-center space-y-4 py-4 border-y border-brand-50 w-full">
                <span className="text-xs font-bold uppercase tracking-widest text-brand-400">Danh mục</span>
                <Link to="/category/skincare" onClick={() => setMobileMenuOpen(false)} className="text-lg">Chăm sóc da</Link>
                <Link to="/category/makeup" onClick={() => setMobileMenuOpen(false)} className="text-lg">Trang điểm</Link>
                <Link to="/category/fragrance" onClick={() => setMobileMenuOpen(false)} className="text-lg">Nước hoa</Link>
                <Link to="/category/bodycare" onClick={() => setMobileMenuOpen(false)} className="text-lg">Chăm sóc cơ thể</Link>
                <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="text-lg">Xu hướng làm đẹp</Link>
              </div>
              <Link to="/cart" onClick={() => setMobileMenuOpen(false)}>Giỏ hàng ({cartCount})</Link>
              {user && <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>Tài khoản</Link>}
              {user?.role === 'admin' && <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>Admin</Link>}
              {user ? (
                <button onClick={() => { signOut(auth).then(() => toast.success('Đã đăng xuất')); setMobileMenuOpen(false); }} className="text-brand-500">Đăng xuất</button>
              ) : (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Đăng nhập</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-white pt-0 pb-8 px-6">
      <div className="w-full h-0.5 bg-brand-500 mb-16"></div>
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        <div>
          <h4 className="text-base font-bold text-gray-900 mb-8 uppercase tracking-wider">Về chúng tôi</h4>
          <ul className="space-y-4 text-sm text-gray-500 font-medium">
            <li><Link to="/page/story" className="hover:text-brand-500 transition-colors">Câu chuyện thương hiệu</Link></li>
            <li><Link to="/page/stores" className="hover:text-brand-500 transition-colors">Hệ thống cửa hàng</Link></li>
            <li><Link to="/page/jobs" className="hover:text-brand-500 transition-colors">Tuyển dụng</Link></li>
            <li><Link to="/page/contact" className="hover:text-brand-500 transition-colors">Liên hệ</Link></li>
            <li className="pt-2 text-gray-400">Hotline: 1900 636 510</li>
            <li className="text-gray-400">Email: contact@qhskinlab.com</li>
          </ul>
        </div>
        <div>
          <h4 className="text-base font-bold text-gray-900 mb-8 uppercase tracking-wider">Chính sách</h4>
          <ul className="space-y-4 text-sm text-gray-500 font-medium">
            <li><Link to="/page/privacy" className="hover:text-brand-500 transition-colors">Chính sách bảo mật</Link></li>
            <li><Link to="/page/terms" className="hover:text-brand-500 transition-colors">Điều khoản sử dụng</Link></li>
            <li><Link to="/page/returns" className="hover:text-brand-500 transition-colors">Chính sách đổi trả</Link></li>
            <li><Link to="/page/shipping" className="hover:text-brand-500 transition-colors">Chính sách vận chuyển</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-base font-bold text-gray-900 mb-8 uppercase tracking-wider">Hỗ trợ khách hàng</h4>
          <ul className="space-y-4 text-sm text-gray-500 font-medium">
            <li><Link to="/page/guide" className="hover:text-brand-500 transition-colors">Hướng dẫn mua hàng</Link></li>
            <li><Link to="/page/payment" className="hover:text-brand-500 transition-colors">Phương thức thanh toán</Link></li>
            <li><Link to="/page/faq" className="hover:text-brand-500 transition-colors">Câu hỏi thường gặp</Link></li>
            <li><Link to="/page/tracking" className="hover:text-brand-500 transition-colors">Tra cứu đơn hàng</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-base font-bold text-gray-900 mb-8 uppercase tracking-wider">Kết nối với chúng tôi</h4>
          <div className="flex items-center space-x-4">
            <a href="#" className="text-gray-900 hover:text-brand-500 transition-colors">
              <Facebook className="w-6 h-6" strokeWidth={1.5} />
            </a>
            <a href="#" className="text-gray-900 hover:text-brand-500 transition-colors">
              <Instagram className="w-6 h-6" strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto pt-8 border-t border-brand-50 flex justify-center">
        <p className="text-[11px] text-gray-400 font-medium">
          © 2026 Q&H LUMINA. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
