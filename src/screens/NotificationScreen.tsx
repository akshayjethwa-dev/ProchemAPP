
import React from 'react';

interface Props {
  onBack: () => void;
}

const NotificationScreen: React.FC<Props> = ({ onBack }) => {
  const notifications = [
    { id: 1, title: 'Order Delivered', msg: 'Your order #ORD-92831 has been successfully delivered.', time: '2h ago', icon: '✅', color: 'bg-green-50' },
    { id: 2, title: 'Transporter Assigned', msg: 'A transporter has been assigned to your order #ORD-94420.', time: '5h ago', icon: '🚛', color: 'bg-blue-50' },
    { id: 3, title: 'Payment Successful', msg: 'We received your payment for order #ORD-94420.', time: '6h ago', icon: '💳', color: 'bg-orange-50' },
    { id: 4, title: 'Stock Update', msg: 'Sulphuric Acid is back in stock at competitive prices.', time: '1d ago', icon: '🧪', color: 'bg-purple-50' },
  ];

  return (
    <div className="flex-1 bg-white flex flex-col pt-12">
      <div className="px-6 flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 shadow-sm transition-transform active:scale-95">
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        </div>
        <button className="text-[10px] font-bold text-[#004AAD] uppercase tracking-widest">Mark all read</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-12 hide-scrollbar">
        {notifications.map(n => (
          <div key={n.id} className="flex space-x-4 items-start pb-4 border-b border-gray-50 last:border-0">
             <div className={`w-12 h-12 ${n.color} rounded-2xl flex items-center justify-center text-xl shadow-sm`}>
                {n.icon}
             </div>
             <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                   <h3 className="text-sm font-bold text-gray-900">{n.title}</h3>
                   <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{n.time}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{n.msg}</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationScreen;