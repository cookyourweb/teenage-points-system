package es.cookyourweb.points.config;

import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;

/**
 * Las reglas que Firebase documenta para aceptar un ID token, sin el Admin SDK.
 *
 * Con solo el JWKS, Spring comprueba la firma y la caducidad, pero NO que el token
 * sea de NUESTRO proyecto: un token valido de cualquier otra app Firebase del mundo
 * tendria la firma correcta (Google firma todos con las mismas claves). Por eso hay
 * que exigir iss y aud a mano. Y hay que decirlo todo aqui, porque setJwtValidator
 * REEMPLAZA los validadores por defecto: si no se anade el de caducidad, desaparece.
 */
public final class TokenFirebase {

    /**
     * Claves publicas con las que Google firma los ID tokens de Firebase, en formato JWK.
     * Fuente: es el endpoint que usa el propio Firebase Admin SDK (securetoken@system
     * .gserviceaccount.com) y se comprobo en vivo el 14-nov-2026 (devuelve {"keys":[...]}
     * con alg RS256). La pagina "Verify ID tokens" de Firebase solo lista la variante
     * X.509 (/robot/v1/metadata/x509/...), que Spring no consume: sirve el mismo juego
     * de claves en JWK, que es lo que espera NimbusJwtDecoder.
     */
    public static final String JWKS_URL =
            "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

    private TokenFirebase() {
    }

    public static String emisor(String proyecto) {
        return "https://securetoken.google.com/" + proyecto;
    }

    public static OAuth2TokenValidator<Jwt> validador(String proyecto) {
        return new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(),
                new JwtIssuerValidator(emisor(proyecto)),
                audienciaEs(proyecto),
                subNoVacio());
    }

    private static OAuth2TokenValidator<Jwt> audienciaEs(String proyecto) {
        return token -> token.getAudience() != null && token.getAudience().contains(proyecto)
                ? OAuth2TokenValidatorResult.success()
                : fallo("El token no es para este proyecto (aud)");
    }

    private static OAuth2TokenValidator<Jwt> subNoVacio() {
        return token -> token.getSubject() != null && !token.getSubject().isBlank()
                ? OAuth2TokenValidatorResult.success()
                : fallo("El token no trae sub");
    }

    private static OAuth2TokenValidatorResult fallo(String descripcion) {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", descripcion, null));
    }
}
