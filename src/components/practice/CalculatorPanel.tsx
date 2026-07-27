import { useState } from 'react';
import { Calculator, X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function CalculatorPanel({ onClose }: Props) {
  const [tab, setTab] = useState<'basic' | 'scientific'>('basic');
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

  const handleParen = (p: '(' | ')') => {
    setExpr(expr + p);
  };

  const handleSciFunc = (fn: string) => {
    const val = parseFloat(display);
    let result: number;
    switch (fn) {
      case 'sin': result = Math.sin(val * Math.PI / 180); break;
      case 'cos': result = Math.cos(val * Math.PI / 180); break;
      case 'tan': result = Math.tan(val * Math.PI / 180); break;
      case 'asin': result = Math.asin(val) * 180 / Math.PI; break;
      case 'acos': result = Math.acos(val) * 180 / Math.PI; break;
      case 'atan': result = Math.atan(val) * 180 / Math.PI; break;
      case 'log': result = Math.log10(val); break;
      case 'ln': result = Math.log(val); break;
      case 'sqrt': result = Math.sqrt(val); break;
      case 'cbrt': result = Math.cbrt(val); break;
      case 'x²': result = val * val; break;
      case 'x³': result = val * val * val; break;
      case '1/x': result = 1 / val; break;
      case '|x|': result = Math.abs(val); break;
      case 'n!': result = factorial(val); break;
      case '10^': result = Math.pow(10, val); break;
      case 'e^': result = Math.exp(val); break;
      default: result = val;
    }
    setDisplay(String(Number(result.toFixed(10))));
    setHasResult(true);
  };

  const handleConst = (c: string) => {
    if (c === 'π') setDisplay(String(Math.PI));
    else if (c === 'e') setDisplay(String(Math.E));
    setHasResult(true);
  };

  const factorial = (n: number): number => {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  };

  const Button = ({ onClick, label, className = '', span = 1 }: { onClick: () => void; label: string; className?: string; span?: number }) => (
    <button
      onClick={onClick}
      className={`h-9 rounded-lg font-medium text-sm transition active:scale-95 ${span === 2 ? 'col-span-2' : ''} ${className}`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed bottom-20 right-4 z-50 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700">
        <div className="flex items-center gap-1.5">
          <Calculator size={14} className="text-primary-600 dark:text-primary-400" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Calculator</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab('basic')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${tab === 'basic' ? 'bg-primary-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
          >
            Basic
          </button>
          <button
            onClick={() => setTab('scientific')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${tab === 'scientific' ? 'bg-primary-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
          >
            Scientific
          </button>
          <button onClick={onClose} className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="text-right text-[10px] text-gray-400 dark:text-gray-500 h-3 truncate mb-0.5">{expr}</div>
        <div className="text-right text-xl font-mono font-bold text-gray-800 dark:text-gray-100 truncate mb-3">
          {display}
        </div>

        {tab === 'scientific' && (
          <div className="grid grid-cols-5 gap-1 mb-2">
            <Button onClick={() => handleSciFunc('sin')} label="sin" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px]" />
            <Button onClick={() => handleSciFunc('cos')} label="cos" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px]" />
            <Button onClick={() => handleSciFunc('tan')} label="tan" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px]" />
            <Button onClick={() => handleSciFunc('log')} label="log" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px]" />
            <Button onClick={() => handleSciFunc('ln')} label="ln" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px]" />

            <Button onClick={() => handleSciFunc('asin')} label="sin⁻¹" className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px]" />
            <Button onClick={() => handleSciFunc('acos')} label="cos⁻¹" className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px]" />
            <Button onClick={() => handleSciFunc('atan')} label="tan⁻¹" className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px]" />
            <Button onClick={() => handleSciFunc('sqrt')} label="√" className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px]" />
            <Button onClick={() => handleSciFunc('cbrt')} label="∛" className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px]" />

            <Button onClick={() => handleSciFunc('x²')} label="x²" className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px]" />
            <Button onClick={() => handleSciFunc('x³')} label="x³" className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px]" />
            <Button onClick={() => handleSciFunc('10^')} label="10ˣ" className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px]" />
            <Button onClick={() => handleSciFunc('e^')} label="eˣ" className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px]" />
            <Button onClick={() => handleSciFunc('1/x')} label="1/x" className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px]" />

            <Button onClick={() => handleSciFunc('n!')} label="n!" className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px]" />
            <Button onClick={() => handleSciFunc('|x|')} label="|x|" className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px]" />
            <Button onClick={() => handleParen('(')} label="(" className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px]" />
            <Button onClick={() => handleParen(')')} label=")" className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px]" />
            <Button onClick={() => handleConst('e')} label="e" className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px]" />

            <Button onClick={() => handleConst('π')} label="π" className="col-span-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px]" />
          </div>
        )}

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

          <Button onClick={() => handleNumber('0')} label="0" span={2} className="bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200" />
          <Button onClick={handleDecimal} label="." className="bg-gray-50 dark:bg-gray-750 text-gray-800 dark:text-gray-200" />
          <Button onClick={handleEquals} label="=" className="bg-primary-600 text-white hover:bg-primary-700" />
        </div>
      </div>
    </div>
  );
}
