
import React from 'react';
import { UserProfile, Product, ChemicalCategory, CartItem, Order } from '../types';
import HomeTab from '../components/HomeTab';
import CategoriesTab from '../components/CategoriesTab';
import CartTab from '../components/CartTab';
import OrdersTab from '../components/OrdersTab';
import AccountTab from '../components/AccountTab';

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
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-32">
        {renderTabContent()}
      </div>

      {/* Floating Comparison Bar - Native Style */}
      {props.compareList?.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 bg-[#004AAD] rounded-2xl p-3 flex items-center justify-between shadow-2xl z-50 animate-bounce">
           <div className="flex -space-x-3 overflow-hidden ml-2">
              {props.compareList.map(p => (
                <img key={p.id} src={p.image} className="w-8 h-8 rounded-full border-2 border-[#004AAD] object-cover" alt="" />
              ))}
           </div>
           <button onClick={props.onOpenComparison} className="btn-haptic text-white font-bold text-xs uppercase tracking-widest px-4 py-1.5 bg-white/20 rounded-lg">Compare ({props.compareList.length})</button>
        </div>
      )}

      {/* Native Bottom Tab Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 flex justify-around safe-bottom pt-3 pb-2 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        {[
          { id: 'HOME', label: 'Home', icon: '🏠' },
          { id: 'CATEGORIES', label: 'Catalog', icon: '📁' },
          { id: 'CART', label: 'Cart', icon: '🛒', badge: props.cartItems?.length || 0 },
          { id: 'ORDERS', label: 'Orders', icon: '📜' },
          { id: 'ACCOUNT', label: 'Profile', icon: '👤' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => props.onTabChange(tab.id as any)}
            className={`btn-haptic flex flex-col items-center space-y-1 relative px-4 py-1 transition-all ${props.activeTab === tab.id ? 'text-[#004AAD]' : 'text-gray-400'}`}
          >
            <span className={`text-xl transition-transform ${props.activeTab === tab.id ? 'scale-125' : ''}`}>{tab.icon}</span>
            <span className={`text-[9px] font-bold uppercase tracking-tighter ${props.activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
            {tab.badge ! > 0 && (
              <span className="absolute top-0 right-3 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BusinessDashboard;
