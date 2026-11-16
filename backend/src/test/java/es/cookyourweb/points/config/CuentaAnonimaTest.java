package es.cookyourweb.points.config;

import es.cookyourweb.points.ia.ContenidoFicticio;
import es.cookyourweb.points.ia.TipoController;
import es.cookyourweb.points.ia.TipoService;
import es.cookyourweb.points.identidad.YoController;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Una cuenta anonima de Firebase la puede crear cualquiera con una llamada, sin
 * pasar por la app. Su token es valido, pero no identifica a nadie: no entra en
 * ninguna ruta salvo /api/me, que el frontend usa para saber quien es.
 */
@WebMvcTest({YoController.class, TipoController.class})
@Import({SeguridadConfig.class, TipoService.class, ContenidoFicticio.class})
class CuentaAnonimaTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    @DisplayName("una cuenta anonima recibe 403 en las rutas de la API")
    void anonimaNoEntra() throws Exception {
        mockMvc.perform(get("/api/ia/tipo/preguntas").with(jwt().jwt(j -> j
                        .subject("uid-anonimo")
                        .claim("firebase", Map.of("sign_in_provider", "anonymous")))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("una cuenta anonima si puede preguntar quien es en /api/me")
    void anonimaPuedePreguntarQuienEs() throws Exception {
        mockMvc.perform(get("/api/me").with(jwt().jwt(j -> j
                        .subject("uid-anonimo")
                        .claim("firebase", Map.of("sign_in_provider", "anonymous")))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("una cuenta con email y contrasena sigue entrando")
    void cuentaConContrasenaEntra() throws Exception {
        mockMvc.perform(get("/api/ia/tipo/preguntas").with(jwt().jwt(j -> j
                        .subject("uid-1")
                        .claim("firebase", Map.of("sign_in_provider", "password")))))
                .andExpect(status().isOk());
    }
}
