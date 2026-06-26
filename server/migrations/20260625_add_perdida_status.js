exports.up = async function (knex) {
  await knex.raw(`ALTER TYPE appointments_status_enum ADD VALUE IF NOT EXISTS 'perdida'`);
};

exports.down = async function (knex) {
};
