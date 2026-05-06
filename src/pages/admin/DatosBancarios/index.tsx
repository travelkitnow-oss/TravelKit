import { useState, useEffect } from 'react';
import { Save, Landmark, CreditCard, User } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import './DatosBancarios.css';

export default function DatosBancariosPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    bank_name: '',
    bank_cbu: '',
    bank_alias: '',
    bank_holder: ''
  });

  useEffect(() => {
    fetchBankData();
  }, []);

  async function fetchBankData() {
    setLoading(true);
    const { data: settings } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['bank_name', 'bank_cbu', 'bank_alias', 'bank_holder']);

    if (settings) {
      const bankData = { ...data };
      settings.forEach(s => {
        if (s.key === 'bank_name') bankData.bank_name = s.value;
        if (s.key === 'bank_cbu') bankData.bank_cbu = s.value;
        if (s.key === 'bank_alias') bankData.bank_alias = s.value;
        if (s.key === 'bank_holder') bankData.bank_holder = s.value;
      });
      setData(bankData);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const updates = [
      { key: 'bank_name', value: data.bank_name },
      { key: 'bank_cbu', value: data.bank_cbu },
      { key: 'bank_alias', value: data.bank_alias },
      { key: 'bank_holder', value: data.bank_holder }
    ];

    for (const update of updates) {
      await supabase
        .from('site_settings')
        .upsert({ key: update.key, value: update.value }, { onConflict: 'key' });
    }

    setSaving(false);
    alert('Datos guardados correctamente');
  }

  return (
    <div className="datos-bancarios-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Datos Bancarios</h1>
        <p>Configura los datos de transferencia que verán tus clientes para realizar los pagos.</p>
      </header>

      {loading ? (
        <div className="p-5 text-center">
          <div className="loader-premium"></div>
        </div>
      ) : (
        <div className="glass-card max-w-2xl mx-auto">
          <div className="card-body p-6">
            <div className="input-grid">
              <div className="input-group">
                <label><Landmark size={18} /> Nombre del Banco</label>
                <input 
                  type="text" 
                  value={data.bank_name} 
                  onChange={e => setData({...data, bank_name: e.target.value})}
                  placeholder="Ej: Banco Galicia"
                />
              </div>

              <div className="input-group">
                <label><User size={18} /> Titular de la Cuenta</label>
                <input 
                  type="text" 
                  value={data.bank_holder} 
                  onChange={e => setData({...data, bank_holder: e.target.value})}
                  placeholder="Nombre completo"
                />
              </div>

              <div className="input-group">
                <label><CreditCard size={18} /> CBU / CVU</label>
                <input 
                  type="text" 
                  value={data.bank_cbu} 
                  onChange={e => setData({...data, bank_cbu: e.target.value})}
                  placeholder="22 dígitos"
                />
              </div>

              <div className="input-group">
                <label><Landmark size={18} /> Alias</label>
                <input 
                  type="text" 
                  value={data.bank_alias} 
                  onChange={e => setData({...data, bank_alias: e.target.value})}
                  placeholder="Tu alias de cuenta"
                />
              </div>
            </div>

            <div className="mt-6">
              <button 
                className="btn btn-primary w-full" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
