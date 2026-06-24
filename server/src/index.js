require('dotenv').config();

const app = require('./app');
const supabaseUrl = process.env.SUPABASE_URL;
const whatsapp = require('./services/whatsapp');

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // Verificar que Supabase esté alcanzable
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_KEY },
    });

    if (!response.ok && response.status !== 401) {
      throw new Error(`Supabase respondió con status ${response.status}`);
    }

    console.log('[DB] Conexión a Supabase establecida');

    app.listen(PORT, () => {
      console.log(`[Server] CRM Fotográfico corriendo en http://localhost:${PORT}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);

      // Iniciar WhatsApp si está habilitado
      if (process.env.WHATSAPP_ENABLED !== 'false') {
        console.log('[WhatsApp] Inicializando conexión…');
        whatsapp.start().catch(err => {
          console.error('[WhatsApp] Error al iniciar:', err.message);
        });
      }
    });
  } catch (err) {
    console.error('[DB] Error conectando a Supabase:', err.message);
    console.error('[DB] Asegúrate de que SUPABASE_URL y SUPABASE_SERVICE_KEY estén configurados en .env');
    process.exit(1);
  }
}

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\n[Server] Cerrando...');
  // Cerrar WhatsApp
  if (whatsapp.state._sock) {
    try { whatsapp.state._sock.ws?.close(); } catch (_) {}
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Server] Cerrando...');
  if (whatsapp.state._sock) {
    try { whatsapp.state._sock.ws?.close(); } catch (_) {}
  }
  process.exit(0);
});

start();
