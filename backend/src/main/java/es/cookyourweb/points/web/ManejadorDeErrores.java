package es.cookyourweb.points.web;

import es.cookyourweb.points.deber.DeberDuplicadoException;
import es.cookyourweb.points.deber.DeberNoEncontradoException;
import es.cookyourweb.points.familia.FamiliaNoEncontradaException;
import es.cookyourweb.points.familia.ServicioExternoException;
import es.cookyourweb.points.ia.EleccionInvalidaException;
import es.cookyourweb.points.ia.RespuestasInvalidasException;
import es.cookyourweb.points.task.TaskNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.TypeMismatchException;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Traduce excepciones a respuestas HTTP, en un solo sitio.
 *
 * Sin esto, cualquier excepcion sale como un 500 con la traza dentro, y el
 * cliente no puede distinguir "no existe" de "el servidor se rompio". Aqui una
 * tarea inexistente es un 404 y un campo invalido es un 400 con la lista de
 * que falla y por que.
 *
 * Se usa ProblemDetail (RFC 7807), que es el formato estandar de errores HTTP:
 * el frontend siempre recibe la misma forma, venga el error de donde venga.
 *
 * Regla de fugas (CWE-209): al cliente solo llegan textos escritos AQUI o en
 * excepciones nuestras cuyo mensaje es fijo. Nunca e.getMessage() de algo que pueda
 * venir de una libreria (Mongo, Jackson, Spring): esos mensajes nombran clases,
 * campos internos o datos. Lo inesperado sale con un texto generico y un "idError";
 * el detalle va al log con ese mismo id, para cruzar la queja con la traza.
 */
@RestControllerAdvice
public class ManejadorDeErrores {

    private static final Logger log = LoggerFactory.getLogger(ManejadorDeErrores.class);

    /**
     * Se conserva e.getMessage() a proposito: el texto es fijo ("no existe la tarea {id}")
     * y el id es el de la propia ruta que mando el cliente. Es el mismo para una tarea
     * ajena y una inexistente (TaskServiceTest), asi que no deja sondear ids.
     */
    @ExceptionHandler(TaskNotFoundException.class)
    public ProblemDetail noEncontrada(TaskNotFoundException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
        p.setTitle("Tarea no encontrada");
        return p;
    }

    /**
     * 404 y no 403: no se confirma que la familia exista a quien no es de ella.
     * e.getMessage() es la constante "familia no encontrada": seguro de mostrar.
     */
    @ExceptionHandler(FamiliaNoEncontradaException.class)
    public ProblemDetail familiaNoEncontrada(FamiliaNoEncontradaException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
        p.setTitle("Familia no encontrada");
        return p;
    }

