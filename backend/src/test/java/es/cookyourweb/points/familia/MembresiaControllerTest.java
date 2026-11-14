package es.cookyourweb.points.familia;

import es.cookyourweb.points.config.SeguridadConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MembresiaController.class)
@Import(SeguridadConfig.class)
class MembresiaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @MockitoBean
    private MembresiaService servicio;

    @Test
    void sinTokenDa401() throws Exception {
        mockMvc.perform(post("/api/membresias/yo")).andExpect(status().isUnauthorized());
        verifyNoInteractions(servicio);
    }

    @Test
    void ignoraElFamilyIdDelCuerpo() throws Exception {
        when(servicio.asegurarMiMembresia("ana", "tok-ana")).thenReturn(
                new Membresia("m1", "ana", "f1", Papel.ADULTO, EstadoMembresia.ACTIVA, Instant.EPOCH));

        mockMvc.perform(post("/api/membresias/yo")
                        .with(jwt().jwt(j -> j.tokenValue("tok-ana").subject("ana")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"familyId\":\"ajena\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.familyId").value("f1"))
                .andExpect(jsonPath("$.papel").value("ADULTO"));

        // El servicio solo recibe uid y token: no hay forma de que llegue "ajena".
        verify(servicio).asegurarMiMembresia("ana", "tok-ana");
    }

    @Test
    void sinFamiliaDa404() throws Exception {
        when(servicio.asegurarMiMembresia("ana", "tok-ana")).thenThrow(new FamiliaNoEncontradaException());

        mockMvc.perform(post("/api/membresias/yo")
                        .with(jwt().jwt(j -> j.tokenValue("tok-ana").subject("ana"))))
                .andExpect(status().isNotFound());
    }

    @Test
    void siFirestoreFallaDa502() throws Exception {
        when(servicio.asegurarMiMembresia("ana", "tok-ana"))
                .thenThrow(new ServicioExternoException("firestore", null));

        mockMvc.perform(post("/api/membresias/yo")
                        .with(jwt().jwt(j -> j.tokenValue("tok-ana").subject("ana"))))
                .andExpect(status().isBadGateway());
    }
}
