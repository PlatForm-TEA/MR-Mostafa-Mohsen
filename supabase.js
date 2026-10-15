/* =========================================================
   إعدادات Supabase
========================================================= */

const SUPABASE_URL = "https://zjagwkjjpksmhwtqvghi.supabase.co";

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqYWd3a2pqcGtzbWh3dHF2Z2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNjM1ODksImV4cCI6MjEwNjgzOTU4OX0.Vlg7fx2pVSjt4BEA_c88J60JAYUjJhj5gchsK2EcbI8";


/* تحميل مكتبة Supabase */

const supabaseScript = document.createElement("script");
supabaseScript.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

supabaseScript.onload = function () {
    window.supabaseClient = supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storage: window.localStorage
            }
        }
    );

    window.dispatchEvent(new Event("supabaseReady"));
};

document.head.appendChild(supabaseScript);