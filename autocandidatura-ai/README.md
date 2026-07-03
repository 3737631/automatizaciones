# AutoCandidatura AI

**Tu agente de IA para encontrar trabajo.**

Conecta tu correo, sube tu CV y activa el agente. La IA busca ofertas reales compatibles y envía candidaturas personalizadas en tu nombre.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (base de datos + storage)
- OpenAI / Gemini / OpenRouter
- PDF parsing
- Gmail API (preparado) / Mock email

## Requisitos

- Node.js 18+
- Cuenta en Supabase
- API key de OpenAI, Google Gemini o OpenRouter

## Configuración

1. **Clonar e instalar**
   ```bash
   cd autocandidatura-ai
   npm install
   ```

2. **Variables de entorno**
   ```bash
   cp .env.example .env.local
   ```
   Completa los valores en `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` desde tu proyecto Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` (Settings → API)
   - `AI_PROVIDER=openai` y `OPENAI_API_KEY` (o gemini/openrouter)

3. **Base de datos Supabase**
   - Abre Supabase SQL Editor
   - Pega y ejecuta el contenido de `SUPABASE_SCHEMA.sql`
   - Crea el bucket `cvs` en Storage (público)

4. **Iniciar**
   ```bash
   npm run dev
   ```

## Uso

1. Entra en `http://localhost:3000`
2. Pulsa **"Conectar correo y empezar"**
3. Conecta tu correo (modo mock o Gmail real)
4. Sube tu CV en PDF (la IA lo analiza automáticamente)
5. Escribe qué trabajo buscas en lenguaje natural
6. Acepta el consentimiento y activa el agente
7. Sigue el progreso en tiempo real
8. Revisa los resultados

## Estructura

```
src/
├── app/                    # Páginas + API routes
│   ├── page.tsx            # Landing
│   ├── connect-email/      # Conectar correo
│   ├── upload-cv/          # Subir CV
│   ├── agent/              # Configurar y ejecutar agente
│   ├── results/            # Resultados
│   ├── history/            # Historial
│   ├── privacy/            # Privacidad y datos
│   └── api/                # 11 endpoints
├── components/             # 14 componentes reutilizables
├── lib/                    # Servicios
│   ├── supabase/           # Clientes Supabase
│   ├── ai/                 # Cliente IA + análisis
│   ├── cv/                 # Parseo y storage de CVs
│   ├── offers/             # Búsqueda y validación
│   ├── agent/              # Motor del agente
│   ├── email/              # Servicio de email
│   └── gmail/              # Integración Gmail
└── types/                  # TypeScript types
```

## Reglas del agente

- Solo envía a ofertas de empleo reales publicadas
- Solo envía si hay email o canal de candidatura claro
- No envía duplicados
- Respeta el límite diario configurado
- Compatibilidad mínima configurable
- Todo queda registrado en el historial
- Se puede pausar, reanudar o detener en cualquier momento
