import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, increment, writeBatch } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { ChevronRight, CreditCard, Truck, ShieldCheck, Tag } from 'lucide-react';

export default function Checkout() {
  const { cart, totalAmount, clearCart, giftItem } = useCart();
  const eligibleForGift = totalAmount >= 1000000;
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string, code: string, discountValue: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer'>('cod');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    note: ''
  });
  const navigate = useNavigate();

  if (cart.length === 0) {
    navigate('/');
    return null;
  }

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    try {
      const q = query(
        collection(db, 'coupons'), 
        where('code', '==', couponCode.toUpperCase().trim()),
        where('isActive', '==', true)
      );
      const snap = await getDocs(q);
      
      if (snap.empty) {
        toast.error('Mã giảm giá không hợp lệ hoặc đã hết hạn');
        return;
      }

      const couponData = snap.docs[0].data();
      const couponId = snap.docs[0].id;

      if (couponData.usageLimit > 0 && couponData.usageCount >= couponData.usageLimit) {
        toast.error('Mã giảm giá này đã hết lượt sử dụng');
        return;
      }

      setAppliedCoupon({
        id: couponId,
        code: couponData.code,
        discountValue: couponData.discountValue
      });
      toast.success(`Đã áp dụng mã giảm giá: -${formatPrice(couponData.discountValue)}`);
    } catch (err) {
      toast.error('Có lỗi xảy ra khi áp dụng mã');
    }
  };

  const finalTotal = Math.max(0, totalAmount - (appliedCoupon?.discountValue || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      const cartItems = cart.map(item => {
        const actualPrice = item.onFlashSale ? item.price * (1 - (item.flashSaleDiscount || 25) / 100) : item.price;
        
        // Update product stock and sales count
        const productRef = doc(db, 'products', item.id);
        batch.update(productRef, {
          stock: increment(-item.quantity),
          salesCount: increment(item.quantity)
        });

        return {
          id: item.id,
          name: item.name,
          price: actualPrice,
          quantity: item.quantity
        };
      });

      if (eligibleForGift && giftItem) {
        // Also deduct gift item stock
        const giftRef = doc(db, 'products', giftItem.id);
        batch.update(giftRef, {
          stock: increment(-1),
          salesCount: increment(1)
        });

        cartItems.push({
          id: giftItem.id,
          name: giftItem.name + ' (QUÀ TẶNG)',
          price: 0,
          quantity: 1
        });
      }

      const orderData = {
        userId: auth.currentUser?.uid || null,
        items: cartItems,
        total: finalTotal,
        couponId: appliedCoupon?.id || null,
        discountAmount: appliedCoupon?.discountValue || 0,
        status: 'pending',
        paymentMethod: paymentMethod,
        customerInfo: {
          name: formData.name,
          phone: formData.phone,
          address: formData.address
        },
        note: formData.note,
        createdAt: serverTimestamp()
      };

      const orderRef = doc(collection(db, 'orders'));
      batch.set(orderRef, orderData);
      
      if (appliedCoupon) {
        batch.update(doc(db, 'coupons', appliedCoupon.id), {
          usageCount: increment(1)
        });
      }

      await batch.commit();

      if (paymentMethod === 'bank_transfer') {
        toast.success('Đơn hàng đã được ghi nhận. Vui lòng chuyển khoản để hoàn tất đơn hàng!');
      } else {
        toast.success('Đơn hàng của bạn đã được đặt thành công! Hãy chờ đón sự lung linh sắp tới nhé.');
      }
      
      clearCart();
      navigate('/');
    } catch (error: any) {
      toast.error('Đặt hàng thất bại: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 md:py-20">
      <div className="flex items-center space-x-2 text-[10px] uppercase tracking-[0.3em] font-bold text-gray-400 mb-12">
        <span className="text-brand-500">Giỏ hàng</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-900">Thanh toán</span>
        <ChevronRight className="w-3 h-3" />
        <span>Xác nhận</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        {/* Form Side */}
        <section className="space-y-12">
          <header className="space-y-4">
            <h1 className="text-4xl font-serif">Thông tin giao hàng</h1>
            <p className="text-sm text-gray-500 italic">Vui lòng cung cấp thông tin giao hàng để chúng tôi hoàn thiện đơn hàng.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-brand-500 ml-4">Họ và tên</label>
                <input 
                  type="text" required 
                  className="w-full bg-brand-50 rounded-2xl px-6 py-4 outline-none focus:ring-1 focus:ring-brand-200"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-brand-500 ml-4">Số điện thoại</label>
                <input 
                  type="tel" required 
                  className="w-full bg-brand-50 rounded-2xl px-6 py-4 outline-none focus:ring-1 focus:ring-brand-200"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-brand-500 ml-4">Địa chỉ giao hàng</label>
              <textarea 
                required rows={3}
                className="w-full bg-brand-50 rounded-2xl px-6 py-4 outline-none focus:ring-1 focus:ring-brand-200 resize-none"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-brand-500 ml-4">Ghi chú giao hàng (Tùy chọn)</label>
              <input 
                type="text"
                className="w-full bg-brand-50 rounded-2xl px-6 py-4 outline-none focus:ring-1 focus:ring-brand-200"
                value={formData.note}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                placeholder="Mã cửa, hướng dẫn giao hàng..."
              />
            </div>

            <div className="pt-8 space-y-6">
              <label className="text-[10px] uppercase font-bold tracking-widest text-brand-500 ml-4">Phương thức thanh toán</label>
              
              <div className="grid grid-cols-1 gap-4">
                <button 
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`flex items-start space-x-4 p-6 rounded-3xl border transition-all ${paymentMethod === 'cod' ? 'border-brand-500 bg-brand-50/50 shadow-lg' : 'border-brand-100 bg-white hover:border-brand-200'}`}
                >
                  <div className={`p-3 rounded-full ${paymentMethod === 'cod' ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-500'}`}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold uppercase tracking-widest">Thanh toán khi nhận hàng (COD)</h4>
                    <p className="text-xs text-gray-500 mt-1">Giao hàng và thu tiền tận nơi.</p>
                  </div>
                </button>

                <button 
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`flex items-start space-x-4 p-6 rounded-3xl border transition-all ${paymentMethod === 'bank_transfer' ? 'border-brand-500 bg-brand-50/50 shadow-lg' : 'border-brand-100 bg-white hover:border-brand-200'}`}
                >
                  <div className={`p-3 rounded-full ${paymentMethod === 'bank_transfer' ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-500'}`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold uppercase tracking-widest">Chuyển khoản ngân hàng</h4>
                    <p className="text-xs text-gray-500 mt-1">Chuyển khoản qua số tài khoản ngân hàng của chúng tôi.</p>
                  </div>
                </button>
              </div>

              <AnimatePresence>
                {paymentMethod === 'bank_transfer' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white border-2 border-dashed border-brand-200 rounded-3xl p-8 space-y-4">
                      <h5 className="text-[11px] font-black uppercase tracking-widest text-brand-500 flex items-center">
                        <Tag className="w-4 h-4 mr-2" />
                        Thông tin chuyển khoản
                      </h5>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Ngân hàng:</span>
                          <span className="font-bold">MB Bank</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Số tài khoản:</span>
                          <span className="font-bold text-brand-600 tracking-wider">0393040003</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Chủ tài khoản:</span>
                          <span className="font-bold uppercase">LUU THI HUE</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-brand-50 pt-2">
                          <span className="text-gray-400">Nội dung:</span>
                          <span className="font-bold text-brand-500 italic">QH {formData.phone || 'SĐT'}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 italic">Lưu ý: Đơn hàng sẽ được xử lý sau khi chúng tôi nhận được chuyển khoản.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                disabled={loading}
                className="w-full bg-brand-500 text-white rounded-2xl py-6 font-bold uppercase tracking-[0.2em] text-sm shadow-xl shadow-brand-200 hover:bg-brand-600 transition-all active:scale-[0.98]"
              >
                {loading ? 'Đang xử lý thanh toán...' : `Đặt hàng • ${formatPrice(finalTotal)}`}
              </button>
            </div>
          </form>
        </section>

        {/* Order Summary Side */}
        <section className="lg:pl-10">
          <div className="bg-brand-50/50 p-10 rounded-[3rem] space-y-10 border border-brand-100">
            <h2 className="text-xs uppercase font-bold tracking-[0.3em] text-gray-900 border-b border-brand-100 pb-6">Các mục của bạn</h2>
            
            <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-4 scrollbar-hide">
              {cart.map(item => (
                <div key={item.id} className="flex items-center space-x-4">
                  <div className="w-16 h-20 rounded-xl overflow-hidden bg-white flex-shrink-0">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-sm font-medium">{item.name}</h4>
                    <p className="text-xs text-gray-500 font-serif italic">
                      {item.quantity} × {formatPrice(item.onFlashSale ? item.price * (1 - (item.flashSaleDiscount || 25) / 100) : item.price)}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {formatPrice((item.onFlashSale ? item.price * (1 - (item.flashSaleDiscount || 25) / 100) : item.price) * item.quantity)}
                  </span>
                </div>
              ))}

              {eligibleForGift && giftItem && (
                <div className="flex items-center space-x-4 bg-white/50 p-3 rounded-2xl border border-brand-100">
                  <div className="w-16 h-20 rounded-xl overflow-hidden bg-white flex-shrink-0">
                    <img src={giftItem.imageUrl} alt={giftItem.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center space-x-2">
                        <span className="text-[8px] font-black uppercase text-white bg-brand-500 px-1.5 py-0.5 rounded">GIFT</span>
                        <h4 className="text-sm font-medium">{giftItem.name}</h4>
                    </div>
                    <p className="text-xs text-brand-500 font-serif italic">Quà tặng đặc biệt</p>
                  </div>
                  <span className="text-sm font-medium text-brand-500">Free</span>
                </div>
              )}
            </div>

            <div className="space-y-6 pt-10 border-t border-brand-100">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold tracking-widest text-brand-500 ml-2">Mã giảm giá</label>
                <div className="flex space-x-3">
                  <div className="relative flex-grow">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-300" />
                    <input 
                      type="text" 
                      placeholder="NHẬP MÃ..."
                      className="w-full bg-white rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-1 focus:ring-brand-200 uppercase text-sm"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={applyCoupon}
                    className="bg-brand-500 text-white px-8 py-4 rounded-2xl text-xs uppercase font-bold tracking-widest hover:bg-brand-600 transition-colors"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-base">
                <div className="flex items-center space-x-2 text-gray-500">
                  <Truck className="w-5 h-5" />
                  <span>Miễn phí vận chuyển</span>
                </div>
                <span className="text-brand-500 font-bold uppercase tracking-widest text-xs">Free</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between items-center text-base">
                  <div className="flex items-center space-x-2 text-brand-500">
                    <Tag className="w-5 h-5" />
                    <span>Giảm giá ({appliedCoupon.code})</span>
                  </div>
                  <span className="text-red-500 font-medium">-{formatPrice(appliedCoupon.discountValue)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-brand-50">
                <span className="text-sm uppercase font-bold tracking-[0.2em]">Tổng cộng</span>
                <span className="text-4xl font-serif text-brand-600">{formatPrice(finalTotal)}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl flex items-center space-x-4 border border-brand-100">
              <ShieldCheck className="w-8 h-8 text-brand-200" />
              <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed">
                Cam kết bền vững: Tất cả bao bì vận chuyển của chúng tôi đều có thể phân hủy sinh học và trung hòa carbon.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
