package es.cookyourweb.points.ia;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TipoServiceTest {

    private final ContenidoMetodoPort puerto = new ContenidoFicticio();
    private final TipoService servicio = new TipoService(puerto);
    private final ContenidoTipo contenido = puerto.contenidoDeTipo();

    private Map<String, Frecuencia> todas(Frecuencia f) {
        Map<String, Frecuencia> r = new HashMap<>();
        contenido.afirmaciones().forEach(a -> r.put(a.id(), f));
        return r;
    }

    private Map<String, Frecuencia> conColor(String colorId, Frecuencia f, Map<String, Frecuencia> base) {
        contenido.afirmaciones().stream().filter(a -> a.colorId().equals(colorId))
                .forEach(a -> base.put(a.id(), f));
        return base;
    }

    private Nivel nivelDe(Perfil p, String colorId) {
        return p.colores().stream().filter(n -> n.color().id().equals(colorId))
                .findFirst().orElseThrow().nivel();
    }

    @Test
    void todoNuncaDaNadaEnTodos() {
        Perfil p = servicio.perfil(todas(Frecuencia.NUNCA));
        assertThat(p.colores()).hasSize(5)
                .allSatisfy(n -> assertThat(n.nivel()).isEqualTo(Nivel.NADA));
    }

    @Test
    void mezclaDosColoresEnMucho() {
        Map<String, Frecuencia> r = todas(Frecuencia.NUNCA);
        conColor("rojo", Frecuencia.A_MENUDO, r);
        conColor("amarillo", Frecuencia.A_MENUDO, r);
        Perfil p = servicio.perfil(r);
        assertThat(nivelDe(p, "rojo")).isEqualTo(Nivel.MUCHO);
        assertThat(nivelDe(p, "amarillo")).isEqualTo(Nivel.MUCHO);
        assertThat(nivelDe(p, "verde")).isEqualTo(Nivel.NADA);
        assertThat(nivelDe(p, "azul")).isEqualTo(Nivel.NADA);
        assertThat(nivelDe(p, "negro")).isEqualTo(Nivel.NADA);
    }

    @Test
    void umbrales() {
        List<Afirmacion> rojas = contenido.afirmaciones().stream()
                .filter(a -> a.colorId().equals("rojo")).toList();
        Map<String, Frecuencia> r = todas(Frecuencia.NUNCA);

        r.put(rojas.get(0).id(), Frecuencia.A_VECES); // suma 1
        assertThat(nivelDe(servicio.perfil(r), "rojo")).isEqualTo(Nivel.ALGO);

        r.put(rojas.get(0).id(), Frecuencia.A_MENUDO); // suma 2
        assertThat(nivelDe(servicio.perfil(r), "rojo")).isEqualTo(Nivel.ALGO);

        r.put(rojas.get(1).id(), Frecuencia.A_VECES); // suma 3
        assertThat(nivelDe(servicio.perfil(r), "rojo")).isEqualTo(Nivel.MUCHO);
    }

    @Test
    void ordenDeDefinicion() {
        Perfil p = servicio.perfil(todas(Frecuencia.A_VECES));
        assertThat(p.colores()).extracting(n -> n.color().id())
                .containsExactly("verde", "rojo", "azul", "negro", "amarillo");
        assertThat(servicio.colores()).extracting(Color::id)
                .containsExactly("verde", "rojo", "azul", "negro", "amarillo");
    }

    @Test
    void esColorValido() {
        assertThat(servicio.esColorValido("rojo")).isTrue();
        assertThat(servicio.esColorValido("morado")).isFalse();
        assertThat(servicio.esColorValido(null)).isFalse();
    }

    @Test
    void respuestasIncompletasLanzan() {
        Map<String, Frecuencia> r = todas(Frecuencia.NUNCA);
        String falta = contenido.afirmaciones().get(3).id();
        r.remove(falta);
        assertThatThrownBy(() -> servicio.perfil(r))
                .isInstanceOfSatisfying(RespuestasInvalidasException.class,
                        e -> assertThat(e.ids()).containsExactly(falta));
    }

    @Test
    void afirmacionInexistenteLanza() {
        Map<String, Frecuencia> r = todas(Frecuencia.NUNCA);
        r.put("no-existe", Frecuencia.A_VECES);
        assertThatThrownBy(() -> servicio.perfil(r))
                .isInstanceOfSatisfying(RespuestasInvalidasException.class,
                        e -> assertThat(e.ids()).containsExactly("no-existe"));
    }

    @Test
    void determinista() {
        Map<String, Frecuencia> r = todas(Frecuencia.A_VECES);
        conColor("negro", Frecuencia.A_MENUDO, r);
        Perfil primero = servicio.perfil(r);
        for (int i = 0; i < 100; i++) {
            assertThat(servicio.perfil(r)).isEqualTo(primero);
        }
    }
}
