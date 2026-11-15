package es.cookyourweb.points.web;

import es.cookyourweb.points.familia.FamiliaNoEncontradaException;
import es.cookyourweb.points.familia.ServicioExternoException;
import es.cookyourweb.points.ia.EleccionInvalidaException;
import es.cookyourweb.points.ia.RespuestasInvalidasException;
import es.cookyourweb.points.task.TaskNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
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
 */
@RestControllerAdvice
public class ManejadorDeErrores {

    private static final Logger log = LoggerFactory.getLogger(ManejadorDeErrores.class);

    @ExceptionHandler(TaskNotFoundException.class)
    public ProblemDetail noEncontrada(TaskNotFoundException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
        p.setTitle("Tarea no encontrada");
        return p;
    }

    /** 404 y no 403: no se confirma que la familia exista a quien no es de ella. */
    @ExceptionHandler(FamiliaNoEncontradaException.class)
    public ProblemDetail familiaNoEncontrada(FamiliaNoEncontradaException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
        p.setTitle("Familia no encontrada");
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

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail datosInvalidos(MethodArgumentNotValidException e) {
        Map<String, String> porCampo = e.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        f -> f.getField(),
                        f -> f.getDefaultMessage() == null ? "valor invalido" : f.getDefaultMessage(),
                        (primero, segundo) -> primero));

        ProblemDetail p = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "hay campos que no cumplen las reglas");
        p.setTitle("Datos invalidos");
        p.setProperty("campos", porCampo);
        return p;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail argumentoInvalido(IllegalArgumentException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
        p.setTitle("Peticion invalida");
        return p;
    }

    /** 400 con los ids de afirmaciones que faltan o sobran. */
    @ExceptionHandler(RespuestasInvalidasException.class)
    public ProblemDetail respuestasInvalidas(RespuestasInvalidasException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "faltan respuestas o hay ids desconocidos");
        p.setTitle("Respuestas invalidas");
        p.setProperty("campos", e.ids());
        return p;
    }

    /** 400 con los campos de la eleccion de colores que fallan. */
    @ExceptionHandler(EleccionInvalidaException.class)
    public ProblemDetail eleccionInvalida(EleccionInvalidaException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "la eleccion de colores no es valida");
        p.setTitle("Eleccion invalida");
        p.setProperty("campos", e.campos());
        return p;
    }

    /** JSON ilegible (p. ej. una frecuencia que no existe): 400 generico, sin eco del cuerpo. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail cuerpoIlegible(HttpMessageNotReadableException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "el cuerpo de la peticion no se pudo leer");
        p.setTitle("Peticion invalida");
        return p;
    }
}
