package es.cookyourweb.points.config;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.PlainJWT;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Las reglas con las que la API acepta o rechaza un token de Firebase.
 *
 * No se llama a Google: se genera un par RSA en el test y el decodificador de prueba
 * verifica con la clave publica. Lo que se prueba es lo que es nuestro (las
 * validaciones de iss, aud, sub y caducidad); la firma la verifica Nimbus igual
 * que en produccion, solo que la clave viene de aqui y no del JWKS.
 */
class TokenFirebaseTest {

    private static final String PROYECTO = "proyecto-test";
    private static final String ISS_BUENO = "https://securetoken.google.com/" + PROYECTO;

    private static KeyPair claves;
    private static KeyPair otrasClaves;
    private static JwtDecoder decodificador;

    @BeforeAll
    static void prepararClaves() throws Exception {
        KeyPairGenerator generador = KeyPairGenerator.getInstance("RSA");
        generador.initialize(2048);
        claves = generador.generateKeyPair();
        otrasClaves = generador.generateKeyPair();

        NimbusJwtDecoder nimbus = NimbusJwtDecoder
                .withPublicKey((RSAPublicKey) claves.getPublic())
                .signatureAlgorithm(SignatureAlgorithm.RS256)
                .build();
        OAuth2TokenValidator<Jwt> validador = TokenFirebase.validador(PROYECTO);
        nimbus.setJwtValidator(validador);
        decodificador = nimbus;
    }

    private static JWTClaimsSet.Builder claimsValidos() {
        return new JWTClaimsSet.Builder()
                .issuer(ISS_BUENO)
                .audience(PROYECTO)
                .subject("uid-1")
                .issueTime(Date.from(Instant.now().minusSeconds(60)))
                .expirationTime(Date.from(Instant.now().plusSeconds(3600)));
    }

    private static String firmar(JWTClaimsSet claims, KeyPair par) throws Exception {
        SignedJWT jwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.RS256).type(JOSEObjectType.JWT).build(), claims);
        jwt.sign(new RSASSASigner((RSAPrivateKey) par.getPrivate()));
        return jwt.serialize();
    }

    @Test
    @DisplayName("un token bien firmado y con los claims correctos pasa")
    void tokenValidoPasa() throws Exception {
        String token = firmar(claimsValidos().build(), claves);

        assertThat(decodificador.decode(token).getSubject()).isEqualTo("uid-1");
    }

    @Test
    @DisplayName("un token firmado con otra clave se rechaza")
    void otraClaveFalla() throws Exception {
        String token = firmar(claimsValidos().build(), otrasClaves);

        assertThatThrownBy(() -> decodificador.decode(token)).isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("un token caducado se rechaza")
    void caducadoFalla() throws Exception {
        String token = firmar(claimsValidos()
                .issueTime(Date.from(Instant.now().minusSeconds(3 * 3600)))
                .expirationTime(Date.from(Instant.now().minusSeconds(2 * 3600)))
                .build(), claves);

        assertThatThrownBy(() -> decodificador.decode(token)).isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("un token de otro proyecto de Firebase se rechaza (aud)")
    void audDeOtroProyectoFalla() throws Exception {
        String token = firmar(claimsValidos().audience("otro-proyecto").build(), claves);

        assertThatThrownBy(() -> decodificador.decode(token)).isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("un token con el emisor de otro proyecto se rechaza (iss)")
    void issDeOtroProyectoFalla() throws Exception {
        String token = firmar(claimsValidos()
                .issuer("https://securetoken.google.com/otro-proyecto").build(), claves);

        assertThatThrownBy(() -> decodificador.decode(token)).isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("un token sin firmar con alg none se rechaza")
    void algNoneFalla() {
        String token = new PlainJWT(claimsValidos().build()).serialize();

        assertThatThrownBy(() -> decodificador.decode(token)).isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("un token con sub vacio se rechaza")
    void subVacioFalla() throws Exception {
        String token = firmar(claimsValidos().subject("").build(), claves);

        assertThatThrownBy(() -> decodificador.decode(token)).isInstanceOf(JwtException.class);
    }
}
