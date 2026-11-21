package es.cookyourweb.points.deber;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** El texto es un enlace https seguro y canonico (mismas reglas que esEnlaceSeguro del front). Nulo vale. */
@Documented
@Constraint(validatedBy = EnlaceSeguroValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface EnlaceSeguro {
    String message() default "no es un enlace https valido";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
