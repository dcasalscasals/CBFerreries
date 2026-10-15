# CB Ferreries · Calendario y resultados

Web adaptable a móvil con horarios y resultados de los equipos del CB Ferreries, filtrables por categoría/equipo y mes. También incluye FERREDELLA (equipo/10594), cuya ficha figura en CB Ciutadella y que se incorpora por indicación del club.

## Publicar en Vercel

Importa este proyecto desde GitHub en Vercel o sube la carpeta completa con Vercel CLI. No necesita dependencias ni comando de compilación. Vercel servirá `index.html` y `assets/` como web estática y ejecutará `api/matches.js` como función de servidor.

No publiques únicamente `index.html`: la carpeta `api/` es necesaria para consultar FBIB. No hacen falta variables de entorno.

## Actualización automática

La función consulta los calendarios mensuales públicos de FBIB para el club 147 y FERREDELLA 10594, normaliza partidos y marcadores y evita duplicados. La página vuelve a consultar cada cinco minutos y muestra la hora de la última actualización. Si FBIB no responde, conserva en ese navegador los últimos datos recibidos y lo indica en pantalla.

La fuente es la API pública que usa la propia web de FBIB. Si FBIB cambia esa interfaz o limita su acceso, habrá que ajustar `api/matches.js`.

## Fuentes

- [CB Ferreries · FBIB](https://www.fbib.es/club/147)
- [FERREDELLA · FBIB](https://www.fbib.es/equipo/10594)
- Colores tomados del PDF de paleta y logotipo original en PNG facilitado en la carpeta del proyecto.
