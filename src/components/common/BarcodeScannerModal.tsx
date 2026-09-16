import React, { useState } from 'react';
import { Modal } from './Modal';
import { Camera, Barcode, Check } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [manualCode, setManualCode] = useState('');

  const handleSimulateScan = (code: string) => {
    onScan(code);
    onClose();
  };

  const sampleBarcodes = [
    { name: 'Gold Nose Pin (8901001)', code: '8901001' },
    { name: 'Diamond Nose Ring (8901002)', code: '8901002' },
    { name: 'Silver Press Stud (8901003)', code: '8901003' },
    { name: 'Gold Jhumka (8901004)', code: '8901004' },
    { name: 'Daily Wear Studs (8901005)', code: '8901005' },
    { name: 'Silver Peacock Stud (8901006)', code: '8901006' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Camera & Barcode Scanner" subtitle="Scan item barcode or enter SKU manually">
      <div className="space-y-6">
        {/* Camera View Simulation */}
        <div className="relative flex h-52 w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-charcoal-950 text-white">
          <div className="absolute inset-x-8 top-10 bottom-10 rounded-xl border-2 border-dashed border-gold-400 opacity-80 animate-pulse" />
          <Camera className="h-10 w-10 text-gold-400 mb-2" />
          <p className="text-xs font-semibold text-gold-300">Position barcode inside camera frame</p>
          <span className="mt-1 text-[10px] text-slate-400">Camera scanner active...</span>
        </div>

        {/* Quick Sample Scan Buttons */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Quick Test Samples:</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {sampleBarcodes.map((item) => (
              <button
                key={item.code}
                onClick={() => handleSimulateScan(item.code)}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left text-xs font-medium hover:border-gold-500 dark:border-charcoal-800 dark:bg-charcoal-800"
              >
                <div className="flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-gold-600" />
                  <span>{item.name}</span>
                </div>
                <Check className="h-3.5 w-3.5 text-emerald-600 opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>

        {/* Manual Code Input */}
        <div className="border-t border-slate-100 pt-4 dark:border-charcoal-800">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Or enter Barcode manually:</label>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. 8901001"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
            <button
              onClick={() => {
                if (manualCode.trim()) handleSimulateScan(manualCode.trim());
              }}
              className="rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 hover:bg-gold-600"
            >
              Confirm Code
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

