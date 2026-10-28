# Stack - Búsqueda Inteligente

Herramienta web para captar páginas que requieran soporte o rediseño total. Permite descubrir sitios, revisar indicios técnicos, priorizar oportunidades y preparar el contacto con sus responsables.

Desarrollada con **Next.js 16, React 19, TypeScript, Cheerio y Lucide**, y desplegada en **Vercel**.

[Abrir Stack](https://stack-busqueda-inteligente.vercel.app) · [Repositorio](https://github.com/ChemixX1/Stack-Busqueda-Inteligente) · [Licencia](LICENSE)

## Licencia y uso

Para instalar, ejecutar o integrar el proyecto, da una **estrella al repositorio original** y consérvala mientras lo utilices. Se permite el uso personal y comercial, así como modificar y distribuir el código, conservando la licencia y atribución. Los visitantes de una instancia web no necesitan dar una estrella. Consulta las condiciones completas en [LICENSE](LICENSE).

Es una licencia personalizada con condición de uso; no es MIT ni una licencia de código abierto aprobada por la OSI. Las dependencias conservan sus propias licencias.

## Abrir la plataforma

En Windows, abre `iniciar.cmd`. Si faltan las dependencias, las instala y arranca la aplicación. Mantén esa ventana abierta y entra a `http://localhost:3000`.

También puedes ejecutarla desde esta carpeta:

```bash
npm ci
npm run dev
```

Requiere Node.js 20.9 o superior y conexión a Internet; en producción se usa Node.js 24. La búsqueda básica no necesita una clave. Para limitar el servidor de desarrollo a tu equipo, ejecuta `npm run dev -- --hostname 127.0.0.1`.

## Uso

Al abrir la plataforma sin resultados guardados comienza una búsqueda mundial automática. Puedes elegir entre 249 países y territorios, un rubro y una ciudad o actividad opcional. El selector de países incluye búsqueda. No necesitas introducir direcciones web.

La cobertura incluye negocios, servicios digitales y SaaS, tiendas, medios y blogs, comunidades, videojuegos, streaming, lectura de manga y cómics, educación, organizaciones y otros sectores. Puedes introducir una actividad concreta para buscar nichos adicionales. «Todos los rubros» alterna categorías e idiomas; la cobertura depende de los índices y límites de los proveedores y no constituye un inventario completo de internet.

Cada búsqueda recorre hasta seis tandas y revisa hasta ocho candidatos por tanda. «Buscar más webs» continúa desde la siguiente consulta para esos criterios, con hasta 60 variantes. La búsqueda mundial rota idiomas y mercados para reducir el sesgo geográfico del proveedor. Los resultados aparecen progresivamente y se eliminan dominios repetidos. Las revisiones recientes del nuevo motor se reutilizan durante 24 horas. Puedes detener el proceso conservando las fichas recibidas. Si un proveedor falla, se conservan sus resultados parciales y se informa del error real.

La pantalla contiene búsqueda, filtros, tarjetas/lista de webs y guardados. Cada ficha abre una página `/web/[id]`, con imagen y datos del negocio a la izquierda y hallazgos, contactos y seguimiento a la derecha. En móvil las columnas se apilan. El espacio de trabajo se conserva al navegar: volver no reinicia consultas, filtros, vista ni búsquedas en curso. Los resultados y guardados persisten en el navegador; los filtros y la posición se recuerdan durante la sesión. Las fichas dependen de la caché de ese navegador o de una importación JSON. «Actualizar análisis» permite revisar explícitamente una web de nuevo. La imagen, cuando existe, es la publicada por el sitio; no es una captura de su diseño.

Los contactos abren un mensaje editable en WhatsApp o correo. El envío lo realizas tú. Los borradores pueden adaptarse al idioma detectado del sitio. Cuando no hay una plantilla local, la traducción utiliza un servicio externo y puede no estar disponible. Los guardados, las notas, los criterios de búsqueda y los resultados se conservan en el navegador. Usa exportación JSON para respaldar o trasladar fichas y CSV para trabajar con los contactos.

El inicio móvil conserva una cuadrícula de dos columnas con portada y título. La ficha mantiene la prioridad a la derecha del título. El botón de GitHub enlaza a este repositorio y consulta su número de estrellas.

## Búsqueda y mediciones

La búsqueda pública integrada usa DuckDuckGo y un respaldo de Bing. Estos servicios pueden limitar las consultas o devolver pocos resultados. Si hay una clave de Brave configurada, también se puede usar ese proveedor. No se crean negocios ficticios cuando falla una búsqueda.

La revisión consulta el HTML público de la página encontrada y recorre enlaces del mismo sitio: contacto, nosotros, soporte, servicios, productos y otras secciones. Si empieza en una página interna, también intenta consultar el inicio. Sigue hasta dos niveles, con un máximo de diez páginas y doce segundos de exploración adicional, con tres solicitudes simultáneas. Es una muestra acotada de las secciones accesibles; no garantiza revisar todas las URL de una web grande ni ejecuta JavaScript.

Cada página recibida se analiza para detectar saturación de contenido, enlaces excesivos, jerarquía de títulos, párrafos extensos o repetidos, texto genérico, DOM complejo, scripts bloqueantes, carga inicial, adaptación móvil, accesibilidad y señales de seguridad. La prioridad global combina los hallazgos de todas las páginas evaluables: cada tipo de problema cuenta una vez con el mayor peso observado y se mantienen los límites por categoría. La ficha muestra páginas revisadas, puntuaciones individuales y fuentes de los hallazgos. Los recuentos globales suman las páginas, por lo que pueden incluir elementos compartidos; la respuesta inicial y PageSpeed corresponden a la página de entrada.

Los contactos se reúnen de las páginas revisadas y conservan su fuente. No encontrar contactos no demuestra que el sitio carezca de ellos. Las fichas anteriores siguen disponibles; se vuelven a analizar al encontrarlas en una búsqueda y también pueden renovarse con «Actualizar análisis».

Se excluyen contenido oculto y plantillas cuando son identificables. Las metadescripciones repetitivas no se usan como resumen del negocio. No se mide scroll real ni se confirman defectos visuales sin renderizar la página. Un bloqueo o error de conexión queda sin puntuación y no se interpreta como necesidad de rediseño; los fallos de páginas internas se informan como límites de cobertura.

La prioridad de 0 a 100 ordena indicios técnicos: no es una calificación estética ni garantiza que el negocio necesite una reestructuración. Conviene abrir las webs priorizadas antes de preparar una propuesta. Los filtros geográficos y de actividad orientan el descubrimiento; no certifican el domicilio del negocio.

Opcionalmente, copia `.env.example` a `.env.local`:

| Variable | Función |
| --- | --- |
| `BRAVE_SEARCH_API_KEY` | Proveedor adicional de búsqueda. La búsqueda pública funciona sin esta clave. |
| `PAGESPEED_API_KEY` | Pruebas móviles opcionales de PageSpeed Insights. |
| `NEXT_PUBLIC_SITE_URL` | URL canónica para metadatos y sitemap. En Vercel se detecta la URL de producción cuando no está definida. |

Reinicia el servidor al cambiar variables. Las claves solo se leen en el servidor.

## SEO

El título es **Stack - Búsqueda Inteligente**. La descripción, Open Graph y Twitter se generan en el servidor en el idioma detectado a partir del país o las preferencias del navegador, con traducciones locales y una descripción de respaldo. La estructura y el idioma de la interfaz no cambian por esta adaptación.

Se incluyen URL canónica, datos estructurados, imagen social, manifiesto, `robots.txt` y `sitemap.xml`. Las fichas recuperadas desde el navegador no se indexan. El buscador decide el idioma y texto final de sus fragmentos; cambiar los metadatos no garantiza que Google muestre una descripción específica por país. No se anuncian versiones `hreflang` de contenido que no esté traducido.

La portada permite indexación y contiene el nombre completo y una explicación visible del producto en el HTML inicial. Para comprobar por qué no aparece en Google, verifica la propiedad en [Google Search Console](https://search.google.com/search-console), envía `https://stack-busqueda-inteligente.vercel.app/sitemap.xml` e inspecciona la URL de inicio para solicitar su indexación. Este paso requiere acceso a la propiedad. [Google indica](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl) que el rastreo puede tardar días o semanas y que solicitarlo no garantiza aparecer en resultados.

## Publicar en Vercel

Configura el proyecto como Next.js, instala con `npm ci` y compila con `npm run build`. Para actualizar la instancia vinculada desde esta carpeta:

```bash
npx vercel deploy --prod
```

Los secretos, `node_modules`, `.next`, `.vercel`, los registros, exportaciones y archivos de comprobación están excluidos del repositorio. La aplicación usa almacenamiento del navegador: los datos locales y los del dominio público son independientes.

## Buscar desde la terminal

El script utiliza el mismo buscador y auditor que la interfaz. Funciona aunque la plataforma no esté abierta, carga `.env.local` y genera fichas JSON importables:

```bash
npm run scan
npm run scan -- --query "restaurantes Lima" --country PE --category "Restaurantes"
npm run scan -- --category "Turismo y hoteles" --rounds 3 --limit 12 --out exports/hoteles.json
npm run scan -- --help
```

`--rounds` establece hasta 10 tandas de descubrimiento y `--limit` hasta 12 webs únicas por ejecución. El script termina al reunir el límite o agotar las tandas. Conserva resultados parciales y escribe fallos en un archivo `.errors.json`. No sobrescribe exportaciones. La opción `--base-url http://localhost:3000` permite usar una instancia en ejecución en vez del motor directo.

## API local

| Ruta | Uso |
| --- | --- |
| `GET /api/config` | Disponibilidad y nombres de proveedores, sin claves. |
| `POST /api/search` | `{ "query": "", "country": "PE", "category": "Todos los rubros", "limit": 6, "offset": 0 }` |
| `POST /api/audit` | `{ "url": "https://negocio.com", "country": "PE", "category": "Otros", "usePageSpeed": false }` |
| `POST /api/translate` | `{ "text": "Texto en español", "target": "en" }` |

La revisión valida los destinos y las redirecciones, rechaza direcciones privadas y limita el tiempo y tamaño de descarga. La interfaz distribuye las solicitudes para respetar los límites locales de búsqueda y revisión.

## Comprobar

```bash
npm test
npm run build
npm start
```

Las pruebas automáticas verifican descubrimiento, extracción y puntuación con respuestas controladas, validación de direcciones, importación/exportación y ejecución del script.
