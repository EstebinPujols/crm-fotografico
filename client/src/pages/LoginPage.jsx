/**
 * ═══════════════════════════════════════════════
 *  LoginPage.jsx — PÁGINA DE INICIO DE SESIÓN
 * ═══════════════════════════════════════════════
 *
 *  🎯 TU TAREA: Completar el manejador handleSubmit
 *
 *  Esta página muestra el formulario de login. Cuando el usuario
 *  hace clic en "Iniciar Sesión", debe:
 *    1. Llamar a la función login() de authService
 *    2. Si funciona, redirigir a /home
 *    3. Si falla, mostrar el error
 *
 *  📚 LO QUE NECESITAS SABER:
 *
 *  - useState es un Hook de React para guardar estados
 *    const [estado, setEstado] = useState(valorInicial)
 *
 *  - useNavigate es un Hook de React Router para navegar
 *    const navigate = useNavigate()
 *    navigate('/ruta') → redirige a esa ruta
 *
 *  - Ya tengo las variables de estado listas:
 *    • email / setEmail — lo que escribe el usuario en el campo email
 *    • password / setPassword — lo que escribe el usuario en password
 *    • error / setError — mensaje de error a mostrar
 *    • loading / setLoading — true mientras se procesa el login
 *
 *  - El formulario ya llama a handleSubmit cuando se envía
 *
 *  🔍 PISTAS para handleSubmit:
 *
 *    1. Prevenir el envío normal del formulario:
 *       e.preventDefault()
 *
 *    2. Limpiar errores anteriores:
 *       setError('')
 *
 *    3. Validar que los campos no estén vacíos:
 *       if (!email.trim() || !password.trim()) {
 *         setError('Completa todos los campos')
 *         return
 *       }
 *
 *    4. Poner loading en true:
 *       setLoading(true)
 *
 *    5. Encerrar en try/catch:
 *       try {
 *         const result = await login(email, password)
 *         navigate('/home')
 *       } catch (err) {
 *         setError(err.message || 'Error al iniciar sesión')
 *       } finally {
 *         setLoading(false)  // Esto se ejecuta SIEMPRE, fallo o éxito
 *       }
 *
 *  ⚠️ ERRORES COMUNES DE NOVATO:
 *  - Olvidar e.preventDefault() — el formulario recarga la página
 *  - Poner setLoading(false) solo en un sitio — si hay error, se queda cargando
 *  - No poner await antes de login() — la promesa no se resuelve
 *  - Olvidar importar login desde authService
 *
 * ─────────────────────────────────────────────
 *  ¡Manos a la obra! Escribe tu código abajo 👇
 * ─────────────────────────────────────────────
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Credenciales inválidas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ─── EL RESTO DEL CÓDIGO ES LA INTERFAZ — NO TOCAR ───

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9f9f9] px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[#E5E5E5] p-8">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="material-symbols-outlined text-3xl text-[#735c00]">photo_camera</span>
            <span className="text-2xl font-bold text-[#735c00]">PhotoCRM</span>
          </div>
          <p className="text-sm text-on-surface-variant">Inicia sesión en tu cuenta</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-primary mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5E5] bg-white text-primary placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-[#fed65b] focus:border-[#735c00] transition-all"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-primary mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5E5] bg-white text-primary placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-[#fed65b] focus:border-[#735c00] transition-all"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#735c00] text-white font-semibold hover:bg-[#5a4800] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Iniciando sesión…
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        {/* Separador */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E5E5E5]" />
          </div>
          <div className="relative flex justify-center text-xs text-on-surface-variant">
            <span className="bg-white px-3">o continúa con</span>
          </div>
        </div>

        {/* Botón de Google (placeholder visual) */}
        <button
          type="button"
          onClick={() => alert('Autenticación con Google (no implementado)')}
          className="w-full py-2.5 rounded-xl border border-[#E5E5E5] bg-white text-primary font-medium hover:bg-[#f5f5f5] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
