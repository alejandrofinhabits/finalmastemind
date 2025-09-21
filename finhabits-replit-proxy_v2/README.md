
# Finhabits – Content Wizard (Replit)

## Secrets (Replit → Tools → Secrets)
- `N8N_WEBHOOK_URL` = `https://<tu-instancia>.n8n.cloud/webhook/content-intake`
- `N8N_TOKEN` = mismo que en n8n (Settings → Variables)

Run → abre la UI → llena y envía.

## Framework SEO + OpenAI

Completa el formulario “Framework Finhabits – Artículo SEO” para generar automáticamente un artículo siguiendo la estructura aprobada. Necesitas definir en Secrets:

- `OPENAI_API_KEY`

El servidor construye el prompt y llama directamente a OpenAI para devolver:

1. El artículo completo listo para revisar/publicar.
2. El prompt utilizado (visible para copiar/iterar).

El panel superior muestra si el API key y el webhook están configurados.
