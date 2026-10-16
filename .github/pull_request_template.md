<!-- El cuerpo mínimo lo dicta AGENTS.md: los cuatro bloques de abajo no
     son opcionales. La línea "Tests:" obliga a decidir el testeo con
     conciencia: o el fichero de tests, o el por qué no aplica. -->

## Qué sube

Un bloque por commit (con su hash corto):
- **Qué estaba roto / qué faltaba** — con la evidencia (`fichero:línea`, o una
  tabla si el PR compara dos situaciones).
- **Qué hace el cambio** para resolverlo.
- Si algo que se afirmó antes era falso, se corrige **dentro de este PR**, a la
  vista, con `corrección a PR anterior: #<n>`.

## Lo que esto NO hace

Lo que explícitamente queda fuera de este PR (ejemplo real: «esto NO abre la
función X; abrirla es una decisión aparte»).

## Lo medido antes de abrir este PR

- `npm run lint`: 0 problemas
- `npm run typecheck`: 0 errores (`tsc -b`)
- `npx vitest run`: N de 296 tests en verde (listá los ficheros que tocaste)
- `npm run build` (y del back: `./mvnw test` desde `backend/`): exit 0
- Diferencias main/develop si aplica
- Prueba local con las tres piezas (Mongo + backend + frontend si corresponde)

## Límites declarados

- Lo que NO se probó, o se probó solo localmente (no hay staging en este repo).
- La deuda que sigue abierta y a quién le toca.

Tests: `<fichero añadido>` | no aplica porque `...`

---

## Checklist

- [ ] `npm run lint` en 0
- [ ] `npm run typecheck` limpio
- [ ] `npx vitest run` en verde (o declaré por qué no aplica)
- [ ] `npm run build` exit 0
- [ ] Si toqué `backend/`: `./mvnw test` en verde
- [ ] Sin claves, tokens ni datos personales versionados (repo público)
- [ ] `MEMORY.md` actualizado (estado, decisiones, errores a evitar, próximos pasos)
- [ ] Lo medido comparado con el antes: no sale peor

## Capturas / Notas para el reviewer

(notas que ayuden a revisar: qué mirar primero, dónde cambiaría)
