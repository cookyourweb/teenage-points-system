package es.cookyourweb.points.config;

import es.cookyourweb.points.web.DemasiadasPeticionesException;
import es.cookyourweb.points.web.LimitadorPorUsuario;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Clock;
import java.time.Duration;

/**
 * Tope de peticiones por usuario en /api/ia/** (CWE-799).
 *
 * Por que: POST /api/ia/tipo/perfil es un oraculo. Con ~10 peticiones variando una
 * respuesta cada vez se deduce a que color apunta cada afirmacion, que es justo lo que
 * la API esconde. Y cuando llegue la IA cada llamada costara dinero.
 *
 * Numeros: 5 peticiones cada 10 minutos por uid. Un adolescente hace el test una vez y
 * quiza lo reenvia tras un 400 (2-3 envios): cabe de sobra. Deducir el mapa pasa de
 * segundos a mas de 20 minutos, y el gasto de IA queda acotado a 30 llamadas/hora/usuario.
 *
 * Solo cuentan las escrituras (POST/PUT/...): GET /preguntas no cuesta IA ni revela el
 * mapa. Todas las rutas de /api/ia comparten un cupo: es un presupuesto de IA por persona.
 *
 * Clave: el "sub" del token, que ya verifico Spring Security (este interceptor corre
 * despues). Nunca la IP: detras de un NAT familiar o de un proxy seria la misma para todos.
 *
 * No es WebMvcConfigurer a proposito: asi @WebMvcTest no lo carga en cada test de
 * controlador (necesitaria el Clock); el test que lo prueba lo importa explicitamente.
 *
 * LIMITE CONOCIDO: el contador vive en memoria, por instancia (ver LimitadorPorUsuario).
 */
@Configuration
public class LimiteIaConfig {

    static final int MAXIMO = 5;
    static final Duration VENTANA = Duration.ofMinutes(10);

    @Bean
    LimitadorPorUsuario limitadorIa(Clock reloj) {
        return new LimitadorPorUsuario(reloj, MAXIMO, VENTANA);
    }

    @Bean
    WebMvcConfigurer limiteIaMvc(LimitadorPorUsuario limitadorIa) {
        HandlerInterceptor interceptor = new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest peticion, HttpServletResponse respuesta, Object handler) {
                if (HttpMethod.GET.matches(peticion.getMethod()) || HttpMethod.HEAD.matches(peticion.getMethod())
                        || HttpMethod.OPTIONS.matches(peticion.getMethod())) {
                    return true;
                }
                Authentication a = SecurityContextHolder.getContext().getAuthentication();
                if (!(a instanceof JwtAuthenticationToken token)) {
                    // Sin token Spring Security ya respondio 401: aqui no se llega.
                    return true;
                }
                limitadorIa.intentar(token.getToken().getSubject()).ifPresent(espera -> {
                    throw new DemasiadasPeticionesException(espera);
                });
                return true;
            }
        };
        return new WebMvcConfigurer() {
            @Override
            public void addInterceptors(InterceptorRegistry registro) {
                registro.addInterceptor(interceptor).addPathPatterns("/api/ia/**");
            }
        };
    }
}