    /** 404 tanto si el deber no existe como si es de otra familia o hijo: no deja sondear ids. Texto fijo. */
    @ExceptionHandler(DeberNoEncontradoException.class)
    public ProblemDetail deberNoEncontrado(DeberNoEncontradoException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "deber no encontrado");
        p.setTitle("Deber no encontrado");
        return p;
    }

    /** 409: la clave (enlace canonico) ya existe para ese hijo. Texto fijo, sin eco de la clave. */
    @ExceptionHandler(DeberDuplicadoException.class)
    public ProblemDetail deberDuplicado(DeberDuplicadoException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "ya hay un deber con esa clave");
        p.setTitle("Deber repetido");
        return p;
    }

    /** 502 y no 404: que Firestore falle no significa que no seas de la familia. */
    @ExceptionHandler(ServicioExternoException.class)
    public ProblemDetail servicioExterno(ServicioExternoException e) {
        // Rastro para operar, solo con la CLASE de la causa: nunca mensaje, cabeceras ni token.
        Throwable causa = e.getCause() == null ? e : e.getCause();
        log.warn("Servicio externo fallo: causa={}", causa.getClass().getName());
        ProblemDetail p = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_GATEWAY, "un servicio externo no respondio, reintenta");
        p.setTitle("Servicio externo no disponible");
        return p;
    }

    /**
     * 400 con {campo: motivo}, con el mismo tope de MAX_CAMPOS que los otros dos.
     * El nombre se corta en el primer '[' o '<': en un Map o una lista, Spring pone ahi la
     * clave o el indice ("respuestas<K>[clave-del-cliente]"), y eso seria devolver texto
     * que escribio el cliente. Queda solo el nombre del campo, que es nuestro.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail datosInvalidos(MethodArgumentNotValidException e) {
        Map<String, String> porCampo = e.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        f -> nombreDeCampo(f.getField()),
                        f -> f.getDefaultMessage() == null ? "valor invalido" : f.getDefaultMessage(),
                        (primero, segundo) -> primero));

        ProblemDetail p = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "hay campos que no cumplen las reglas");
        p.setTitle("Datos invalidos");
        p.setProperty("campos", limitar(porCampo));
        return p;
    }

    /**
     * Cuando un metodo del controller tiene restricciones en sus parametros (p. ej. @Pattern en las
     * variables de ruta), Spring valida todo junto y los fallos del cuerpo llegan aqui en vez de como
     * MethodArgumentNotValidException. Misma forma {campo: motivo}: los del cuerpo por nombre de campo
     * (con el mismo recorte de nombreDeCampo) y los de ruta por el nombre del parametro, nunca por su valor.
     */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ProblemDetail validacionDeMetodo(HandlerMethodValidationException e) {
        Map<String, String> porCampo = new java.util.LinkedHashMap<>();
        e.getParameterValidationResults().forEach(r -> {
            if (r instanceof org.springframework.validation.method.ParameterErrors pe) {
                pe.getFieldErrors().forEach(f -> porCampo.putIfAbsent(nombreDeCampo(f.getField()),
                        f.getDefaultMessage() == null ? "valor invalido" : f.getDefaultMessage()));
            } else {
                String nombre = r.getMethodParameter().getParameterName();
                String motivo = r.getResolvableErrors().stream().map(x -> x.getDefaultMessage())
                        .filter(java.util.Objects::nonNull).findFirst().orElse("valor invalido");
                porCampo.putIfAbsent(nombre == null ? "parametro" : nombre, motivo);
            }
        });
        ProblemDetail p = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "hay campos que no cumplen las reglas");
        p.setTitle("Datos invalidos");
        p.setProperty("campos", limitar(porCampo));
        return p;
    }

    private static String nombreDeCampo(String ruta) {
        int corte = ruta.length();
        for (char c : new char[]{'[', '<'}) {
            int i = ruta.indexOf(c);
            if (i >= 0 && i < corte) {
                corte = i;
            }
        }
        return ruta.substring(0, corte);
    }

    /**
     * IllegalArgumentException la lanza cualquiera (nuestro codigo, Mongo, Spring), asi
     * que su mensaje NO se devuelve: puede nombrar clases o campos internos. Se mantiene
     * el 400 que ya tenia; el mensaje va al log junto al idError.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail argumentoInvalido(IllegalArgumentException e) {
        String idError = nuevoIdError();
        log.warn("Peticion invalida idError={}: {}", idError, e.getMessage());
        ProblemDetail p = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "la peticion no es valida");
        p.setTitle("Peticion invalida");
        p.setProperty("idError", idError);
        return p;
    }

    /**
     * Red final: cualquier fallo no previsto es un 500 generico con idError, y la traza
     * completa solo en el log. Sin esto el texto que viera el cliente dependeria de
     * como lo pinte Spring en cada version.
     *
     * Lo que ya tiene su codigo fuera de aqui se relanza intacto, para no convertir en
     * 500 un 400/404/405 del propio MVC ni un 401/403 de Spring Security: relanzar la
     * MISMA excepcion hace que Spring pase al siguiente resolvedor sin ruido.
     */
    @ExceptionHandler(Exception.class)
    public ProblemDetail inesperado(Exception e) throws Exception {
        if (e instanceof ErrorResponse
                || e instanceof TypeMismatchException
                || e instanceof AccessDeniedException
                || e instanceof AuthenticationException
                || AnnotatedElementUtils.hasAnnotation(e.getClass(), ResponseStatus.class)) {
            throw e;
        }
        String idError = nuevoIdError();
        log.error("Error no controlado idError={}", idError, e);
        ProblemDetail p = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "algo fallo en el servidor; si se repite, comparte el idError");
        p.setTitle("Error interno");
        p.setProperty("idError", idError);
        return p;
    }

    /** Aleatorio y sin significado: no revela orden, hora ni volumen de errores. */
    private static String nuevoIdError() {
        return UUID.randomUUID().toString();
    }

    /** Tope de entradas de "campos" que se devuelven: un cliente hostil no obtiene un eco ilimitado. */
    private static final int MAX_CAMPOS = 20;

    private static Map<String, String> limitar(Map<String, String> campos) {
        return campos.entrySet().stream().limit(MAX_CAMPOS)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue,
                        (a, b) -> a, java.util.LinkedHashMap::new));
    }

    /** 400 con los ids de afirmaciones que faltan o sobran, como {id: motivo}. */
    @ExceptionHandler(RespuestasInvalidasException.class)
    public ProblemDetail respuestasInvalidas(RespuestasInvalidasException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "faltan respuestas o hay ids desconocidos");
        p.setTitle("Respuestas invalidas");
        p.setProperty("campos", limitar(e.campos()));
        return p;
    }

    /** 400 con los campos de la eleccion de colores que fallan. */
    @ExceptionHandler(EleccionInvalidaException.class)
    public ProblemDetail eleccionInvalida(EleccionInvalidaException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "la eleccion de colores no es valida");
        p.setTitle("Eleccion invalida");
        p.setProperty("campos", limitar(e.campos()));
        return p;
    }

    /**
     * JSON ilegible (p. ej. una frecuencia que no existe): 400 generico, sin eco del cuerpo.
     * Salvo que la lectura la cortara el tope de LimiteDeCuerpoFiltro (cuerpo chunked sin
     * Content-Length): Spring lo envuelve como fallo de lectura, pero es un 413.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail cuerpoIlegible(HttpMessageNotReadableException e) {
        for (Throwable c = e.getCause(); c != null; c = c.getCause()) {
            if (c instanceof CuerpoDemasiadoGrandeException) {
                return cuerpoDemasiadoGrande();
            }
        }
        ProblemDetail p = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "el cuerpo de la peticion no se pudo leer");
        p.setTitle("Peticion invalida");
        return p;
    }

    /** 429 con Retry-After (segundos): el cliente sabe cuando reintentar sin martillear. */
    @ExceptionHandler(DemasiadasPeticionesException.class)
    public ResponseEntity<ProblemDetail> demasiadasPeticiones(DemasiadasPeticionesException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(
                HttpStatus.TOO_MANY_REQUESTS, "has hecho demasiadas peticiones seguidas; espera un poco");
        p.setTitle("Demasiadas peticiones");
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(e.segundos()))
                .body(p);
    }

    /** Mismo texto que el 413 que escribe LimiteDeCuerpoFiltro cuando hay Content-Length. */
    private static ProblemDetail cuerpoDemasiadoGrande() {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(
                HttpStatus.PAYLOAD_TOO_LARGE, "el cuerpo de la peticion supera 16 KB");
        p.setTitle("Cuerpo demasiado grande");
        return p;
    }
}
