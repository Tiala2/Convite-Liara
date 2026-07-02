import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Client } = pg;

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const projectRef = process.env.SUPABASE_PROJECT_REF;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey || !projectRef || !dbPassword || !adminEmail || !adminPassword) {
  console.error('Defina SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD, ADMIN_EMAIL e ADMIN_PASSWORD.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const getAuthUserId = async () => {
  const signUp = await supabase.auth.signUp({
    email: adminEmail,
    password: adminPassword,
  });

  if (signUp.data.user?.id) return signUp.data.user.id;

  const signIn = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (signIn.data.user?.id) return signIn.data.user.id;

  return null;
};

const client = new Client({
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: dbPassword,
  ssl: { rejectUnauthorized: false },
});

try {
  let userId = await getAuthUserId();

  await client.connect();

  if (!userId) {
    const { rows } = await client.query('select id from auth.users where lower(email) = lower($1) limit 1', [adminEmail]);
    userId = rows[0]?.id;
  }

  if (!userId) {
    throw new Error('Nao foi possivel criar ou localizar o usuario Auth.');
  }

  await client.query(
    `
      update auth.users
         set email_confirmed_at = coalesce(email_confirmed_at, now())
       where id = $1
    `,
    [userId],
  );

  await client.query(
    `
      insert into public.admins (user_id, name, role)
      values ($1, $2, 'owner')
      on conflict (user_id)
      do update set name = excluded.name, role = 'owner'
    `,
    [userId, 'Tiala Debora Fernandes Nobre'],
  );

  console.log('Admin configurado:', adminEmail);
} finally {
  await client.end().catch(() => undefined);
}
