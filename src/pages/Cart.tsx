import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/utils';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, totalAmount, cartCount, giftItem } = useCart();
  const eligibleForGift = totalAmount >= 1000000;

  if (cartCount === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="bg-brand-50 p-12 rounded-full">
          <ShoppingBag className="w-20 h-20 text-brand-200" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-serif text-gray-900">Giỏ hàng của bạn đang trống</h2>
          <p className="text-gray-500 max-w-xs mx-auto italic">Có vẻ như bạn chưa thêm gì vào bộ sưu tập của mình.</p>
        </div>
        <Link 
          to="/" 
          className="bg-brand-500 text-white px-10 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-brand-600 transition-all shadow-lg shadow-brand-200"
        >
          Bắt đầu mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
      <h1 className="text-4xl font-serif mb-12 text-center">Túi hàng của bạn</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-8">
          {cart.map((item) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-6 pb-8 border-b border-brand-50"
            >
              <div className="w-24 h-32 md:w-32 md:h-40 rounded-2xl overflow-hidden bg-brand-50 flex-shrink-0">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              </div>
              
              <div className="flex-grow space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-brand-400 mb-1">{item.category}</h3>
                    <h2 className="text-lg font-medium text-gray-900">{item.name}</h2>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-gray-300 hover:text-brand-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex flex-col">
                  {item.onFlashSale ? (
                    <>
                      <p className="text-sm font-serif italic text-brand-500">
                        {formatPrice(item.price * (1 - (item.flashSaleDiscount || 25) / 100))}
                      </p>
                      <p className="text-[10px] text-gray-300 line-through">
                        {formatPrice(item.price)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-serif italic text-gray-500">{formatPrice(item.price)}</p>
                  )}
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <div className="flex items-center border border-brand-100 rounded-full overflow-hidden">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-2 hover:bg-brand-50 transition-colors"
                    >
                      <Minus className="w-4 h-4 text-gray-400" />
                    </button>
                    <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-2 hover:bg-brand-50 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {eligibleForGift && giftItem && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center space-x-6 pb-8 border-b border-brand-100 bg-brand-50/50 p-6 rounded-[2rem] relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-brand-500"></div>
              <div className="w-24 h-32 md:w-32 md:h-40 rounded-2xl overflow-hidden bg-white flex-shrink-0 border border-brand-100">
                <img src={giftItem.imageUrl} alt={giftItem.name} className="w-full h-full object-cover" />
              </div>
              
              <div className="flex-grow space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                        <span className="text-[9px] font-black uppercase text-white bg-brand-500 px-2 py-0.5 rounded">QUÀ TẶNG</span>
                        <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-brand-400">{giftItem.category}</h3>
                    </div>
                    <h2 className="text-lg font-medium text-gray-900">{giftItem.name}</h2>
                  </div>
                </div>
                
                <div className="flex flex-col">
                    <p className="text-sm font-serif italic text-brand-500">Miễn phí (Tặng kèm đơn hàng {'>'}500k)</p>
                    <p className="text-[10px] text-gray-300 line-through">{formatPrice(giftItem.price)}</p>
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <div className="flex items-center bg-white px-4 py-1.5 rounded-full border border-brand-100 shadow-sm text-xs font-bold text-brand-600">
                    SỐ LƯỢNG: 1
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Summary Side */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2rem] border border-brand-100 shadow-xl shadow-brand-50 sticky top-32 space-y-8">
            <h2 className="text-xs uppercase font-bold tracking-[0.3em] text-gray-900 border-b border-brand-50 pb-6">Tổng kết</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tạm tính</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Vận chuyển</span>
                <span className="text-brand-500 font-medium">Miễn phí</span>
              </div>
            </div>

            <div className="pt-6 border-t border-brand-50 flex justify-between items-baseline">
              <span className="text-xs uppercase font-bold tracking-widest text-gray-900">Tổng cộng</span>
              <span className="text-2xl font-serif">{formatPrice(totalAmount)}</span>
            </div>

            <Link 
              to="/checkout"
              className="w-full bg-brand-500 text-white rounded-2xl py-5 font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center space-x-3 hover:bg-brand-600 transition-all shadow-lg shadow-brand-200 active:scale-[0.98]"
            >
              <span>Tiến hành thanh toán</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            
            <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest">Thanh toán an toàn qua Stripe</p>
          </div>
        </div>
      </div>
    </div>
  );
}
