
# Informe Detallado: Migración a Supabase Self-Hosted con RDS Externo

## Resumen Ejecutivo

La migración de tu proyecto Axessible desde Supabase Cloud a una instalación self-hosted con RDS externo es técnicamente posible pero presenta **desafíos significativos** que requieren planificación cuidadosa. Este informe identifica los problemas críticos, las dependencias hardcodeadas, y proporciona recomendaciones para facilitar la transición.

---

## 1. URLs y Referencias Hardcodeadas (CRÍTICO)

### Problema
El proyecto contiene **51 referencias hardcodeadas** al dominio de Supabase Cloud que deben ser parametrizadas:

| Archivo | Tipo de URL | Uso |
|---------|-------------|-----|
| `src/integrations/supabase/client.ts` | `https://faeyekynudyzeotbjfsj.supabase.co` | Cliente principal |
| `src/components/UploadVideo.tsx` | `.storage.supabase.co` | TUS resumable uploads |
| `src/components/RealtimeChat.tsx` | `wss://faeyekynudyzeotbjfsj.functions.supabase.co` | WebSocket realtime |
| `src/pages/AdminSubscribers.tsx` | `/functions/v1/admin-subscribers` | Llamadas directas a edge functions |
| `src/lib/storage.ts` | Storage URL hardcodeada | URLs públicas de archivos |
| `src/components/premium-editor/PremiumEditorLayout.tsx` | Storage URL | URLs de video |
| `supabase/functions/queue-export-job/index.ts` | Storage URL hardcodeada | URL de video para procesamiento |
| `supabase/migrations/20251107071734*.sql` | URL + JWT token hardcodeado | Llamada HTTP desde trigger |

### Solución Recomendada
```typescript
// Crear src/config/supabase.ts
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  storageUrl: import.meta.env.VITE_SUPABASE_STORAGE_URL,
  functionsUrl: import.meta.env.VITE_SUPABASE_FUNCTIONS_URL,
};
```

---

## 2. Extensiones de PostgreSQL (CRÍTICO para RDS)

### Extensiones Requeridas
El proyecto utiliza las siguientes extensiones que **deben estar disponibles en RDS**:

| Extensión | Uso en el Proyecto | Disponible en RDS |
|-----------|-------------------|-------------------|
| `pgcrypto` | Encriptación de datos sensibles | ✅ Sí |
| `uuid-ossp` | Generación de UUIDs | ✅ Sí |
| `pg_trgm` | Búsqueda de texto (similarity) | ✅ Sí |
| `pg_net` | Llamadas HTTP desde triggers | ❌ **NO** |

### Problema Crítico: pg_net
La migración `20251107071734*.sql` usa `pg_net` para enviar notificaciones de registro:
```sql
PERFORM net.http_post(
  url := 'https://faeyekynudyzeotbjfsj.supabase.co/functions/v1/send-signup-notification',
  ...
);
```

**RDS NO soporta pg_net**. Deberás:
1. Eliminar el trigger que usa `pg_net`
2. Implementar la notificación via aplicación (después del signup exitoso)
3. O usar AWS Lambda + RDS Events como alternativa

---

## 3. Edge Functions (47 funciones)

### Arquitectura Actual
El proyecto tiene **64 edge functions** desplegadas en Supabase Edge Runtime (basado en Deno):

```
Categorías principales:
- Transcripción: transcribe, transcribe-with-deepgram, speaker-diarization*
- TTS/Audio: tts, generate-ad-audio, voice-cloning
- Video Analysis: twelve-labs-*, video-analysis-*, enhanced-video-analysis
- Pagos: stripe-webhook, create-checkout, customer-portal
- AI: google-gemini, huggingface-ai, axessible-ai-command
- Storage: generate-r2-upload-url, complete-r2-upload
```

### Opciones de Migración

| Opción | Complejidad | Costo | Ventajas |
|--------|-------------|-------|----------|
| **Deno Deploy** | Media | Bajo ($10-50/mes) | Compatibilidad 100% con código actual |
| **AWS Lambda + Docker** | Alta | Variable | Integración nativa con RDS |
| **Self-hosted Supabase Edge Runtime** | Media-Alta | Bajo | Control total |
| **Cloudflare Workers** | Alta | Bajo | Edge global |

### Recomendación
Usar **Deno Deploy** o el **Edge Runtime self-hosted de Supabase** para minimizar reescritura de código. Todas las funciones usan:
```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
```

---

## 4. Supabase Storage

### Uso Actual
- Bucket `videos`: almacenamiento de videos (público)
- Bucket `uploads`: archivos temporales
- Protocolo **TUS** para uploads resumables de archivos grandes

