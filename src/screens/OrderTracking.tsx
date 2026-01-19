import React from 'react';
import { Order } from '../types';

interface Props {
  onBack: () => void;
  order?: Order;
}

const OrderTracking: React.FC<Props> = ({ onBack, order }) => {
  const steps = [
    { title: 'Order Confirmed', status: 'COMPLETED', time: '10:30 AM' },
    { title: 'Quality Check', status: 'COMPLETED', time: '12:45 PM' },
    { title: 'Dispatched', status: order?.status === 'shipped' ? 'COMPLETED' : 'ACTIVE', time: 'In Progress' },
    { title: 'In Transit', status: 'PENDING', time: '--' },
    { title: 'Delivered', status: order?.status === 'delivered' ? 'COMPLETED' : 'PENDING', time: '--' },
  ];

  return (
    <div className="flex-1 bg-white flex flex-col pt-12">
      {/* Header */}
      <div className="px-6 flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 shadow-sm">
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Track Shipment</h1>
            {order && <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">#{order.id}</span>}
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <div className="px-6 mb-8">
        <div className="bg-[#004AAD] rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-bold text-xl mb-2">Estimated Delivery</h3>
            <p className="text-blue-100 text-sm font-bold uppercase tracking-wider">24 Oct 2026</p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#004AAD]/20 to-transparent"></div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 px-6 overflow-y-auto hide-scrollbar pb-12">
        <div className="space-y-10">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start space-x-6 relative">
              <div className="flex flex-col items-center space-y-10 mt-2 flex-shrink-0">
                {idx < steps.length - 1 && (
                  <div className="w-1 h-20 bg-gray-200"></div>
                )}
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${
                  step.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                  step.status === 'ACTIVE' ? 'bg-[#004AAD] text-white ring-4 ring-blue-100' :
                  'bg-gray-200'
                }`}>
                  {step.status === 'COMPLETED' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : step.status === 'ACTIVE' ? (
                    <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                  ) : (
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  )}
                </div>
              </div>
              <div className="flex-1 py-2">
                <div className="flex items-start justify-between mb-1">
                  <h4 className={`font-bold text-sm uppercase tracking-wide ${
                    step.status === 'PENDING' ? 'text-gray-400' : 'text-gray-900'
                  }`}>
                    {step.title}
                  </h4>
                  <span className="text-xs font-bold text-gray-500">{step.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;