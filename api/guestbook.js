import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// 쉼표로 여러 개 지정 가능. 예: "https://3abncnmoct6.github.io,http://localhost:8000"
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://3abncnmoct6.github.io')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const NAME_MAX = 20;
const MESSAGE_MAX = 300;
const RATE_WINDOW_SEC = 60; // 이 시간 동안
const RATE_MAX_POSTS = 3;   // 같은 IP에서 최대 몇 개까지

let supabase;
function db() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경 변수가 없습니다.');
    supabase = createClient(url, key, { auth: { persistSession: false } });
  }
  return supabase;
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

function hashIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '');
  const ip = fwd.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const salt = process.env.IP_HASH_SALT || 'guestbook';
  return createHash('sha256').update(salt + ip).digest('hex').slice(0, 32);
}

function clean(value, max) {
  // 제어 문자 제거 후 앞뒤 공백 정리
  const s = String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  return s.length > max ? null : s;
}

async function list(res) {
  const { data, error } = await db()
    .from('guestbook')
    .select('id, name, message, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error(error);
    return res.status(500).json({ error: '방명록을 불러오지 못했어요.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(data);
}

async function create(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const name = clean(body?.name, NAME_MAX);
  const message = clean(body?.message, MESSAGE_MAX);
  if (!name || !message) {
    return res.status(400).json({
      error: `이름(1~${NAME_MAX}자)과 메시지(1~${MESSAGE_MAX}자)를 입력해주세요.`,
    });
  }

  const ipHash = hashIp(req);
  const since = new Date(Date.now() - RATE_WINDOW_SEC * 1000).toISOString();
  const { count, error: countError } = await db()
    .from('guestbook')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since);
  if (countError) {
    console.error(countError);
    return res.status(500).json({ error: '잠시 후 다시 시도해주세요.' });
  }
  if ((count ?? 0) >= RATE_MAX_POSTS) {
    return res.status(429).json({ error: '너무 자주 작성하고 있어요. 1분 뒤에 다시 시도해주세요.' });
  }

  const { data, error } = await db()
    .from('guestbook')
    .insert({ name, message, ip_hash: ipHash })
    .select('id, name, message, created_at')
    .single();
  if (error) {
    console.error(error);
    return res.status(500).json({ error: '저장하지 못했어요.' });
  }
  return res.status(201).json(data);
}

export default async function handler(req, res) {
  setCors(req, res);
  try {
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method === 'GET') return await list(res);
    if (req.method === 'POST') return await create(req, res);
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '서버 오류가 발생했어요.' });
  }
}
