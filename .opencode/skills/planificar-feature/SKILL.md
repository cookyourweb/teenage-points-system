---
name: planificar-feature
description: Estructura el plan de una funcionalidad nueva antes de tocar código, respetando AGENTS.md. Usala cuando se pida planificar, diseñar o evaluar una feature.
---

## Cuándo usarla

Antes de implementar cualquier funcionalidad nueva o cambio de comportamiento.

## Pasos

1. **Problema**: qué necesidad del adolescente o de la familia resuelve. Si no hay una, pará y preguntá.
2. **Alcance**: qué entra y, sobre todo, qué NO entra.
3. **Capas afectadas**:
   - Frontend (`src/`): componentes, páginas, hooks.
   - Servicios (`src/services/`): única capa que toca datos.
   - Backend (`backend/`): solo si el dominio ya vive en Mongo.
4. **Archivos**: lista con qué cambia en cada uno.
5. **Tests primero**: qué test se escribe antes y qué aserción debe fallar.
6. **Casos límite**: familias con varios hijos, puntos negativos, tareas vencidas, sin conexión.
7. **Dudas para la dueña**: decisiones que no te tocan a vos.
8. **Docs**: qué cambia en `AGENTS.md` y `MEMORY.md`.

## Formato de salida

Plan en Markdown con esas 8 secciones, corto. Sin código de implementación.
