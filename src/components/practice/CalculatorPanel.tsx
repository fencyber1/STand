import { useState } from 'react';
import { Calculator, X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function CalculatorPanel({ onClose }: Props) {
  const [display, setDisplay] = useState('0');
  const [expr, setExpr] = useState('');
  const [hasResult, setHasResult] = useState(false);

  const handleNumber = (n: string) => {
    if (hasResult) {
      setDisplay(n);
      setExpr('');
      setHasResult(false);
    } else {
      setDisplay(display === '0' ? n : display + n);
    }
  };

  const handleOp = (op: string) => {
    setExpr(expr + display + ' ' + op + ' ');
    setDisplay('0');
    setHasResult(false);
  };

  const handleEquals = () => {
    try {
      const full = expr + display;
      const result = Function('"use strict";return (' + full + ')')();
      setDisplay(String(result));
      setExpr('');
      setHasResult(true);
    } catch {
      setDisplay('Error');
      setHasResult(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setExpr('');
    setHasResult(false);
  };

  const handleBackspace = () => {
    if (hasResult) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  };

  const handleDecimal = () => {
    if (!display.includes('.')) setDisplay(display + '.');
  };

  const handlePercent = () => {
    setDisplay(String(parseFloat(display) / 100));
    setHasResult(true);
  };

  const Button = ({ onClick, label, className = '' }: { onClick: () => void; label: string; className?: string }) => (
    <button
      onClick={onClick}
      className={`h-10 rounded-lg font-medium text-sm transition active:scale-95 ${className}`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed bottom-20 right-4 z-50 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700">
        <div className="flex items-center gap-1.5">
          <Calculator size={14} className="text-primary-600 dark:text-primary-400" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Calculator</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X size={14} />
        </button>
      </div>
      <div className="p-3">
        <div className="text-right text-xs text-gray-400 dark:text-gray-500 h-4 truncate mb-1">{expr}</div>
        <div className="text-right text-xl font-mono font-bold text-gray-800 dark:text-gray-100 truncate mb-3">
          {display}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <Button onClick={handleClear} label="C" className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" />
          <Button onClick={handleBackspace} label="⌫" className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400" />
          <Button onClick={handlePercent} label="%" className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400" />
          <Button onClick={() => handleOp('/')} label="÷" className="bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400" />

          <Button onClick={() => handleNumber('7')} label="7" className="bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200" />
          <Button onClick={() => handleNumber('8')} label="8" className="bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200" />
          <Button onClick={() => handleNumber('9')} label="9" className="bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200" />
          <Button onClick={() => handleOp('*')} label="×" className="bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400" />

          <Button onClick={() => handleNumber('4')} label="4" className="bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200" />
          <Button onClick={() => handleNumber('5')} label="5" className="bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200" />
          <Button onClick={() => handleNumber('6')} label="6" className="bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200" />
          <Button onClick={() => handleOp('-')} label="−" className="bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400" />

          <Button onClick={() => handleNumber('1')} label="1" className="bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200" />
          <Button onClick={() => handleNumber('2')} label="2" className="bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200" />
          <Button onClick={() => handleNumber('3')} label="3" className="bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200" />
          <Button onClick={() => handleOp('+')} label="+" className="bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400" />

          <Button onClick={() => handleNumber('0')} label="0" className="col-span-2 bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200" />
          <Button onClick={handleDecimal} label="." className="bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200" />
          <Button onClick={handleEquals} label="=" className="bg-primary-600 text-white hover:bg-primary-700" />
        </div>
      </div>
    </div>
  );
}
