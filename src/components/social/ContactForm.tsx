import { useState } from 'react';
import { X, User, Phone, Mail } from 'lucide-react';

interface Props {
  onSend: (contact: { name: string; phone: string; email: string }) => void;
  onClose: () => void;
}

export default function ContactForm({ onSend, onClose }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-white/10 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Share Contact</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/60" /></button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5">
            <User className="w-4 h-4 text-white/40" />
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none" autoFocus />
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5">
            <Phone className="w-4 h-4 text-white/40" />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none" />
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5">
            <Mail className="w-4 h-4 text-white/40" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 text-sm font-medium transition-all">Cancel</button>
          <button onClick={() => { if (name.trim()) onSend({ name: name.trim(), phone: phone.trim(), email: email.trim() }); }} disabled={!name.trim()} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50">Send</button>
        </div>
      </div>
    </div>
  );
}