### Opciones de Reemplazo

```text
┌─────────────────────────────────────────────────────────────┐
│                    OPCIONES DE STORAGE                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Supabase Storage Self-Hosted + S3                        │
│    - Configurar STORAGE_BACKEND=s3 en docker-compose        │
│    - Apuntar a bucket S3/MinIO                              │
│    - Mantiene API compatible                                │
├─────────────────────────────────────────────────────────────┤
│ 2. AWS S3 Directo                                           │
│    - Reescribir uploads para usar AWS SDK                   │
│    - Perder TUS protocol (o implementar tus-server)         │
│    - Mayor cambio de código                                 │
├─────────────────────────────────────────────────────────────┤
│ 3. MinIO Self-Hosted                                        │
│    - API compatible con S3                                  │
│    - Puede usarse como backend de Supabase Storage          │
└─────────────────────────────────────────────────────────────┘
```

### Archivos que Requieren Cambios
```
src/components/UploadVideo.tsx       - TUS endpoint hardcodeado
src/components/UploadAccessible.tsx  - Storage URLs
src/lib/storage.ts                   - getPublicUrl hardcodeado
```

---

## 5. Autenticación (GoTrue)

### Configuración Requerida
El sistema de auth de Supabase (GoTrue) requiere:

```env
# Variables críticas para GoTrue
GOTRUE_JWT_SECRET=<tu-secreto-jwt-de-32+-caracteres>
GOTRUE_JWT_EXP=3600
GOTRUE_JWT_AUD=authenticated
GOTRUE_SITE_URL=https://tu-dominio.com
GOTRUE_EXTERNAL_EMAIL_ENABLED=true

# Para OAuth providers
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=...
GOTRUE_EXTERNAL_GOOGLE_SECRET=...
```

### JWT Token Compatibility
Los tokens JWT actuales incluyen:
```json
{
  "iss": "supabase",
  "ref": "faeyekynudyzeotbjfsj",
  "role": "anon",
  ...
}
```
**Deberás regenerar todos los tokens** con el nuevo `JWT_SECRET` de tu instalación.

---

## 6. Realtime (Subscripciones en Tiempo Real)

### Uso Actual
El proyecto usa Realtime para:
```typescript
// src/components/SynchronizedSignLanguagePlayer.tsx
supabase.channel(`asl_clips_${videoId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'sign_language_clips' }, ...)
```

### Requisitos para Self-Hosted
1. Configurar Realtime server con conexión a RDS
2. Habilitar `wal_level = logical` en RDS
3. Crear publication para las tablas necesarias:
```sql
CREATE PUBLICATION supabase_realtime FOR TABLE 
  sign_language_clips, 
  transcript_segments, 
  videos;
```

### Problema con RDS
RDS soporta `wal_level = logical`, pero debes:
- Usar un parameter group customizado
- Reiniciar la instancia después de cambiar el parámetro

---

## 7. Database Functions (50+ funciones)

### Funciones Críticas
| Función | Dependencia Externa |
|---------|---------------------|
| `handle_new_user_signup` | `pg_net` (HTTP calls) - **NO compatible RDS** |
| `track_video_processing_usage` | Ninguna |
| `check_rate_limit` | Ninguna |
| `validate_embed_access` | Ninguna |
| `has_role` | Ninguna |
| Funciones `gtrgm_*` | `pg_trgm` - ✅ Compatible |

### Warnings del Linter
```
- 1 ERROR: Security Definer View
- 13 WARN: Function Search Path Mutable
- 2 WARN: Extension in Public schema
```

---

## 8. Secrets y Variables de Entorno

### Total: 42 Variables Requeridas

```text
┌─────────────────────────────────────────────────────────────┐
│ CORE SUPABASE (3)                                           │
├─────────────────────────────────────────────────────────────┤
│ SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY  │
├─────────────────────────────────────────────────────────────┤
│ DATABASE (4)                                                │
├─────────────────────────────────────────────────────────────┤
│ DATABASE_URL, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB     │
├─────────────────────────────────────────────────────────────┤
│ JWT (2)                                                     │
├─────────────────────────────────────────────────────────────┤
│ JWT_SECRET, GOTRUE_JWT_SECRET                               │
├─────────────────────────────────────────────────────────────┤
│ AI SERVICES (10)                                            │
├─────────────────────────────────────────────────────────────┤
│ OPENAI_API_KEY, ASSEMBLYAI_API_KEY, DEEPGRAM_API_KEY,       │
│ TWELVELABS_API_KEY, GOOGLE_GEMINI_API_KEY, ELEVENLABS,      │
│ HUME_API_KEY, HUGGING_FACE_ACCESS_TOKEN, RUNWAYML, etc.     │
├─────────────────────────────────────────────────────────────┤
│ STORAGE (10)                                                │
├─────────────────────────────────────────────────────────────┤
│ AWS S3: ACCESS_KEY, SECRET, REGION, BUCKET                  │
│ Cloudflare R2: ACCESS_KEY, SECRET, ACCOUNT_ID, ENDPOINT     │
├─────────────────────────────────────────────────────────────┤
│ PAYMENTS (2)                                                │
├─────────────────────────────────────────────────────────────┤
│ STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Migraciones de Base de Datos

