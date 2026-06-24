/**
 * Migración inicial — crea todas las tablas del CRM Fotográfico.
 *
 * Orden de creación (respetando dependencias de claves foráneas):
 * 1. users       → roles del sistema
 * 2. clients     → info de clientes
 * 3. settings    → config global
 * 4. appointments → citas (FK → clients)
 * 5. projects    → proyectos (FK → clients, appointments)
 * 6. payments    → pagos (FK → clients, projects)
 * 7. galleries   → álbumes (FK → clients, projects)
 * 8. gallery_photos → fotos (FK → galleries)
 * 9. whatsapp_messages → mensajes (FK → clients)
 */
exports.up = async function (knex) {
  // Extensión para UUID
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // ─── 1. users ───
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 150).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.enu('role', ['admin', 'fotografo', 'asistente', 'cliente']).notNullable().defaultTo('asistente');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // ─── 2. clients ───
  await knex.schema.createTable('clients', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('phone', 30);
    table.string('email', 255);
    table.text('address');
    table.jsonb('social_media');
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // ─── 3. settings ───
  await knex.schema.createTable('settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('key', 100).notNullable().unique();
    table.text('value').notNullable();
  });

  // ─── 4. appointments ───
  await knex.schema.createTable('appointments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE');
    table.date('date').notNullable();
    table.time('time').notNullable();
    table.string('location', 255);
    table.string('session_type', 100);
    table.enu('status', ['pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada'])
      .notNullable().defaultTo('pendiente');
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('client_id');
    table.index('date');
    table.index('status');
  });

  // ─── 5. projects ───
  await knex.schema.createTable('projects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE');
    table.uuid('appointment_id').references('id').inTable('appointments').onDelete('SET NULL');
    table.string('name', 200).notNullable();
    table.enu('status', ['pendiente', 'fotografiando', 'seleccion', 'edicion', 'entregado', 'finalizado'])
      .notNullable().defaultTo('pendiente');
    table.date('delivery_date');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('client_id');
    table.index('status');
  });

  // ─── 6. payments ───
  await knex.schema.createTable('payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE');
    table.uuid('project_id').references('id').inTable('projects').onDelete('SET NULL');
    table.decimal('amount', 12, 2).notNullable();
    table.enu('status', ['pendiente', 'parcial', 'pagado']).notNullable().defaultTo('pendiente');
    table.string('payment_method', 50);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('client_id');
    table.index('project_id');
    table.index('status');
  });

  // ─── 7. galleries ───
  await knex.schema.createTable('galleries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE');
    table.uuid('project_id').references('id').inTable('projects').onDelete('SET NULL');
    table.string('title', 200).notNullable();
    table.enu('status', ['draft', 'active', 'archived']).notNullable().defaultTo('draft');
    table.string('share_token', 64).unique();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('client_id');
    table.index('project_id');
    table.index('status');
  });

  // ─── 8. gallery_photos ───
  await knex.schema.createTable('gallery_photos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('gallery_id').notNullable().references('id').inTable('galleries').onDelete('CASCADE');
    table.string('url', 500).notNullable();
    table.string('filename', 255);
    table.bigInteger('size_bytes').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('gallery_id');
  });

  // ─── 9. whatsapp_messages ───
  await knex.schema.createTable('whatsapp_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('client_id').references('id').inTable('clients').onDelete('SET NULL');
    table.string('phone', 30).notNullable();
    table.enu('direction', ['entrante', 'saliente']).notNullable();
    table.text('message').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('client_id');
    table.index('phone');
    table.index('created_at');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('whatsapp_messages');
  await knex.schema.dropTableIfExists('gallery_photos');
  await knex.schema.dropTableIfExists('galleries');
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('projects');
  await knex.schema.dropTableIfExists('appointments');
  await knex.schema.dropTableIfExists('settings');
  await knex.schema.dropTableIfExists('clients');
  await knex.schema.dropTableIfExists('users');
};
