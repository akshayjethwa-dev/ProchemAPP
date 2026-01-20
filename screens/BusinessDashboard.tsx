import React from 'react';
import { UserProfile, Product, ChemicalCategory, CartItem, Order } from '../types';
import { CATEGORIES } from '../constants';

interface Props {
  profile: UserProfile;
  activeTab: 'HOME' | 'CATEGORIES' | 'CART' | 'ORDERS' | 'ACCOUNT';
  onTabChange: (tab: 'HOME' | 'CATEGORIES' | 'CART' | 'ORDERS' | 'ACCOUNT') => void;
  allProducts: Product[];
  onProductSelect: (p: Product) => void;
  onCategorySelect: (c: ChemicalCategory) => void;
  cartItems: CartItem[];
  orders: Order[];
  onRemoveFromCart: (id: string) => void;
  onCheckout: () => void;
  onTrackOrder: (o: Order) => void;
  onSellerAdd: () => void;
  onSellerManage: () => void;
  onLogout: () => void;
  onNotifications: () => void;
  onHelp: () => void;
  onCompanyProfile: () => void;
  onSellerVerify: () => void;
  onLegal: () => void;
  favoritesCount: number;
  compareList: Product[];
  onOpenComparison: () => void;
  onRemoveCompare: (id: string) => void;
}

