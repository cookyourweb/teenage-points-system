package es.cookyourweb.points.config;

import jakarta.servlet.DispatcherType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.Customizer;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.Assert;

import java.util.Map;

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
                        // El redespacho a /error (tras un 400/404/405 del propio MVC) tambien
                        // pasa por Spring Security; sin esto caeria en denyAll y el cliente
                        // veria un 403 vacio en lugar del error verdadero. La autenticacion
                        // ya se exigio en el despacho original.
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        // /api/me si: el frontend pregunta quien es, aunque sea anonimo.
                        .requestMatchers("/api/me").authenticated()
                        // Una cuenta anonima la crea cualquiera sin pasar por la app: token
                        // valido, pero no identifica a nadie. Fuera del resto de la API.
                        .requestMatchers("/api/**").access((autenticacion, contexto) ->
                                new AuthorizationDecision(esCuentaIdentificada(autenticacion.get())))
                        // Lo que no se ha abierto a proposito, cerrado.
                        .anyRequest().denyAll())
                .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()));
        return http.build();
    }

    // Firebase anida el proveedor dentro del claim "firebase". Sin ese claim no es
    // anonima: los tokens anonimos de Firebase siempre lo traen.
    static boolean esCuentaIdentificada(Authentication autenticacion) {
        if (!(autenticacion instanceof JwtAuthenticationToken token)) {
            return false;
        }
        Map<String, Object> firebase = token.getToken().getClaimAsMap("firebase");
        return firebase == null || !"anonymous".equals(firebase.get("sign_in_provider"));
    }

    /**
     * Sin valor por defecto a proposito: si falta FIREBASE_PROJECT_ID la API no arranca.
     * Un id equivocado o vacio aceptaria o rechazaria tokens en silencio; es mejor
     * fallar al levantar. El id no se versiona (repo publico): llega por entorno.
     */
    @Bean
    JwtDecoder jwtDecoder(@Value("${app.firebase.project-id}") String proyecto) {
        // FIREBASE_PROJECT_ID definida pero vacia resuelve el placeholder sin fallar:
        // hay que rechazarla a mano o la API arrancaria rechazando todos los tokens.
        Assert.hasText(proyecto, "app.firebase.project-id (FIREBASE_PROJECT_ID) no puede estar vacia");
        NimbusJwtDecoder decodificador = NimbusJwtDecoder.withJwkSetUri(TokenFirebase.JWKS_URL)
                // Solo RS256, que es lo que firma Firebase. Evita aceptar otros algoritmos.
                .jwsAlgorithm(SignatureAlgorithm.RS256)
                .build();
        OAuth2TokenValidator<Jwt> validador = TokenFirebase.validador(proyecto);
        decodificador.setJwtValidator(validador);
        return decodificador;
    }
}
