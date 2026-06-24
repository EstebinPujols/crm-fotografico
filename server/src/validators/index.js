const { body, query, param } = require('express-validator');

// ─── Auth ───
const loginRules = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida'),
];

const registerRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
];

// ─── Clientes ───
const clientRules = [
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido'),
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('El apellido es requerido'),
  body('phone')
    .optional()
    .trim(),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('address')
    .optional()
    .trim(),
];

const clientUpdateRules = [
  body('first_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre no puede estar vacío'),
  body('last_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El apellido no puede estar vacío'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
];

// ─── Citas ───
const appointmentRules = [
  body('client_id')
    .isUUID()
    .withMessage('ID de cliente inválido'),
  body('date')
    .isISO8601()
    .withMessage('Fecha inválida (usa formato YYYY-MM-DD)')
    .custom((value) => {
      const [y, m, d] = value.split('-').map(Number);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const apptDate = new Date(y, m - 1, d);
      if (apptDate < today) {
        throw new Error('No puedes agendar citas en el pasado');
      }
      return true;
    }),
  body('time')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
    .withMessage('Hora inválida (usa formato HH:MM)')
    .custom((value, { req }) => {
      // Si la fecha es hoy, validar que la hora no haya pasado
      const today = new Date().toISOString().split('T')[0];
      if (req.body.date === today) {
        const now = new Date();
        const [h, m] = value.split(':').map(Number);
        const apptTotalMin = h * 60 + m;
        const nowTotalMin = now.getHours() * 60 + now.getMinutes();
        if (apptTotalMin <= nowTotalMin) {
          throw new Error('La hora de la cita ya pasó');
        }
      }
      return true;
    }),
  body('location')
    .optional()
    .trim(),
  body('session_type')
    .optional()
    .trim(),
];

// ─── Proyectos ───
const projectRules = [
  body('client_id')
    .isUUID()
    .withMessage('ID de cliente inválido'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre del proyecto es requerido'),
  body('status')
    .optional()
    .isIn(['pendiente', 'fotografiando', 'seleccion', 'edicion', 'entregado', 'finalizado'])
    .withMessage('Estado de proyecto inválido'),
];

// ─── Pagos ───
const paymentRules = [
  body('client_id')
    .isUUID()
    .withMessage('ID de cliente inválido'),
  body('project_id')
    .optional({ values: 'null' })
    .isUUID()
    .withMessage('ID de proyecto inválido'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('El monto debe ser un número positivo'),
  body('status')
    .optional()
    .isIn(['pendiente', 'parcial', 'pagado'])
    .withMessage('Estado de pago inválido'),
  body('payment_method')
    .optional()
    .trim(),
];

// ─── Galerías ───
const galleryRules = [
  body('client_id')
    .isUUID()
    .withMessage('ID de cliente inválido'),
  body('project_id')
    .optional({ values: 'null' })
    .isUUID()
    .withMessage('ID de proyecto inválido'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('El título de la galería es requerido'),
  body('status')
    .optional()
    .isIn(['draft', 'active', 'archived'])
    .withMessage('Estado de galería inválido'),
];

module.exports = {
  loginRules,
  registerRules,
  clientRules,
  clientUpdateRules,
  appointmentRules,
  projectRules,
  paymentRules,
  galleryRules,
};
