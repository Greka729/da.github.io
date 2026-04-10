// config.js
const SUPABASE_URL = 'https://iwloprtivyxuqnuzckqy.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Dz2wiyflhJtG5j4l7vqktg_ljhuFUo-'

// Создаем клиент Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)