const BusinessDashboard: React.FC<Props> = (props) => {
  if (!props.profile) return <div className="p-8 text-center font-bold">Session Lost. Please login again.</div>;

  const renderTabContent = () => {
    switch (props.activeTab) {
      case 'HOME': return <HomeTab {...props} />;
      case 'CATEGORIES': return <CategoriesTab onCategorySelect={props.onCategorySelect} />;
      case 'CART': return <CartTab items={props.cartItems || []} onRemove={props.onRemoveFromCart} onCheckout={props.onCheckout} onBrowse={() => props.onTabChange('HOME')} />;
      case 'ORDERS': return <OrdersTab orders={props.orders || []} onTrack={props.onTrackOrder} onBrowse={() => props.onTabChange('HOME')} />;
      case 'ACCOUNT': return <AccountTab {...props} />;
      default: return <HomeTab {...props} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 relative overflow-hidden">
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-24 overscroll-none">
        {renderTabContent()}
      </div>

      {props.compareList?.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 bg-[#004AAD] rounded-2xl p-3 flex items-center justify-between shadow-2xl z-50 animate-slide-up">
           <div className="flex -space-x-3 overflow-hidden ml-2">
              {props.compareList.map(p => (
                <img key={p.id} src={p.image} className="w-8 h-8 rounded-full border-2 border-[#004AAD] object-cover" alt="" />
              ))}
           </div>
           <button onClick={props.onOpenComparison} className="text-white font-bold text-xs uppercase tracking-widest px-4 py-1.5 bg-white/20 rounded-lg active:bg-white/30 transition-colors">Compare ({props.compareList.length}/3)</button>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2 px-2 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-50 pb-safe-2">
        {[
          { id: 'HOME', label: 'Home', icon: '🏠' },
          { id: 'CATEGORIES', label: 'Categories', icon: '📁' },
          { id: 'CART', label: 'Cart', icon: '🛒', badge: props.cartItems?.length || 0 },
          { id: 'ORDERS', label: 'Orders', icon: '📜' },
          { id: 'ACCOUNT', label: 'Account', icon: '👤' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => props.onTabChange(tab.id as any)}
            className={`flex flex-col items-center space-y-1 relative px-4 py-1 transition-all active:scale-95 ${props.activeTab === tab.id ? 'text-[#004AAD]' : 'text-gray-400'}`}
          >
            <span className={`text-xl ${props.activeTab === tab.id ? 'scale-110' : ''} transition-transform`}>{tab.icon}</span>
            <span className={`text-[10px] font-bold ${props.activeTab === tab.id ? 'opacity-100' : 'opacity-70'}`}>{tab.label}</span>
            {tab.badge > 0 && (
              <span className="absolute -top-1 right-2 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-white">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const HomeTab: React.FC<Props> = ({ profile, allProducts, onProductSelect, onCategorySelect, onNotifications }) => {
  return (
    <div className="flex flex-col">
      <div className="bg-[#004AAD] p-4 pt-safe-4 sticky top-0 z-40 shadow-md">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-[#004AAD] text-lg shadow-sm">P</div>
              <span className="text-white font-bold text-lg tracking-tight">Prochem</span>
           </div>
           <div className="flex items-center space-x-3">
              {profile?.isGstVerified && <span className="text-[8px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">GST VERIFIED</span>}
              <button onClick={onNotifications} className="text-white p-2 relative active:opacity-70 transition-opacity">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                 <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-[#004AAD]"></span>
              </button>
           </div>
        </div>
        <div className="relative">
           <input className="w-full bg-white p-3.5 rounded-xl text-sm pl-11 focus:outline-none shadow-inner transition-shadow focus:shadow-md" placeholder="Search chemicals, CAS#, suppliers..." />
           <svg className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
      </div>

      <div className="p-4 overflow-x-auto flex space-x-4 hide-scrollbar -mx-0">
         {[1, 2].map(i => (
           <div key={i} className="min-w-[90%] h-40 rounded-3xl bg-gradient-to-r from-[#004AAD] to-blue-600 p-6 text-white relative overflow-hidden flex flex-col justify-center shadow-lg transform transition-transform active:scale-[0.98]">
              <div className="relative z-10">
                 <h2 className="text-2xl font-black uppercase italic">Bulk Deal {i}</h2>
                 <p className="text-xs opacity-90 mt-1 font-medium">Direct from manufacturers. Low GST rates applied.</p>
                 <button className="bg-orange-500 text-white px-5 py-2 rounded-xl text-[10px] font-bold mt-4 uppercase tracking-widest shadow-lg active:scale-95 transition-all">View Deals</button>
              </div>
           </div>
         ))}
      </div>

      <div className="px-4 py-2">
         <h3 className="font-bold text-gray-800 mb-4 text-xs uppercase tracking-widest ml-1">Departments</h3>
         <div className="flex overflow-x-auto space-x-6 hide-scrollbar pb-2 px-1">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => onCategorySelect(cat)} className="flex flex-col items-center space-y-2 min-w-[70px] group">
                 <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-3xl transition-all group-active:scale-90 group-active:bg-gray-50">
                    {cat.includes('Pharma') ? '💊' : cat.includes('Ind') ? '🏭' : cat.includes('Ag') ? '🚜' : cat.includes('Food') ? '🍏' : '🧪'}
                 </div>
                 <span className="text-[9px] font-bold text-gray-500 text-center leading-tight group-active:text-[#004AAD]">{cat.split(' ')[0]}</span>
              </button>
            ))}
         </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-4 pb-12">
         <div className="col-span-2 flex items-center justify-between mb-1">
            <h3 className="font-bold text-gray-800 text-xs uppercase tracking-widest ml-1">Featured Listings</h3>
            <button className="text-[10px] font-bold text-[#004AAD] uppercase active:opacity-60">Explore More</button>
         </div>
         {(allProducts || []).slice(0, 4).map(p => (
           <div key={p.id} onClick={() => onProductSelect(p)} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col active:scale-[0.97] transition-all relative">
              {p.isSellerVerified && <span className="absolute top-2 right-2 text-[8px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded shadow-sm z-10">VERIFIED</span>}
              <img src={p.image} className="w-full h-28 object-cover rounded-xl mb-3 bg-gray-50" />
              <h4 className="font-bold text-xs text-gray-900 line-clamp-1">{p.name}</h4>
              <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">{p.sellerName}</p>
              <div className="flex items-center justify-between mt-3">
                 <p className="font-black text-sm text-[#004AAD]">₹{p.pricePerUnit}</p>
                 <span className="text-[8px] font-bold bg-green-50 text-green-600 px-1.5 py-0.5 rounded uppercase">{p.purity}%</span>
              </div>
           </div>
         ))}
      </div>

      <div className="p-8 mt-4 text-center border-t border-gray-100">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2">© Prochem Pvt Ltd</p>
          <div className="flex items-center justify-center space-x-2 text-[9px] font-bold text-gray-400 uppercase">
             <span>Made in India</span>
             <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
             <span>v1.2.0-Production</span>
          </div>
      </div>
    </div>
  );
};

const CategoriesTab: React.FC<{ onCategorySelect: (c: ChemicalCategory) => void }> = ({ onCategorySelect }) => {
  return (
    <div className="p-4 pt-12">
      <h1 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-widest ml-1">Chemical Catalog</h1>
      <div className="grid grid-cols-2 gap-4">
         {CATEGORIES.map(cat => (
           <button 
             key={cat} 
             onClick={() => onCategorySelect(cat)}
             className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center group active:scale-95 transition-all"
           >
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-4xl group-active:rotate-12 transition-transform">
                 {cat.includes('Pharma') ? '💊' : cat.includes('Ind') ? '🏭' : cat.includes('Ag') ? '🚜' : cat.includes('Food') ? '🍏' : '🧪'}
              </div>
              <h3 className="font-bold text-xs text-gray-900 leading-tight">{cat}</h3>
           </button>
         ))}
      </div>
    </div>
  );
};

const CartTab: React.FC<{ items: CartItem[], onRemove: (id: string) => void, onCheckout: () => void, onBrowse: () => void }> = ({ items, onRemove, onCheckout, onBrowse }) => {
  const subtotal = items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
      <span className="text-6xl mb-4 opacity-30">🛒</span>
      <h2 className="text-xl font-bold text-gray-400 mb-2">Your cart is empty</h2>
      <button onClick={onBrowse} className="text-[#004AAD] font-bold underline active:opacity-70">Start Procurement</button>
    </div>
  );
  return (
    <div className="p-4 pt-12">
      <h1 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-widest ml-1">Your Cart</h1>
      <div className="space-y-4 mb-28">
        {items.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-2xl flex items-center shadow-sm border border-gray-50">
            <img src={item.image} className="w-16 h-16 rounded-xl object-cover mr-4 bg-gray-50" />
            <div className="flex-1">
              <h3 className="font-bold text-sm text-gray-900">{item.name}</h3>
              <p className="text-[#004AAD] font-bold">₹{(item.pricePerUnit * item.quantity).toLocaleString()}</p>
              <p className="text-[10px] text-gray-400 font-bold mt-1">Qty: {item.quantity} {item.unit}</p>
            </div>
            <button onClick={() => onRemove(item.id)} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl active:bg-red-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        ))}
      </div>
      <div className="fixed bottom-[4.5rem] left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-40 max-w-md mx-auto pb-safe-4">
        <button onClick={onCheckout} className="w-full bg-[#004AAD] text-white py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl active:scale-95 transition-all">Checkout (₹{subtotal.toLocaleString()})</button>
      </div>
    </div>
  );
};

const OrdersTab: React.FC<{ orders: Order[], onTrack: (o: Order) => void, onBrowse: () => void }> = ({ orders, onTrack }) => {
  return (
    <div className="p-4 pt-12">
      <h1 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-widest ml-1">Order History</h1>
      <div className="space-y-4">
        {orders.map(o => (
          <div key={o.id} onClick={() => onTrack(o)} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">#{o.id}</span>
              <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded uppercase">{o.status}</span>
            </div>
            <p className="font-bold text-gray-900">{o.items[0]?.name || 'Chemical Material'}</p>
            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{o.orderDate}</p>
          </div>
        ))}
        {orders.length === 0 && <p className="text-center py-20 text-gray-400 font-bold">No orders yet.</p>}
      </div>
    </div>
  );
};

const AccountTab: React.FC<Props> = ({ profile, onSellerAdd, onSellerManage, onLogout, onHelp, onCompanyProfile, onSellerVerify, onLegal }) => {
  return (
    <div className="flex flex-col">
      <div className="bg-[#004AAD] pt-16 pb-20 px-6 relative pt-safe-4">
         <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl shadow-inner backdrop-blur-md">🏢</div>
            <div className="flex-1">
               <h2 className="text-white font-black text-xl leading-tight">{profile.companyName}</h2>
               <div className="flex items-center space-x-2 mt-1">
                  <p className="text-blue-100 text-[9px] font-bold uppercase tracking-widest">GST Verified</p>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                    profile.verificationStatus === 'APPROVED' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
                  }`}>{profile.verificationStatus}</span>
               </div>
            </div>
         </div>
      </div>

      <div className="px-4 -mt-10 space-y-6">
         <div className="bg-white rounded-3xl p-6 shadow-xl border border-white">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Seller Insights</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Revenue</p>
                  <p className="text-lg font-black text-gray-900">₹{profile.totalRevenue?.toLocaleString() || '0'}</p>
               </div>
               <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Orders</p>
                  <p className="text-lg font-black text-gray-900">{profile.ordersReceived || '0'}</p>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <button onClick={onSellerAdd} className="p-4 bg-green-50 text-green-700 rounded-2xl font-bold text-xs uppercase tracking-widest text-center active:scale-95 transition-transform">Add Product</button>
               <button onClick={onSellerManage} className="p-4 bg-blue-50 text-blue-700 rounded-2xl font-bold text-xs uppercase tracking-widest text-center active:scale-95 transition-transform">Inventory</button>
            </div>
         </div>

         <div className="bg-white rounded-3xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
            {[
               { icon: '🏢', label: 'Company Profile', onClick: onCompanyProfile },
               { icon: '🛡️', label: 'Verification Center', onClick: onSellerVerify },
               { icon: '📜', label: 'Legal & Compliance', onClick: onLegal },
               { icon: '🎧', label: 'Prochem AI Help', onClick: onHelp },
               { icon: '🚪', label: 'Sign Out Account', onClick: onLogout, color: 'text-red-500' }
            ].map(item => (
              <button key={item.label} onClick={item.onClick} className="w-full flex items-center justify-between p-5 text-sm font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                 <span className={`flex items-center ${item.color || ''}`}>
                    <span className="mr-4 text-lg">{item.icon}</span>
                    {item.label}
                 </span>
                 <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            ))}
         </div>
         <div className="p-8 text-center opacity-40">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2">© Prochem Pvt Ltd</p>
            <p className="text-[9px] font-bold uppercase">Made in India • v1.2.0</p>
         </div>
      </div>
    </div>
  );
};

export default BusinessDashboard;