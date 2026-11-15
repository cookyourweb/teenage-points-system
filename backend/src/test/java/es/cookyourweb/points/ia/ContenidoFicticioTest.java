package es.cookyourweb.points.ia;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ContenidoFicticioTest {

    private final ContenidoTipo contenido = new ContenidoFicticio().contenidoDeTipo();

    @Test
    void losCincoColoresConSusIds() {
        assertThat(contenido.colores()).extracting(Color::id)
                .containsExactly("verde", "rojo", "azul", "negro", "amarillo");
        assertThat(contenido.colores()).extracting(Color::nombre)
                .containsExactly("Verde", "Rojo", "Azul", "Negro", "Amarillo");
    }

    @Test
    void descripcionesYAfirmacionesLlevanMarcaFicticio() {
        assertThat(contenido.colores()).isNotEmpty()
                .allSatisfy(c -> assertThat(c.descripcion()).contains("[FICTICIO]"));
        assertThat(contenido.afirmaciones()).hasSize(10)
                .allSatisfy(a -> assertThat(a.texto()).contains("[FICTICIO]"));
    }

    @Test
    void cadaAfirmacionApuntaAUnColorExistente() {
        List<String> ids = contenido.colores().stream().map(Color::id).toList();
        assertThat(contenido.afirmaciones()).isNotEmpty()
                .allSatisfy(a -> assertThat(ids).contains(a.colorId()));
    }

    @Test
    void cadaColorTieneAlMenosUnaAfirmacion() {
        assertThat(contenido.colores()).isNotEmpty().allSatisfy(c ->
                assertThat(contenido.afirmaciones()).anyMatch(a -> a.colorId().equals(c.id())));
    }

    @Test
    void idsDeAfirmacionNoRevelanElColor() {
        assertThat(contenido.afirmaciones()).hasSize(10).allSatisfy(a ->
                contenido.colores().forEach(c -> {
                    assertThat(a.id().toLowerCase()).doesNotContain(c.id().toLowerCase());
                    assertThat(a.id().toLowerCase()).doesNotContain(c.nombre().toLowerCase());
                }));
    }
}
