package es.cookyourweb.points.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Quien puede llamar a la API: solo quien traiga un ID token de Firebase valido.
 *
 * Hasta ahora cualquiera podia leer y borrar tareas de menores sabiendo una URL.
 * La API no guarda sesion ni emite tokens: se limita a verificar el que ya emitio
 * Firebase en el frontend (cabecera Authorization: Bearer ...).
 */
@Configuration
public class SeguridadConfig {

    @Bean
    SecurityFilterChain cadenaDeSeguridad(HttpSecurity http) throws Exception {
        http
                // CSRF protege sesiones por cookie. Aqui no hay cookie: el token va en
                // una cabecera que el navegador no adjunta solo, asi que no aplica.
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Usa el CorsConfig existente. Debe resolverse ANTES de autenticar: la
                // preflight del navegador nunca lleva token y tiene que llegar a CORS.
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(a -> a
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        // Lo que no se ha abierto a proposito, cerrado.
                        .anyRequest().denyAll())
                .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()));
        return http.build();
    }

    /**
     * Sin valor por defecto a proposito: si falta FIREBASE_PROJECT_ID la API no arranca.
     * Un id equivocado o vacio aceptaria o rechazaria tokens en silencio; es mejor
     * fallar al levantar. El id no se versiona (repo publico): llega por entorno.
     */
    @Bean
    JwtDecoder jwtDecoder(@Value("${app.firebase.project-id}") String proyecto) {
        NimbusJwtDecoder decodificador = NimbusJwtDecoder.withJwkSetUri(TokenFirebase.JWKS_URL)
                // Solo RS256, que es lo que firma Firebase. Evita aceptar otros algoritmos.
                .jwsAlgorithm(SignatureAlgorithm.RS256)
                .build();
        OAuth2TokenValidator<Jwt> validador = TokenFirebase.validador(proyecto);
        decodificador.setJwtValidator(validador);
        return decodificador;
    }
}
