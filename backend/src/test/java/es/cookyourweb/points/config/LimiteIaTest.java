package es.cookyourweb.points.config;

import es.cookyourweb.points.ia.ContenidoFicticio;
import es.cookyourweb.points.ia.TipoController;
import es.cookyourweb.points.ia.TipoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * CWE-799: el perfil de colores (y lo que llegue bajo /api/ia) tiene tope por usuario.
 * Sin el, ~10 peticiones bastan para deducir a que color apunta cada afirmacion, y con
 * la IA cada llamada costara dinero. El reloj es un mock: el test mueve el tiempo.
 *
 * El limitador guarda estado entre tests de esta clase (mismo contexto), asi que cada
 * test usa su propio uid.
 */
@WebMvcTest(TipoController.class)
@Import({SeguridadConfig.class, TipoService.class, ContenidoFicticio.class, LimiteIaConfig.class})
class LimiteIaTest {

    private static final Instant T0 = Instant.parse("2026-11-19T10:00:00Z");
    private static final String VALIDO = """
            {"respuestas":{"a01":"A_VECES","a02":"A_VECES","a03":"A_VECES","a04":"A_VECES","a05":"A_VECES",
            "a06":"A_VECES","a07":"A_VECES","a08":"A_VECES","a09":"A_VECES","a10":"A_VECES"}}""";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @MockitoBean
    private Clock reloj;

    private ResultActions perfil(String uid) throws Exception {
        return mockMvc.perform(post("/api/ia/tipo/perfil").with(jwt().jwt(j -> j.subject(uid)))
                .contentType(MediaType.APPLICATION_JSON).content(VALIDO));
    }

    private void agotar(String uid) throws Exception {
        for (int i = 0; i < 5; i++) {
            perfil(uid).andExpect(status().isOk());
        }
    }

    @Test
    @DisplayName("la sexta peticion en 10 minutos da 429 con Retry-After hasta el fin de la ventana")
    void sextaDa429() throws Exception {
        when(reloj.instant()).thenReturn(T0);
        agotar("uid-1");

        when(reloj.instant()).thenReturn(T0.plus(Duration.ofMinutes(4)));
        perfil("uid-1")
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "360"))
                .andExpect(jsonPath("$.title").value("Demasiadas peticiones"));
    }

    @Test
    @DisplayName("el limite es por usuario: agotar el de uno no frena a otro")
    void porUsuario() throws Exception {
        when(reloj.instant()).thenReturn(T0);
        agotar("uid-2");
        perfil("uid-2").andExpect(status().isTooManyRequests());

        perfil("uid-3").andExpect(status().isOk());
    }

    @Test
    @DisplayName("pasada la ventana de 10 minutos se puede volver a pedir")
    void pasadaLaVentanaVuelve() throws Exception {
        when(reloj.instant()).thenReturn(T0);
        agotar("uid-4");
        perfil("uid-4").andExpect(status().isTooManyRequests());

        when(reloj.instant()).thenReturn(T0.plus(Duration.ofMinutes(10)));
        perfil("uid-4").andExpect(status().isOk());
    }

    @Test
    @DisplayName("las lecturas (GET /preguntas) no gastan cupo: no cuestan IA ni revelan el mapa")
    void lecturasNoCuentan() throws Exception {
        when(reloj.instant()).thenReturn(T0);
        for (int i = 0; i < 8; i++) {
            mockMvc.perform(get("/api/ia/tipo/preguntas").with(jwt().jwt(j -> j.subject("uid-5"))))
                    .andExpect(status().isOk());
        }
        agotar("uid-5");
    }
}
