package es.cookyourweb.points.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.PropertyPlaceholderAutoConfiguration;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.context.annotation.Bean;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Arranque de la seguridad. Se activa @EnableWebSecurity para que HttpSecurity exista: si no, el contexto fallaria por ESO y el test de "sin
 * proyecto" pasaria por el motivo equivocado.
 */
class SeguridadConfigTest {

    // PropertyPlaceholderAutoConfiguration es lo que en la app real hace estricto el
    // ${...}: sin el, un placeholder sin valor pasa como texto literal y no falla.
    private final WebApplicationContextRunner runner = new WebApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(PropertyPlaceholderAutoConfiguration.class))
            .withUserConfiguration(ActivaSeguridadWeb.class, SeguridadConfig.class);

    // Lo que la autoconfiguracion de Boot hace en la app real: poner HttpSecurity a mano.
    @Configuration
    @EnableWebSecurity
    static class ActivaSeguridadWeb {
        // En la app real CORS sale de CorsConfig via MVC; aqui basta una fuente vacia
        // para que cors() de la cadena encuentre algo. Lo que se prueba es la propiedad.
        @Bean
        CorsConfigurationSource corsConfigurationSource() {
            return new UrlBasedCorsConfigurationSource();
        }
    }

    @Test
    @DisplayName("con el proyecto configurado el contexto arranca y hay decodificador")
    void conProyectoArranca() {
        runner.withPropertyValues("app.firebase.project-id=proyecto-test")
                .run(contexto -> {
                    assertThat(contexto).hasNotFailed();
                    assertThat(contexto).hasSingleBean(JwtDecoder.class);
                });
    }

    @Test
    @DisplayName("sin app.firebase.project-id el contexto no arranca")
    void sinProyectoNoArranca() {
        runner.run(contexto -> {
            assertThat(contexto).hasFailed();
            assertThat(contexto.getStartupFailure()).hasStackTraceContaining("app.firebase.project-id");
        });
    }

    @Test
    @DisplayName("con app.firebase.project-id definida pero vacia el contexto no arranca")
    void proyectoVacioNoArranca() {
        // FIREBASE_PROJECT_ID= (definida y vacia) llega como cadena vacia: el placeholder
        // se resuelve y no falla, asi que hay que rechazarlo a mano.
        runner.withPropertyValues("app.firebase.project-id=")
                .run(contexto -> {
                    assertThat(contexto).hasFailed();
                    assertThat(contexto.getStartupFailure()).hasStackTraceContaining("app.firebase.project-id");
                });
    }
}
