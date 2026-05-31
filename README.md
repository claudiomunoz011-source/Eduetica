# EduÉtica 🎮

> Plataforma educativa de ética gamificada para estudiantes de 8 a 18 años

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)](https://tailwindcss.com)

---

## 🚀 Inicio Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
# Editar .env.local con tus claves

# 3. Iniciar en desarrollo
npm run dev
```

La app estará disponible en **http://localhost:3000**

---

## 🔑 Variables de Entorno

Edita el archivo `.env.local` en la raíz:

| Variable | Descripción | Requerida |
|---|---|---|
| `GEMINI_API_KEY` | API Key de Google Gemini | ✅ Para dilemas con IA |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase | ⏳ Fase 2 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase | ⏳ Fase 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio Supabase | ⏳ Fase 2 |

### Obtener la Gemini API Key
1. Ve a [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Crea una nueva API Key
3. Pégala en `.env.local`: `GEMINI_API_KEY=tu_clave_aqui`

---

## 🗄️ Base de Datos (Supabase — Fase 2)

Cuando tengas tus credenciales de Supabase:
1. Ve a **Supabase Dashboard → SQL Editor**
2. Copia y ejecuta el contenido de `supabase/schema.sql`
3. Agrega las credenciales al `.env.local`

---

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── registro/       → Formulario de registro con avatar y edad
│   ├── temas/          → Selección de temas (filtrado por edad)
│   ├── dilema/         → Módulo de dilemas + leaderboard lateral
│   ├── profesor/       → Dashboard del profesor (contraseña: profesor2024)
│   └── api/
│       ├── session/    → Gestión de sesiones
│       ├── dilema/     → Generación de dilemas con Gemini AI
│       └── leaderboard/→ Ranking de estudiantes
├── components/
│   ├── AvatarPicker    → Selector de 8 avatares animados
│   ├── ClassifyButtons → 5 botones de clasificación ética
│   ├── Leaderboard     → Tabla de clasificación en tiempo real
│   ├── TeacherTable    → Tabla del dashboard del profesor
│   ├── ThemeWrapper    → Aplicación de tema kid/teen
│   └── LanguageSwitcher→ Selector ES/DE/FR/EN
├── lib/
│   ├── gemini.ts       → Cliente Gemini AI + generador de dilemas
│   ├── session.ts      → Gestión de sesión (localStorage → Supabase)
│   └── supabase.ts     → Cliente Supabase (stub en Fase 1)
└── store/
    └── userStore.ts    → Estado global con Zustand
```

---

## 🎨 Temas Adaptativos

| Edad | Tema | Características |
|---|---|---|
| < 14 años | **Kid** 🎮 | Colores vibrantes, fuente Nunito, partículas flotantes, estilo videojuego |
| ≥ 14 años | **Teen** ⚡ | Dark mode, glassmorphism, fuente Inter/Space Grotesk, gradientes neón |

El cambio ocurre **en tiempo real** al ingresar la edad — sin recarga.

---

## 🔐 Temas por Edad

| Tema | Mín. Edad |
|---|---|
| 🌍 Cambio Climático | 8 años |
| 🐾 Derechos de los Animales | 8 años |
| 💻 Ciberacoso | 8 años |
| ⚖️ Justicia y Equidad | 8 años |
| 🏛️ Corrupción | 14 años |
| 💊 Eutanasia | 14 años |
| 🔒 Aborto | 14 años |
| ⚠️ Pena de Muerte | 14 años |

---

## 🏆 Clasificaciones Éticas

| Botón | Clasificación | Descripción |
|---|---|---|
| 🟢 | **Moral** | Acto intencionalmente bueno |
| 🔴 | **Inmoral** | Acto intencionalmente malo |
| ⚪ | **Amoral** | Acto fuera del dominio moral (instintivo/natural) |
| 😴 | **Negligencia por Voluntad Perezosa** | Sabía lo correcto pero no actuó por pereza |
| 🟡 | **Ignorancia Vencible** | Podría haber sabido con esfuerzo razonable |

---

## 👨‍🏫 Panel del Profesor

Accede en `/profesor` — Contraseña: `profesor2024`

Muestra: Nombre, Edad, Curso, Establecimiento, Tema, Tiempo, Dilemas respondidos, Aciertos, Errores, Interacciones de chat.

Funcionalidades:
- ✅ Filtro por curso y establecimiento
- ✅ Ordenación por columnas
- ✅ Exportación CSV
- ✅ Actualización automática cada 5 segundos

---

## 📚 Base de Conocimiento

La carpeta `/docs` está preparada para recibir archivos PDF que servirán de contexto para la IA. Ver `/docs/README.md` para instrucciones.

---

## 🌍 Idiomas Soportados

- 🇪🇸 Español (predeterminado)
- 🇩🇪 Deutsch
- 🇫🇷 Français  
- 🇬🇧 English

El idioma se detecta por cookie y se puede cambiar desde el selector en el header.
