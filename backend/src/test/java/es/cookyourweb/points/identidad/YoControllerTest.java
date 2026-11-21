package es.cookyourweb.points.identidad;

import es.cookyourweb.points.config.SeguridadConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /api/me: el frontend pregunta "a quien reconoces?" para comprobar que el
 * servidor acepta su token. Se prueba con un JWT ya "verificado" (post-procesador
 * jwt()); la verificacion de firma es asunto de TokenFirebaseTest.
 */
@WebMvcTest(YoController.class)
@Import(SeguridadConfig.class)
class YoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    // Evita que la cadena de seguridad intente descargar el JWKS de Google.
    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    @DisplayName("sin token da 401")
    void sinTokenDa401() throws Exception {
        mockMvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("con token devuelve uid, email, verificacion y proveedor")
    void conTokenDevuelveElUid() throws Exception {
        mockMvc.perform(get("/api/me").with(jwt().jwt(j -> j
                        .subject("uid-1")
                        .claim("email", "a@b.c")
                        .claim("email_verified", true)
                        .claim("firebase", Map.of("sign_in_provider", "password")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uid").value("uid-1"))
                .andExpect(jsonPath("$.email").value("a@b.c"))
                .andExpect(jsonPath("$.emailVerificado").value(true))
                .andExpect(jsonPath("$.proveedor").value("password"));
    }

    @Test
    @DisplayName("una cuenta anonima no trae email y el campo se omite")
    void cuentaAnonimaSinEmail() throws Exception {
        mockMvc.perform(get("/api/me").with(jwt().jwt(j -> j
                        .subject("uid-2")
                        .claim("firebase", Map.of("sign_in_provider", "anonymous")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uid").value("uid-2"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.proveedor").value("anonymous"));
    }
}
