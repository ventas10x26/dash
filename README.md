# Almotores Bot — Backend del asistente IA

Backend mínimo en Vercel que expone `POST /api/chat` y reenvía la pregunta a la API de Anthropic con el system prompt + contexto del tablero.

## Deploy paso a paso (5 minutos)

### 1. Crear repo en GitHub
```bash
cd almotores-bot
git init
git add .
git commit -m "Initial commit"
gh repo create almotores-bot --public --source=. --push
```
Si no tienes `gh`, créalo desde github.com/new y push manual:
```bash
git remote add origin https://github.com/TU-USUARIO/almotores-bot.git
git branch -M main
git push -u origin main
```

### 2. Deploy en Vercel
- Ve a https://vercel.com/new
- "Import Git Repository" → selecciona `almotores-bot`
- Framework Preset: **Other** (no toques nada más)
- Click **Deploy**

### 3. Configurar API key (CRÍTICO)
- En Vercel, abre el proyecto recién creado
- **Settings → Environment Variables**
- Add new:
  - Key: `ANTHROPIC_API_KEY`
  - Value: `sk-ant-...` (tu key real)
  - Environments: marca **Production**, **Preview** y **Development**
- Save
- **Deployments → ... → Redeploy** (para que tome la variable)

### 4. Probar
Tu endpoint quedará en: `https://almotores-bot-xxx.vercel.app/api/chat`

Prueba rápida desde terminal:
```bash
curl -X POST https://almotores-bot-xxx.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hola"}],"context":{}}'
```

### 5. Conectar al tablero HTML
- Abre `tablero-almotores-unificado.html`
- Busca la constante `BOT_ENDPOINT` (cerca del inicio del script del bot)
- Reemplázala con tu URL real: `https://almotores-bot-xxx.vercel.app/api/chat`
- Guarda y recarga el tablero

## Costos esperados
- **Vercel**: gratis (free tier, sobra)
- **Anthropic**: ~$0.01 a $0.03 USD por pregunta
  - 100 preguntas/mes ≈ $2 USD
  - 1.000 preguntas/mes ≈ $20 USD

## Seguridad
- ✅ La API key vive solo en Vercel (no en el HTML, no en GitHub)
- ✅ CORS abierto (puedes usar el HTML desde cualquier ubicación)
- ⚠️ Cualquiera con la URL del endpoint puede consumirlo. Si te preocupa el costo descontrolado, configura un budget alert en console.anthropic.com.

## Modificar el system prompt
Edita `api/chat.ts` → constante `SYSTEM_PROMPT`. Cada push a `main` redeploya automáticamente.
