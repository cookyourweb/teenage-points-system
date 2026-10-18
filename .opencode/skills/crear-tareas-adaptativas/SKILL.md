---
name: crear-tareas-adaptativas
description: Diseña tareas que se adaptan a la edad, el ritmo y el historial del adolescente. Usala cuando una feature cree, sugiera o ajuste tareas y su dificultad.
---

## Cuándo usarla

Cuando se crean tareas nuevas, plantillas o lógica que ajusta dificultad, frecuencia o puntos.

## Principios

- **Zona de desarrollo próximo**: ni tan fácil que aburra, ni tan difícil que frustre.
- **Tareas pequeñas y concretas**: "ordenar el escritorio" mejor que "ordenar la habitación".
- **Adaptación explicable**: si la tarea cambia, el adolescente y la familia saben por qué.

## Pasos

1. Definí el modelo de tarea: título, descripción, puntos, frecuencia, dificultad, edad mínima.
2. Elegí las señales de adaptación: tasa de cumplimiento, tareas vencidas, feedback del adolescente.
3. Reglas de ajuste simples y testeables (ej.: 3 vencidas seguidas → proponer dividir la tarea).
4. Extraé la regla a una función pura y escribí su test primero.
5. Ubicación: tareas personalizadas viven en Mongo, se acceden vía `customTaskService.ts`.

## Antipatrones

- Subir dificultad automáticamente sin avisar.
- Bajar puntos como castigo encubierto.
- Lógica de adaptación dentro de componentes de UI.
