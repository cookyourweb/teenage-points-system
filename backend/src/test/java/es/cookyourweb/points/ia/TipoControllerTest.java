package es.cookyourweb.points.ia;

import es.cookyourweb.points.config.SeguridadConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test de colores por HTTP. Lo central: el navegador recibe las afirmaciones
 * SIN el color al que apunta cada una, y el perfil lo calcula el servidor.
 * Se usa el contenido ficticio real (no un mock) para que el test vea el JSON
 * que de verdad saldria.
 */
@WebMvcTest(TipoController.class)
@Import({SeguridadConfig.class, TipoService.class, ContenidoFicticio.class})
class TipoControllerTest {

    private static final String TODAS_A_VECES = """
            {"respuestas":{"a01":"A_VECES","a02":"A_VECES","a03":"A_VECES","a04":"A_VECES","a05":"A_VECES",
            "a06":"A_VECES","a07":"A_VECES","a08":"A_VECES","a09":"A_VECES","a10":"A_VECES"}}""";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    @DisplayName("sin token las dos rutas dan 401")
    void sinTokenDa401() throws Exception {
        mockMvc.perform(get("/api/ia/tipo/preguntas")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/ia/tipo/perfil").contentType(MediaType.APPLICATION_JSON).content(TODAS_A_VECES))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("las preguntas traen colores y afirmaciones {id, texto} sin el color al que apuntan")
    void preguntasNoRevelanElMapa() throws Exception {
        mockMvc.perform(get("/api/ia/tipo/preguntas").with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.colores.length()").value(5))
                .andExpect(jsonPath("$.colores[0].descripcion").exists())
                .andExpect(jsonPath("$.afirmaciones.length()").value(10))
                .andExpect(jsonPath("$.afirmaciones[0].id").value("a01"))
                .andExpect(jsonPath("$.afirmaciones[0].texto").exists())
                .andExpect(jsonPath("$.afirmaciones[0].colorId").doesNotExist())
                .andExpect(jsonPath("$.afirmaciones[0].length()").value(2))
                .andExpect(content().string(not(containsString("colorId"))));
    }

    @Test
    @DisplayName("el perfil devuelve un nivel por color y ningun id de afirmacion")
    void perfilNoRevelaElMapa() throws Exception {
        mockMvc.perform(post("/api/ia/tipo/perfil").with(jwt())
                        .contentType(MediaType.APPLICATION_JSON).content(TODAS_A_VECES))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.colores.length()").value(5))
                .andExpect(jsonPath("$.colores[*].length()").value(org.hamcrest.Matchers.everyItem(
                        org.hamcrest.Matchers.is(3))))
                .andExpect(jsonPath("$.colores[0].id").exists())
                .andExpect(jsonPath("$.colores[0].nombre").exists())
                .andExpect(jsonPath("$.colores[0].nivel").exists())
                .andExpect(content().string(not(containsString("a01"))))
                .andExpect(content().string(not(containsString("a10"))))
                .andExpect(content().string(not(containsString("a0"))))
                .andExpect(content().string(not(containsString("afirmacion"))))
                .andExpect(content().string(not(containsString("descripcion"))));
    }

    @Test
    @DisplayName("un perfil valido da 200 con id, nombre y nivel por color")
    void perfilValidoDa200() throws Exception {
        mockMvc.perform(post("/api/ia/tipo/perfil").with(jwt())
                        .contentType(MediaType.APPLICATION_JSON).content(TODAS_A_VECES))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.colores.length()").value(5))
                .andExpect(jsonPath("$.colores[0].id").value("verde"))
                .andExpect(jsonPath("$.colores[0].nombre").value("Verde"))
                .andExpect(jsonPath("$.colores[0].nivel").value("ALGO"));
    }

    @Test
    @DisplayName("respuestas incompletas dan 400 con los ids en campos")
    void respuestasIncompletasDa400() throws Exception {
        mockMvc.perform(post("/api/ia/tipo/perfil").with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"respuestas\":{\"a01\":\"NUNCA\"}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.length()").value(9))
                .andExpect(jsonPath("$.campos.a02").value("sin responder"))
                .andExpect(jsonPath("$.campos.a10").value("sin responder"))
                .andExpect(jsonPath("$.campos.a01").doesNotExist());
    }

    @Test
    @DisplayName("una afirmacion desconocida da 400 con campos como objeto {id: 'no existe'}")
    void afirmacionDesconocidaDa400() throws Exception {
        mockMvc.perform(post("/api/ia/tipo/perfil").with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TODAS_A_VECES.replace("\"a10\"", "\"zz\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.zz").value("no existe"))
                .andExpect(jsonPath("$.campos.a10").value("sin responder"));
    }

    @Test
    @DisplayName("campos no devuelve mas de 20 entradas aunque lleguen muchos ids desconocidos")
    void camposTopeDe20() throws Exception {
        StringBuilder sb = new StringBuilder("{\"respuestas\":{");
        for (int i = 0; i < 50; i++) {
            sb.append(i == 0 ? "" : ",").append("\"x").append(i).append("\":\"NUNCA\"");
        }
        sb.append("}}");
        mockMvc.perform(post("/api/ia/tipo/perfil").with(jwt())
                        .contentType(MediaType.APPLICATION_JSON).content(sb.toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.length()").value(20));
    }

    @Test
    @DisplayName("sin el campo respuestas da 400 con todos los ids en campos")
    void sinRespuestasDa400() throws Exception {
        mockMvc.perform(post("/api/ia/tipo/perfil").with(jwt())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.length()").value(10));
    }

    @Test
    @DisplayName("una frecuencia desconocida en el JSON da 400, no 500")
    void frecuenciaDesconocidaDa400() throws Exception {
        mockMvc.perform(post("/api/ia/tipo/perfil").with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"respuestas\":{\"a01\":\"SIEMPRE\"}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Peticion invalida"))
                .andExpect(content().string(not(containsString("SIEMPRE"))));
    }
}
