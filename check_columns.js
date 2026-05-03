import { supabase } from './src/lib/supabase';

async function checkColumns() {
  const { data, error } = await supabase.from('client_billing').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columnas encontradas en client_billing:', Object.keys(data[0] || {}));
  }
}

checkColumns();
