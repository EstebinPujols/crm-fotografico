const bcrypt = require('bcryptjs');

/**
 * Seed inicial — datos de demostración para desarrollo.
 */
exports.seed = async function (knex) {
  // ─── Limpiar datos existentes ───
  await knex('whatsapp_messages').del();
  await knex('gallery_photos').del();
  await knex('galleries').del();
  await knex('payments').del();
  await knex('projects').del();
  await knex('appointments').del();
  await knex('settings').del();
  await knex('clients').del();
  await knex('users').del();

  // ─── Contraseña para todos: password123 ───
  const hash = await bcrypt.hash('password123', 10);

  // ─── 1. Users ───
  const [adminUser] = await knex('users').insert([
    { name: 'Admin PhotoCRM', email: 'admin@photocrm.com', password_hash: hash, role: 'admin' },
    { name: 'Carlos Fotógrafo', email: 'carlos@photocrm.com', password_hash: hash, role: 'fotografo' },
    { name: 'Ana Asistente', email: 'ana@photocrm.com', password_hash: hash, role: 'asistente' },
  ]).returning('*');

  console.log(`  ✓ Users creados: admin@photocrm.com / password123`);

  // ─── 2. Clients ───
  const clients = await knex('clients').insert([
    {
      first_name: 'María',
      last_name: 'Gómez',
      phone: '+1 (809) 555-0101',
      email: 'maria.gomez@gmail.com',
      address: 'Calle Principal 123, Santo Domingo',
      social_media: JSON.stringify({ instagram: '@mariagomez', facebook: 'mariagomez' }),
      notes: 'Cliente recurrente. Prefiere sesiones al aire libre.',
    },
    {
      first_name: 'Carlos',
      last_name: 'Méndez',
      phone: '+1 (809) 555-0202',
      email: 'cmendez@outlook.com',
      address: 'Av. Independencia 456, Santo Domingo',
      notes: 'Graduación universitaria.',
    },
    {
      first_name: 'Ana',
      last_name: 'Rodríguez',
      phone: '+1 (829) 555-0303',
      email: 'ana.rodriguez@icloud.com',
      address: 'Calle Las Flores 789, Santiago',
      social_media: JSON.stringify({ instagram: '@anarodriguez' }),
      notes: 'Boda planificada para diciembre.',
    },
    {
      first_name: 'David',
      last_name: 'Peña',
      phone: '+1 (849) 555-0404',
      email: 'dkpena@hotmail.com',
      notes: 'Fotografía corporativa.',
    },
    {
      first_name: 'Laura',
      last_name: 'Castillo',
      phone: '+1 (809) 555-0505',
      email: 'lcastillo@gmail.com',
      notes: 'Cliente frecuente. Campañas de producto.',
    },
    {
      first_name: 'TechConf',
      last_name: 'RD',
      phone: '+1 (809) 555-0606',
      email: 'info@techconf.do',
      notes: 'Evento corporativo anual.',
    },
  ]).returning('*');

  console.log(`  ✓ ${clients.length} clientes creados`);

  // ─── 3. Settings ───
  await knex('settings').insert([
    { key: 'clientPortalEnabled', value: 'true' },
    { key: 'whatsappEnabled', value: 'true' },
    { key: 'galleryEnabled', value: 'true' },
    { key: 'paymentsEnabled', value: 'true' },
  ]);

  // ─── 4. Appointments ───
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 5);

  const appointments = await knex('appointments').insert([
    {
      client_id: clients[0].id,
      date: fmt(tomorrow),
      time: '10:00:00',
      location: 'Jardín Botánico, Santo Domingo',
      session_type: 'Sesión Familiar',
      status: 'confirmada',
      notes: 'Sesión familiar al aire libre.',
    },
    {
      client_id: clients[1].id,
      date: fmt(nextWeek),
      time: '14:00:00',
      location: 'UASD, Santo Domingo',
      session_type: 'Graduación',
      status: 'confirmada',
    },
    {
      client_id: clients[2].id,
      date: fmt(lastWeek),
      time: '09:00:00',
      location: 'Iglesia San José, Santiago',
      session_type: 'Bautizo',
      status: 'completada',
      notes: 'Bautizo familiar. Cliente satisfecha.',
    },
    {
      client_id: clients[3].id,
      date: fmt(tomorrow),
      time: '16:00:00',
      location: 'Oficinas DK Studios',
      session_type: 'Corporativo',
      status: 'pendiente',
    },
  ]).returning('*');

  console.log(`  ✓ ${appointments.length} citas creadas`);

  // ─── 5. Projects ───
  const projects = await knex('projects').insert([
    {
      client_id: clients[2].id,
      appointment_id: appointments[2].id,
      name: 'Bautizo — Familia Rodríguez',
      status: 'entregado',
      delivery_date: fmt(nextWeek),
    },
    {
      client_id: clients[0].id,
      appointment_id: appointments[0].id,
      name: 'Sesión Familiar — María Gómez',
      status: 'pendiente',
      delivery_date: null,
    },
    {
      client_id: clients[5].id,
      name: 'Conferencia Anual TechConf',
      status: 'fotografiando',
      delivery_date: fmt(nextWeek),
    },
    {
      client_id: clients[4].id,
      name: 'Campaña Producto — Laura Castillo',
      status: 'seleccion',
      delivery_date: fmt(tomorrow),
    },
  ]).returning('*');

  console.log(`  ✓ ${projects.length} proyectos creados`);

  // ─── 6. Payments ───
  await knex('payments').insert([
    {
      client_id: clients[2].id,
      project_id: projects[0].id,
      amount: 15000.00,
      status: 'pagado',
      payment_method: 'Transferencia',
    },
    {
      client_id: clients[0].id,
      project_id: projects[1].id,
      amount: 5000.00,
      status: 'parcial',
      payment_method: 'Efectivo',
    },
    {
      client_id: clients[5].id,
      project_id: projects[2].id,
      amount: 25000.00,
      status: 'pendiente',
      payment_method: 'Transferencia',
    },
    {
      client_id: clients[4].id,
      project_id: projects[3].id,
      amount: 8500.00,
      status: 'pagado',
      payment_method: 'Tarjeta',
    },
  ]);

  console.log(`  ✓ Pagos creados`);

  // ─── 7. Galleries ───
  const galleries = await knex('galleries').insert([
    {
      client_id: clients[2].id,
      project_id: projects[0].id,
      title: 'Bautizo — Familia Rodríguez',
      status: 'active',
      share_token: 'bautizo-rodriguez-abc123',
    },
    {
      client_id: clients[4].id,
      project_id: projects[3].id,
      title: 'Campaña Primavera 2026',
      status: 'active',
      share_token: 'campana-primavera-def456',
    },
    {
      client_id: clients[0].id,
      title: 'Boda María & Carlos',
      status: 'active',
      share_token: 'boda-maria-carlos-ghi789',
    },
  ]).returning('*');

  console.log(`  ✓ ${galleries.length} galerías creadas`);

  // ─── 8. Gallery Photos ───
  await knex('gallery_photos').insert([
    {
      gallery_id: galleries[0].id,
      url: 'https://placehold.co/800x600/fed65b/735c00?text=Foto+1',
      filename: 'bautizo_01.jpg',
      size_bytes: 245000,
    },
    {
      gallery_id: galleries[0].id,
      url: 'https://placehold.co/800x600/fed65b/735c00?text=Foto+2',
      filename: 'bautizo_02.jpg',
      size_bytes: 312000,
    },

    {
      gallery_id: galleries[2].id,
      url: 'https://placehold.co/800x600/fed65b/735c00?text=Boda+1',
      filename: 'boda_01.jpg',
      size_bytes: 450000,
    },
    {
      gallery_id: galleries[2].id,
      url: 'https://placehold.co/800x600/fed65b/735c00?text=Boda+2',
      filename: 'boda_02.jpg',
      size_bytes: 380000,
    },
  ]);

  // ─── 9. WhatsApp Messages ───
  await knex('whatsapp_messages').insert([
    {
      client_id: clients[0].id,
      phone: clients[0].phone,
      direction: 'entrante',
      message: 'Hola, ¿cuándo es mi próxima sesión?',
    },
    {
      client_id: clients[0].id,
      phone: clients[0].phone,
      direction: 'saliente',
      message: '¡Hola María! Tu próxima sesión es mañana a las 10:00 AM en el Jardín Botánico.',
    },
    {
      client_id: clients[3].id,
      phone: clients[3].phone,
      direction: 'entrante',
      message: '¿Cuánto debo?',
    },
  ]);

  console.log(`  ✓ Datos de WhatsApp creados`);
  console.log('\n✅ Seed completado exitosamente');
  console.log('   Login: admin@photocrm.com / password123');
};
