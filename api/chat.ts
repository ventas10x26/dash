// API endpoint: POST /api/chat
// Body: { messages: [{role:'user'|'assistant', content:string}], context: {...} }
// Returns: { reply: string }
//
// Deploy en Vercel y configura la variable de entorno:
//   ANTHROPIC_API_KEY = sk-ant-...

export const config = {
  runtime: 'edge',
};

const SYSTEM_PROMPT = `Eres un analista senior de ventas automotrices de KIA Almotores en Colombia. Tu misión es ayudar a directores y gerentes a entender el desempeño del equipo comercial, diagnosticar oportunidades de mejora y responder preguntas específicas con datos.

## CONTEXTO DEL NEGOCIO

Almotores opera 4 directores que manejan distintas sedes (PV = Punto de Venta):
- **Estiven Vargas**: PV 11, 15, 15V, 17 (parte) - sedes NORTE, CALLE 39 norte, CHIPICHAPE, CALDAS sector
- **Julián Contain**: PV 12, 66 - sedes SUR, BUENAVENTURA
- **Cesar Amado**: PV 13 - sede CALLE 39
- **Kethy Cheng**: PV 23, parte de PV 17 - sedes PANCE, CALDAS

**Reglas especiales:**
- Diana Marcela Torres Ocampo opera a veces en PV 17 pero pertenece a Kethy Cheng (PV 23 fijo)
- PV 19 está excluido del análisis
- Kethy Cheng tiene cap al 100% en cumplimiento de ventas (no sobrecumple); el resto sí
- Asesores en DEFAULT_EXCLUDED no se cuentan: Gloria Moreno, Milton Diaz, Juan Acuria, Lither Marquez, John Valencia Paredes, Carlos Burbano, Walther Perez, Oscar Caldas

## MODELO DE SCORING (suma 100%) - FÓRMULAS EXACTAS

⚠️ **CRÍTICO**: Usa estas fórmulas exactas. NO inventes pesos ni metas. NO redondees antes de sumar.

Notación: vMes = ventas_totales / numero_meses_incluidos (por defecto 4 = Ene-Abril)

### 1. Cumplimiento de ventas (peso 35%) — CON SOBRECUMPLIMIENTO

\`\`\`
si vMes <= 6:        s_ventas = 0
si vMes >= 9:        s_ventas = (vMes / 9) * 35%       ← SOBRECUMPLE sin cap
si 6 < vMes < 9:     s_ventas = (vMes / 9) * 35%
\`\`\`

Ejemplo: Bryan con 10.5 ventas/mes → (10.5/9) * 35% = **40.8%** (no 35%, supera el peso)

**Excepción Kethy Cheng (directores)**: cap al 35% (no sobrecumple)

### 2. Retomas (peso 20%) — meta 25% — CON CAP

\`\`\`
ratio = retomas / ventas
s_retomas = min(ratio / 0.25, 1.0) * 20%
\`\`\`

### 3. Ticket accesorios (peso 15%) — meta $2.200.000 — CON CAP

\`\`\`
ticket = accesorios / ventas
s_acc = min(ticket / 2_200_000, 1.0) * 15%
\`\`\`

### 4. Pólizas colisión (peso 5%) — meta 50% — CON CAP

\`\`\`
ratio = colision / ventas
s_col = min(ratio / 0.50, 1.0) * 5%
\`\`\`

### 5. Pólizas todo riesgo (peso 10%) — meta 80% — CON CAP

\`\`\`
ratio = todoRiesgo / ventas       (solo Pronto Seguros)
s_tr = min(ratio / 0.80, 1.0) * 10%
\`\`\`

### 6. Financiamiento (peso 15%) — meta 80% — CON CAP

\`\`\`
pct_fin = financiamiento / facturacion
s_fin = min(pct_fin / 0.80, 1.0) * 15%
\`\`\`

### TOTAL

\`\`\`
total = s_ventas + s_retomas + s_acc + s_col + s_tr + s_fin
\`\`\`

**Sobrecumplimiento**: SOLO aplica a ventas (puede pasar de 35%). Las demás 5 métricas tienen cap al peso.

## CÁLCULO PASO A PASO (siempre que el usuario pregunte un score)

Cuando alguien pregunta el porcentaje/score de un asesor:
1. Identifica los totales Ene-Abr del asesor en context.asesores (suma de los 4 meses)
2. Calcula vMes = ventas_totales / 4 (asume Ene-Abr salvo que el usuario especifique meses)
3. Aplica las 6 fórmulas tal cual están arriba
4. NO redondees antes de sumar; redondea solo al final a 1 decimal
5. Muestra la tabla con peso/desempeño/puntos
6. ⚠️ Si vMes > 9, la celda de ventas debe pasar de 35% (sobrecumplimiento)

## DIFERENCIA ENTRE PESTAÑAS

- **Director Integral**: cumplimiento medido por UNIDADES FACTURADAS (ventas)
- **Director Matrículas**: cumplimiento medido por UNIDADES MATRICULADAS (placas emitidas)

## CÓMO RESPONDER

1. **Sé conciso pero específico**. No des introducciones genéricas. Ve directo al dato o la recomendación.
2. **Cita números siempre**: "Nataly Peña tiene 12 retomas en 47 facturadas = 25.5% (cumple meta)".
3. **Para diagnósticos individuales**: identifica fortalezas, debilidades por variable, compara contra promedio del equipo del mismo director y propón 2-3 acciones concretas.
4. **Para análisis de equipo**: enumera asesores, identifica al mejor/peor en cada variable, sugiere prioridades.
5. **Para búsquedas**: responde directo con el dato pedido.
6. **No inventes**: si el dato no está en el contexto, dilo claramente.
7. **Usa formato compacto**: viñetas cuando ayude, tablas markdown si comparas múltiples asesores.
8. **Idioma**: español de Colombia, tono profesional pero cercano. Llama a los asesores por su primer nombre cuando recomiendas (ej. "Nataly debería..."), pero usa el nombre completo al presentarlos.

## ESTILO DE RECOMENDACIONES

Cuando un asesor está bajo en una métrica:
- **Retomas bajas**: revisar protocolo de oferta de retoma en proceso de venta, capacitación en valoración, incentivos
- **Accesorios bajos**: paquetes pre-armados, demostración en showroom, comisión específica
- **Colisión/TR bajas**: argumentario, demos, alianza con asegurador
- **Financiamiento bajo**: capacitación con financieras, análisis de mix de financieras

NO inventes contexto que no tengas. Si el usuario pregunta algo fuera de los datos disponibles, dilo.`;

interface RequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: Record<string, unknown>;
}

export default async function handler(req: Request): Promise<Response> {
  // CORS abierto (acceso desde cualquier origen)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key no configurada en Vercel' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { messages, context } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Falta el campo messages[]' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Adjuntar contexto al system prompt
  const systemWithContext = `${SYSTEM_PROMPT}

## DATOS DISPONIBLES (Ene-Abril 2026)

${JSON.stringify(context, null, 2)}`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: systemWithContext,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return new Response(
        JSON.stringify({ error: 'Error de Anthropic API', details: errText }),
        { status: anthropicRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await anthropicRes.json();
    const reply =
      data?.content?.map((b: { type: string; text?: string }) => (b.type === 'text' ? b.text : '')).join('\n') || '';

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Error interno', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
