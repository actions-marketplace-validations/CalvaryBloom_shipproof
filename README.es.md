<p align="center">
  <img src="docs/shipproof.svg" alt="ShipProof — comprueba antes de publicar" width="620">
</p>

<p align="center">
  Comprobaciones sin configuración para saber si un proyecto creado con ayuda de IA está listo para publicarse.
</p>

<p align="center">
  <a href="https://github.com/CalvaryBloom/shipproof/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/CalvaryBloom/shipproof/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://www.npmjs.com/package/shipproof"><img alt="versión en npm" src="https://img.shields.io/npm/v/shipproof?logo=npm&color=cb3837"></a>
  <a href="https://www.npmjs.com/package/shipproof"><img alt="descargas en npm" src="https://img.shields.io/npm/dm/shipproof?logo=npm"></a>
  <a href="LICENSE"><img alt="Licencia MIT" src="https://img.shields.io/badge/license-MIT-22c55e"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · Español
</p>

ShipProof da a tu proyecto una puntuación clara y explica qué debes corregir antes de hacerlo público. Funciona localmente, ofrece resultados deterministas y busca esos detalles poco vistosos que suelen quedar pendientes en el código generado con IA.

<p align="center">
  <img src="docs/demo.svg" alt="Terminal de ShipProof mostrando una puntuación de preparación de 92 sobre 100" width="860">
</p>

## ¿Por qué ShipProof?

La IA puede generar una aplicación convincente en pocos minutos. Eso no significa que esté lista para usuarios o colaboradores: las pruebas pueden ser simuladas, puede haber credenciales en un archivo de entorno, las instalaciones quizá no sean reproducibles y el repositorio puede carecer de licencia o política de seguridad.

ShipProof convierte esa revisión final imprecisa en un comando repetible:

```bash
npx shipproof
```

Actualmente reconoce proyectos Node.js, Python, Rust y Go. Nunca ejecuta comandos del proyecto inspeccionado ni sube su código fuente.

## Qué comprueba

| Área | Ejemplos |
| --- | --- |
| Proyecto | Manifiestos reconocidos y metadatos válidos |
| Calidad | Comandos de pruebas, lint, tipos y compilación |
| Reproducibilidad | Archivos de bloqueo y dependencias fijadas |
| Seguridad | Nombres de archivo sensibles y patrones conservadores de credenciales |
| Documentación | README, licencia e instrucciones para colaborar |
| Automatización | Flujos de GitHub Actions |
| Comunidad | Normas de conducta, contribución y seguridad |

El resultado indica dónde está el posible problema sin mostrar el valor de una credencial. ShipProof es una comprobación previa, no sustituye a un escáner de seguridad especializado ni a la revisión humana.

## Uso

Requiere Node.js 22.13 o posterior.

```bash
# Analizar el directorio actual
npx shipproof

# Analizar otro directorio
npx shipproof ./mi-proyecto

# Generar un informe JSON
npx shipproof --json

# Generar SARIF 2.1.0 para el análisis de código
npx shipproof --sarif --no-fail > shipproof.sarif

# Informar sin devolver un código de error
npx shipproof --no-fail
```

### Opciones

```text
shipproof [ruta] [opciones]

--json        Genera JSON legible por máquinas
--sarif       Genera SARIF 2.1.0 para el análisis de código
--no-color    Desactiva los colores ANSI
--no-fail     Termina con código 0 aunque haya problemas bloqueantes
-h, --help    Muestra la ayuda
-v, --version
              Muestra la versión
```

Por defecto, ShipProof termina con código `1` si encuentra al menos un problema bloqueante y con código `2` cuando la entrada no es válida. Los avisos reducen la puntuación, pero no cambian el código de salida.

## GitHub Action

Añade ShipProof a tus pull requests sin instalar ni configurar nada en el repositorio:

```yaml
name: ShipProof

on: pull_request

permissions:
  contents: read

jobs:
  readiness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: CalvaryBloom/shipproof@v0.2.0
        id: shipproof
```

La acción añade al resumen del workflow la puntuación y los hallazgos que requieren atención. Por defecto falla si encuentra un problema bloqueante; usa `fail-on-issues: false` para obtener solo un informe. Los pasos posteriores pueden consultar los outputs `score`, `readiness`, `warnings` y `failed`.

## Análisis de código en GitHub

ShipProof puede generar SARIF 2.1.0 para mostrar sus avisos y fallos en la interfaz de análisis de código de GitHub. Las comprobaciones correctas e informativas permanecen en el catálogo de reglas SARIF sin crear alertas.

```yaml
name: ShipProof code scanning

on:
  push:
    branches: [main]

permissions:
  contents: read
  security-events: write

jobs:
  shipproof:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Generar el informe SARIF de ShipProof
        run: npx shipproof --sarif --no-fail > shipproof.sarif
      - name: Subir los resultados de ShipProof
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: shipproof.sarif
          category: shipproof
```

`--no-fail` permite ejecutar el paso de subida aunque ShipProof encuentre un problema bloqueante; los hallazgos siguen registrándose como alertas. Cada alerta usa una ubicación relativa al repositorio y nunca incluye el valor de un posible secreto.

## Puntuación

Cada comprobación aplicable tiene un peso explícito. Un resultado correcto obtiene todo el peso, un aviso obtiene la mitad y un fallo no obtiene puntos.

| Puntuación | Significado |
| ---: | --- |
| 90–100 | Listo para publicar |
| 75–89 | Casi listo |
| 50–74 | Necesita trabajo |
| 0–49 | No está listo |

La puntuación es explicable, pero no garantiza que el software sea correcto o seguro.

## Desarrollo local

```bash
git clone https://github.com/CalvaryBloom/shipproof.git
cd shipproof
pnpm install
pnpm test
node dist/src/cli.js . --no-fail
```

ShipProof no tiene dependencias en tiempo de ejecución. TypeScript y las declaraciones de Node.js solo se usan durante el desarrollo.

## Próximos objetivos

- Umbrales configurables mediante `shipproof.config.json`.
- Comprobaciones más profundas para Python, Rust y Go.
- Comentarios opcionales en pull requests con la evolución de la puntuación.
- Catálogo público de comprobaciones y falsos positivos conocidos.
- Publicación automatizada y con procedencia verificable para las próximas versiones.

## Colaborar

Las contribuciones son bienvenidas. Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de proponer una nueva comprobación. Los cambios deben ser deterministas, locales, seguros y transparentes acerca de sus posibles falsos positivos.

Comunica cualquier vulnerabilidad mediante el [sistema privado de GitHub](https://github.com/CalvaryBloom/shipproof/security/advisories/new), nunca en una incidencia pública.

## Licencia

[MIT](LICENSE) © 2026 CalvaryBloom
