<p align="center">
  <img src="docs/shipproof.svg" alt="ShipProof — comprueba antes de publicar" width="620">
</p>

<p align="center">
  Comprobaciones sin configuración para saber si un proyecto creado con ayuda de IA está listo para publicarse.
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
npx github:CalvaryBloom/shipproof
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
npx github:CalvaryBloom/shipproof

# Analizar otro directorio
npx github:CalvaryBloom/shipproof ./mi-proyecto

# Generar un informe JSON
npx github:CalvaryBloom/shipproof --json

# Informar sin devolver un código de error
npx github:CalvaryBloom/shipproof --no-fail
```

Por defecto, ShipProof termina con código `1` si encuentra al menos un problema bloqueante y con código `2` cuando la entrada no es válida. Los avisos reducen la puntuación, pero no cambian el código de salida.

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

- Acción de GitHub con un resumen compacto para cada pull request.
- Umbrales configurables mediante `shipproof.config.json`.
- Comprobaciones más profundas para Python, Rust y Go.
- Salida SARIF compatible con el análisis de código de GitHub.
- Catálogo público de comprobaciones y falsos positivos conocidos.
- Publicación en npm con procedencia verificable después de recibir las primeras opiniones.

## Colaborar

Las contribuciones son bienvenidas. Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de proponer una nueva comprobación. Los cambios deben ser deterministas, locales, seguros y transparentes acerca de sus posibles falsos positivos.

Comunica cualquier vulnerabilidad mediante el [sistema privado de GitHub](https://github.com/CalvaryBloom/shipproof/security/advisories/new), nunca en una incidencia pública.

## Licencia

[MIT](LICENSE) © 2026 CalvaryBloom