### Estado Actual
- **157 migraciones** en `supabase/migrations/`
- Esquema complejo con ~50+ tablas
- Múltiples funciones, triggers y políticas RLS

### Proceso de Exportación
```bash
# Exportar esquema completo
supabase db dump --db-url "postgres://..." -f schema.sql --schema public

# Exportar datos (si necesario)
pg_dump --data-only --format=custom -d postgres -f data.dump
```

### Problemas Potenciales con RDS
1. **Superuser operations**: Algunas migraciones pueden requerir permisos que RDS no otorga
2. **Extension installation**: Solo ciertas extensiones disponibles
3. **Schema auth**: Las tablas de `auth.users` son manejadas por GoTrue

---

## 10. Stripe Webhooks

### Configuración Actual
```typescript
// stripe-webhook/index.ts
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
```

### Cambios Necesarios
1. Actualizar webhook URL en Stripe Dashboard al nuevo endpoint
2. Regenerar `STRIPE_WEBHOOK_SECRET`
3. Actualizar `STRIPE_SECRET_KEY` si cambias de cuenta

---

## Plan de Migración Recomendado

### Fase 1: Preparación (1-2 semanas)
1. Parametrizar todas las URLs hardcodeadas
2. Crear archivo de configuración centralizado
3. Resolver dependencia de `pg_net` en triggers
4. Auditar y documentar todas las extensiones requeridas

### Fase 2: Infraestructura (1 semana)
1. Provisionar RDS PostgreSQL 15+ con:
   - `wal_level = logical`
   - Extensions: pgcrypto, uuid-ossp, pg_trgm
2. Desplegar Supabase Self-Hosted (docker-compose)
3. Configurar Storage con S3 backend
4. Desplegar Edge Runtime o Deno Deploy

### Fase 3: Migración de Datos (2-3 días)
1. Exportar esquema (sin datos de auth)
2. Migrar usuarios manualmente o via API
3. Migrar datos de aplicación
4. Migrar archivos de Storage a S3

### Fase 4: Testing (1 semana)
1. Validar autenticación
2. Probar uploads de video con TUS
3. Verificar edge functions
4. Probar Realtime subscriptions
5. Validar webhooks de Stripe

### Fase 5: Cutover
1. DNS switch
2. Actualizar Stripe webhooks
3. Monitorear errores

---

## Cambios de Código Prioritarios

### 1. Crear configuración centralizada
```typescript
// src/config/environment.ts
export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    storageUrl: import.meta.env.VITE_SUPABASE_STORAGE_URL || 
                `${import.meta.env.VITE_SUPABASE_URL}/storage/v1`,
    functionsUrl: import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`,
  }
};
```

### 2. Refactorizar cliente Supabase
```typescript
// src/integrations/supabase/client.ts
import { config } from '@/config/environment';

export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey,
  { ... }
);
```

### 3. Eliminar trigger con pg_net
```sql
-- Nueva migración para eliminar dependencia de pg_net
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_signup();

-- Mover lógica de notificación a la aplicación
```

---

## Resumen de Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| `pg_net` no disponible en RDS | 🔴 Alta | Mover lógica HTTP a aplicación |
| URLs hardcodeadas | 🟡 Media | Refactorizar con variables de entorno |
| Edge Functions runtime | 🟡 Media | Usar Deno Deploy o Edge Runtime self-hosted |
| Realtime WAL | 🟡 Media | Configurar RDS parameter group |
| Storage TUS protocol | 🟡 Media | Supabase Storage con S3 backend |
| JWT token migration | 🟢 Baja | Regenerar tokens al migrar |

---

## Próximos Pasos Sugeridos

1. **Inmediato**: Aprobar este plan para comenzar a parametrizar URLs
2. **Esta semana**: Crear archivo de configuración centralizado
3. **Próxima semana**: Eliminar dependencia de `pg_net`
4. **Mes 1**: Preparar infraestructura en VPS
5. **Mes 2**: Migración completa y testing
