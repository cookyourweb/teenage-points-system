package es.cookyourweb.points.web;

import es.cookyourweb.points.task.TaskNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
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

    @ExceptionHandler(TaskNotFoundException.class)
    public ProblemDetail noEncontrada(TaskNotFoundException e) {
        ProblemDetail p = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
        p.setTitle("Tarea no encontrada");
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
}
