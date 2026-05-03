
import { supabase } from './src/lib/supabase';

async function testTable() {
  const { error } = await supabase.from('one_off_payments').select('*').limit(1);
  if (error) {
    console.log('Table one_off_payments does not exist or error:', error.message);
  } else {
    console.log('Table one_off_payments exists!');
  }
}

testTable();
