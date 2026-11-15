package es.cookyourweb.points.ia;

import es.cookyourweb.points.config.SeguridadConfig;
import es.cookyourweb.points.familia.FamiliaNoEncontradaException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EleccionTipoController.class)
@Import(SeguridadConfig.class)
class EleccionTipoControllerTest {

    private static final String RUTA = "/api/familias/fA/hijos/h1/tipo";
    private static final Instant AHORA = Instant.parse("2026-11-15T10:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @MockitoBean
    private EleccionTipoService servicio;

    @Test
    @DisplayName("sin token las dos rutas dan 401 y no llegan al servicio")
    void sinTokenDa401() throws Exception {
        mockMvc.perform(put(RUTA).contentType(MediaType.APPLICATION_JSON).content("{\"colores\":[\"rojo\"]}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get(RUTA)).andExpect(status().isUnauthorized());
        verifyNoInteractions(servicio);
    }

    @Test
    @DisplayName("PUT usa el uid del token aunque el cuerpo traiga otro, y devuelve colores, principal y elegidaEn")
    void putUsaElUidDelToken() throws Exception {
        when(servicio.guardar("ana", "fA", "h1", List.of("rojo", "amarillo"), "rojo"))
                .thenReturn(new EleccionTipo("x", "fA", "h1", "ana", List.of("rojo", "amarillo"), "rojo", AHORA));

        mockMvc.perform(put(RUTA).with(jwt().jwt(j -> j.subject("ana")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"uid\":\"beto\",\"familyId\":\"ajena\",\"colores\":[\"rojo\",\"amarillo\"],\"principal\":\"rojo\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.colores[0]").value("rojo"))
                .andExpect(jsonPath("$.colores[1]").value("amarillo"))
                .andExpect(jsonPath("$.principal").value("rojo"))
                .andExpect(jsonPath("$.elegidaEn").value("2026-11-15T10:00:00Z"))
                .andExpect(jsonPath("$.uid").doesNotExist());
        verify(servicio).guardar("ana", "fA", "h1", List.of("rojo", "amarillo"), "rojo");
    }

    @Test
    @DisplayName("sin principal el JSON no lleva el campo")
    void sinPrincipalNoHayCampo() throws Exception {
        when(servicio.guardar("ana", "fA", "h1", List.of("rojo"), null))
                .thenReturn(new EleccionTipo("x", "fA", "h1", "ana", List.of("rojo"), null, AHORA));

        mockMvc.perform(put(RUTA).with(jwt().jwt(j -> j.subject("ana")))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"colores\":[\"rojo\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.principal").doesNotExist());
    }

    @Test
    @DisplayName("una eleccion invalida da 400 con campos")
    void eleccionInvalidaDa400() throws Exception {
        when(servicio.guardar(any(), any(), any(), any(), any()))
                .thenThrow(new EleccionInvalidaException(java.util.Map.of("colores", "marca al menos un color")));

        mockMvc.perform(put(RUTA).with(jwt().jwt(j -> j.subject("ana")))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"colores\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.colores").value("marca al menos un color"));
    }

    @Test
    @DisplayName("un cuerpo sin colores llega como null al servicio, que responde 400")
    void sinColoresLlegaNull() throws Exception {
        when(servicio.guardar("ana", "fA", "h1", null, null))
                .thenThrow(new EleccionInvalidaException(java.util.Map.of("colores", "marca al menos un color")));

        mockMvc.perform(put(RUTA).with(jwt().jwt(j -> j.subject("ana")))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("quien no es de la familia recibe 404 en PUT y en GET")
    void otraFamiliaDa404() throws Exception {
        when(servicio.guardar(any(), any(), any(), any(), any())).thenThrow(new FamiliaNoEncontradaException());
        when(servicio.listar(any(), any(), any())).thenThrow(new FamiliaNoEncontradaException());

        mockMvc.perform(put(RUTA).with(jwt().jwt(j -> j.subject("intruso")))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"colores\":[\"rojo\"]}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get(RUTA).with(jwt().jwt(j -> j.subject("intruso"))))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET devuelve las elecciones con esMia y coinciden")
    void getListaLasElecciones() throws Exception {
        when(servicio.listar("ana", "fA", "h1")).thenReturn(new EleccionTipoService.Listado(
                List.of(new EleccionTipoService.Item("ana", List.of("rojo"), "rojo", AHORA, true),
                        new EleccionTipoService.Item("beto", List.of("azul"), null, AHORA, false)),
                false));

        mockMvc.perform(get(RUTA).with(jwt().jwt(j -> j.subject("ana"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.elecciones.length()").value(2))
                .andExpect(jsonPath("$.elecciones[0].uid").value("ana"))
                .andExpect(jsonPath("$.elecciones[0].esMia").value(true))
                .andExpect(jsonPath("$.elecciones[1].esMia").value(false))
                .andExpect(jsonPath("$.elecciones[1].principal").doesNotExist())
                .andExpect(jsonPath("$.coinciden").value(false));
    }
}
