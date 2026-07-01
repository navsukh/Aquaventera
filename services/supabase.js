const { v4: uuid } = require('uuid');
const path = require('path');

let createClient;
try {
  ({ createClient } = require('@supabase/supabase-js'));
} catch (error) {
  createClient = null;
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let client;

function getSupabaseClient() {
  if (!client) {
    if (!createClient) {
      throw new Error('Supabase support is unavailable because @supabase/supabase-js is not installed. Run npm install.');
    }
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return client;
}

async function uploadToSupabase(file) {
  const supabase = getSupabaseClient();
  const ext = path.extname(file.originalname || '').toLowerCase();
  const storagePath = `${Date.now()}-${uuid()}${ext}`;
  const { error } = await supabase.storage.from(process.env.SUPABASE_BUCKET || 'uploads').upload(storagePath, file.buffer, {
    contentType: file.mimetype,
    upsert: false
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(process.env.SUPABASE_BUCKET || 'uploads').getPublicUrl(storagePath);

  return {
    storagePath,
    storageUrl: data.publicUrl
  };
}

module.exports = { uploadToSupabase };
