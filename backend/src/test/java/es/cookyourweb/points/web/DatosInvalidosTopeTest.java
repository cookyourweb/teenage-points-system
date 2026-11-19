package es.cookyourweb.points.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** El 400 de validacion tampoco devuelve un eco ilimitado: mismo tope de 20 que los otros. */
class DatosInvalidosTopeTest {

    @Test
    @DisplayName("con 30 campos invalidos, campos trae como mucho 20")
    void topeDe20() throws Exception {
        BeanPropertyBindingResult errores = new BeanPropertyBindingResult(new Object(), "cuerpo");
        for (int i = 0; i < 30; i++) {
            errores.addError(new FieldError("cuerpo", "campo" + i, "invalido"));
        }
        MethodArgumentNotValidException e = new MethodArgumentNotValidException(
                new MethodParameter(Object.class.getMethod("equals", Object.class), 0), errores);

        ProblemDetail p = new ManejadorDeErrores().datosInvalidos(e);

        assertThat((Map<?, ?>) p.getProperties().get("campos")).hasSize(20);
    }
}
