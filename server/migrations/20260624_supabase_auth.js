/**
 * Migración: Integración con Supabase Auth.
 *
 * Agrega soporte para autenticación via Supabase:
 * - Columna supabase_uid en users (mapea usuarios de Supabase Auth a nuestra tabla)
 * - password_hash se vuelve nullable (la contraseña la maneja Supabase)
 * - Seeder adaptado para crear usuarios que coexisten con Supabase Auth
 */
exports.up = async function (knex) {
  // Agregar columna supabase_uid a users (nullable, único)
  await knex.schema.alterTable('users', (table) => {
    table.uuid('supabase_uid').unique().nullable();
  });

  // Hacer password_hash nullable (para usuarios que vienen de Supabase Auth)
  await knex.schema.alterTable('users', (table) => {
    table.string('password_hash', 255).nullable().alter();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('supabase_uid');
  });

  await knex.schema.alterTable('users', (table) => {
    table.string('password_hash', 255).notNullable().alter();
  });
};
