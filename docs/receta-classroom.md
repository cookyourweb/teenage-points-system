# Receta de Classroom

## 1. Para qué y cuándo

Todos los días, desde Chrome con la sesión que ve las clases de Leo, se le pide a Claude in Chrome que lea Classroom y escriba una lista con un formato fijo (`DEBERES v1`). Esa lista se pega en la app, que la importa sin duplicar nada.

Si hace falta guardar la pegada real, se guarda como `algo.pegada.txt`: git ignora `*.pegada.txt`, así que nunca se sube. Este repo es público: aquí solo hay datos ficticios.

## 2. El prompt exacto

Se pega tal cual en Claude in Chrome: el bloque ya lleva dentro la gramática y el ejemplo, no hace falta pegar nada más. (La gramática y el ejemplo se repiten fuera, en las secciones 3 y 4, para leerlos con calma; el test de la app lee el bloque `text` de la sección 4.)

````markdown
Eres un lector de solo lectura de Google Classroom. Nunca pulses «Entregar», «Marcar como completada», «Continuar», «Aceptar», ni escribas comentarios. Si una página lo pide, para y escribe una línea DUDA.

Hoy es la fecha actual que conozcas o veas en pantalla; escríbela mentalmente como aaaa-mm-dd y úsala para la ventana.

Recorre cada clase (Tablón y Trabajo de clase). Ventana: desde hace 7 días contando desde hoy y todo lo futuro, más lo atrasado y lo sin fecha. El material sin fecha entra si su examen entra.

Saca cuatro bloques:
- EXAMEN: qué entra (temas, páginas y la frase literal del profesor entre comillas).
- ENTREGA: estado y si hay que imprimir.
- MATERIAL: archivos, vídeos y enlaces por tema, con el enlace del examen al que sirve.
- AVISO: del tablón, que no son tareas.

Cada línea lleva el enlace propio del elemento en Classroom, nunca la portada.
Lo que no esté claro, como DUDA, nunca inventado. No escribas nombres de profesores.
No uses | dentro de un campo (cámbialo por /). Una línea por elemento.
Termina con una línea COBERTURA por asignatura, aunque sea con ceros.

Responde solo con el formato DEBERES v1, sin explicaciones antes ni después:
- Primera línea: === DEBERES v1 === (lo anterior se ignora). Última línea: === FIN === (lo posterior se ignora). Una línea que empiece por # es un comentario.
- Elemento (9 columnas separadas por |): TIPO | ASIGNATURA | FECHA | TÍTULO | ENLACE | DETALLE | ESTADO | IMPRIMIR | EXAMEN
- Cobertura (7 columnas): COBERTURA | ASIGNATURA | exámenes | entregas | material | avisos | dudas (enteros)
- TIPO: EXAMEN, ENTREGA, MATERIAL, AVISO, DUDA.
- FECHA: aaaa-mm-dd o vacía (sin fecha). Examen = día del examen; entrega = fecha límite; aviso = día publicado.
- ENLACE: obligatorio salvo en DUDA. EXAMEN/ENTREGA/AVISO = la ficha de Classroom; MATERIAL = el archivo o vídeo.
- ESTADO (solo ENTREGA): PENDIENTE, ENTREGADA o ATRASADA. IMPRIMIR (solo ENTREGA): SI o NO.
- EXAMEN (solo MATERIAL): el ENLACE del examen al que sirve, o vacío.
- Las columnas que no tocan a ese tipo, vacías (pero siempre las 9 columnas).

Ejemplo del formato (datos inventados, no los copies):

