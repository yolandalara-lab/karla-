# karla-

Chat con Karla Zorola.

## Cómo correrlo

La API key de Anthropic **no** va en `index.html` (cualquiera que abra la
página podría verla). Se pasa al servidor como variable de entorno:

```bash
ANTHROPIC_API_KEY=sk-ant-... node server.js
```

Luego abre http://localhost:3000. Requiere Node 18 o superior.
