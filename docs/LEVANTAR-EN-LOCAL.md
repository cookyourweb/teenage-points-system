# Levantar el proyecto en local

Son **tres piezas**, y la aplicación no funciona entera con menos. Si solo
levantas el frontend, todo se ve pero **crear tareas no guarda**: el formulario
envía y no pasa nada.

| Pieza | Puerto | Sin ella |
|---|---|---|
| MongoDB | 27017 | el backend arranca pero no guarda |
| Backend Spring Boot | 8080 | las tareas personalizadas no cargan ni se crean |
| Frontend Vite | 5173 | no hay aplicación |

---

## 1. MongoDB

En esta máquina **no hay `mongod` instalado**. Se levanta con Docker, que no
deja nada instalado en el sistema y se tira cuando molesta.

Abre Docker Desktop y, la primera vez:

```bash
docker run -d -p 27017:27017 --name mongo-points mongo:7
```

Las siguientes veces basta con:

```bash
docker start mongo-points
```

Para comprobar que está:

```bash
docker ps | grep mongo-points
```

### Si algún día se usa MongoDB Atlas

**La cadena de conexión NO se escribe en `application.properties`.** Ese
fichero está versionado y el repositorio es **público**: ahí dentro, el usuario
y la contraseña de la base de datos quedan publicados en GitHub, y los bots que
rastrean credenciales en repos públicos las encuentran en minutos.

Se pasa por variable de entorno, que Spring Boot prioriza sobre la propiedad:

```bash
SPRING_MONGODB_URI='mongodb+srv://...' ./mvnw spring-boot:run
```

---

## 2. Backend

```bash
cd backend
./mvnw spring-boot:run
```

Comprobar que está vivo **y conectado**:

```bash
curl -s localhost:8080/actuator/health
```

Tiene que decir `{"status":"UP"}`.

**Ojo con esto:** el backend arranca aunque Mongo esté caído. Tomcat dice
"Started PointsApiApplication" y parece que todo va bien, pero en el log hay un
`ConnectException: Connection refused` y `/actuator/health` devuelve vacío.
**No se reconecta solo**: si levantas Mongo después, hay que reiniciar el
backend.

---

## 3. Frontend

```bash
npm run dev
```

En http://localhost:5173

El frontend habla con el backend a través de `VITE_API_URL`, que por defecto es
`http://localhost:8080` (ver `src/services/customTaskService.ts`).

---

## Storybook, que va aparte

El design system no necesita ni backend ni base de datos:

```bash
npm run storybook
```

En http://localhost:6006

**Si añades un fichero `.stories.tsx` nuevo o tocas `.storybook/preview.tsx`,
reinicia el servidor.** Storybook genera el mapa de historias al arrancar; con
uno nuevo por medio falla con `importers[path] is not a function`. Si pasa:

```bash
rm -rf node_modules/.cache/storybook
```

y vuelve a arrancarlo.

---

## Comprobaciones antes de dar algo por bueno

```bash
npm run typecheck   # tsc -b
npx vitest run      # los tests
```

**`npx tsc --noEmit` a secas NO vale.** El `tsconfig.json` de la raíz es
`{ "files": [], "references": [...] }`, así que compila cero ficheros y sale
con 0 diga lo que diga el código. Por eso existe el script `typecheck`, que usa
`tsc -b` y sí sigue las referencias.