=== DEBERES v1 ===
# TIPO | ASIGNATURA | FECHA | TÍTULO | ENLACE | DETALLE | ESTADO | IMPRIMIR | EXAMEN
EXAMEN | Matemáticas | 2027-03-15 | Examen del tema 4 | https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details | Tema 4, páginas 60-75. "Entra todo lo de fracciones" | | |
ENTREGA | Lengua | 2027-03-10 | Redacción sobre el invierno | https://classroom.google.com/c/EJEMPLO3/a/EJEMPLO4/details | 200 palabras | PENDIENTE | SI |
MATERIAL | Matemáticas | | Vídeo de fracciones | https://www.youtube.com/watch?v=EJEMPLO5 | Repaso del tema 4 | | | https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details
AVISO | Ciencias | 2027-03-08 | Traer bata al laboratorio | https://classroom.google.com/c/EJEMPLO6/p/EJEMPLO7 | El jueves hay práctica | | |
DUDA | Inglés | | | | Habla de un examen "la semana que viene" sin fecha | | |
COBERTURA | Matemáticas | 1 | 0 | 1 | 0 | 0
COBERTURA | Lengua | 0 | 1 | 0 | 0 | 0
COBERTURA | Ciencias | 0 | 0 | 0 | 1 | 0
COBERTURA | Inglés | 0 | 0 | 0 | 0 | 1
=== FIN ===
````

## 3. La gramática

| Línea | Columnas (separadas por `\|`) |
|---|---|
| Cabecera | `=== DEBERES v1 ===` (lo anterior se ignora) |
| Comentario | empieza por `#` |
| Elemento (9) | `TIPO \| ASIGNATURA \| FECHA \| TÍTULO \| ENLACE \| DETALLE \| ESTADO \| IMPRIMIR \| EXAMEN` |
| Cobertura (7) | `COBERTURA \| ASIGNATURA \| exámenes \| entregas \| material \| avisos \| dudas` (enteros) |
| Fin | `=== FIN ===` (lo posterior se ignora) |

- `TIPO`: `EXAMEN`, `ENTREGA`, `MATERIAL`, `AVISO`, `DUDA`.
- `FECHA`: `aaaa-mm-dd` o vacía (sin fecha). Examen = día del examen; entrega = fecha límite; aviso = día publicado.
- `ENLACE`: obligatorio y seguro salvo en `DUDA`. `EXAMEN`/`ENTREGA`/`AVISO` = la ficha de Classroom; `MATERIAL` = el archivo o vídeo.
- `ESTADO` (solo `ENTREGA`): `PENDIENTE`, `ENTREGADA` o `ATRASADA`. `IMPRIMIR` (solo `ENTREGA`): `SI` o `NO`.
- `EXAMEN` (solo `MATERIAL`): el `ENLACE` del examen al que sirve, o vacío.
- Columnas que no tocan a ese tipo, vacías.

## 4. Ejemplo

Ficticio: es el que lee el test de la app.

```text
=== DEBERES v1 ===
# TIPO | ASIGNATURA | FECHA | TÍTULO | ENLACE | DETALLE | ESTADO | IMPRIMIR | EXAMEN
EXAMEN | Matemáticas | 2027-03-15 | Examen del tema 4 | https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details | Tema 4, páginas 60-75. "Entra todo lo de fracciones" | | |
ENTREGA | Lengua | 2027-03-10 | Redacción sobre el invierno | https://classroom.google.com/c/EJEMPLO3/a/EJEMPLO4/details | 200 palabras | PENDIENTE | SI |
MATERIAL | Matemáticas | | Vídeo de fracciones | https://www.youtube.com/watch?v=EJEMPLO5 | Repaso del tema 4 | | | https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details
AVISO | Ciencias | 2027-03-08 | Traer bata al laboratorio | https://classroom.google.com/c/EJEMPLO6/p/EJEMPLO7 | El jueves hay práctica | | |
DUDA | Inglés | | | | Habla de un examen "la semana que viene" sin fecha | | |
COBERTURA | Matemáticas | 1 | 0 | 1 | 0 | 0
COBERTURA | Lengua | 0 | 1 | 0 | 0 | 0
COBERTURA | Ciencias | 0 | 0 | 0 | 1 | 0
COBERTURA | Inglés | 0 | 0 | 0 | 0 | 1
=== FIN ===
```

## 5. Versiones

Si cambia el formato, se sube a `v2` y la app sigue leyendo `v1` mientras haga falta.
