package es.cookyourweb.points.ia;

import es.cookyourweb.points.familia.AccesoFamilia;
import es.cookyourweb.points.familia.EstadoMembresia;
import es.cookyourweb.points.familia.FamiliaNoEncontradaException;
import es.cookyourweb.points.familia.MembresiaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Reglas de la eleccion de cada adulto, sin Mongo ni HTTP. AccesoFamilia es el real. */
class EleccionTipoServiceTest {

    private static final Instant AHORA = Instant.parse("2026-11-15T10:00:00Z");
    private static final String FAMILIA = "fA";
    private static final String HIJO = "h1";

    private EleccionTipoRepository repositorio;
    private MembresiaRepository membresias;
    private EleccionTipoService servicio;

    @BeforeEach
    void preparar() {
        repositorio = mock(EleccionTipoRepository.class);
        membresias = mock(MembresiaRepository.class);
        when(repositorio.save(any(EleccionTipo.class))).thenAnswer(i -> i.getArgument(0));
        servicio = new EleccionTipoService(repositorio, new AccesoFamilia(membresias),
                new TipoService(new ContenidoFicticio()), Clock.fixed(AHORA, ZoneOffset.UTC));
        esMiembro("ana");
        esMiembro("beto");
    }

    private void esMiembro(String uid) {
        when(membresias.existsByUidAndFamilyIdAndEstado(uid, FAMILIA, EstadoMembresia.ACTIVA)).thenReturn(true);
    }

    private static EleccionTipo de(String uid, String principal, String... colores) {
        return new EleccionTipo("id-" + uid, FAMILIA, HIJO, uid, List.of(colores), principal, AHORA);
    }

    private void existen(EleccionTipo... elecciones) {
        when(repositorio.findByFamilyIdAndHijoId(FAMILIA, HIJO)).thenReturn(List.of(elecciones));
    }

    @Test
    @DisplayName("guarda la eleccion del adulto con su uid, el reloj inyectado y los colores en orden de definicion")
    void guardaLaDelAdulto() {
        EleccionTipo r = servicio.guardar("ana", FAMILIA, HIJO, List.of("amarillo", "rojo"), "rojo");

        ArgumentCaptor<EleccionTipo> c = ArgumentCaptor.forClass(EleccionTipo.class);
        verify(repositorio).save(c.capture());
        EleccionTipo g = c.getValue();
        assertThat(g.uid()).isEqualTo("ana");
        assertThat(g.familyId()).isEqualTo(FAMILIA);
        assertThat(g.hijoId()).isEqualTo(HIJO);
        assertThat(g.colores()).containsExactly("rojo", "amarillo");
        assertThat(g.principal()).isEqualTo("rojo");
        assertThat(g.elegidaEn()).isEqualTo(AHORA);
        assertThat(r).isEqualTo(g);
    }

    @Test
    @DisplayName("varios colores sin principal es valido")
    void variosColoresSinPrincipal() {
        EleccionTipo r = servicio.guardar("ana", FAMILIA, HIJO, List.of("verde", "azul", "negro"), null);
        assertThat(r.colores()).containsExactly("verde", "azul", "negro");
        assertThat(r.principal()).isNull();
    }

    @Test
    @DisplayName("un segundo guardado reutiliza el id de la eleccion existente: sustituye, no duplica")
    void sustituyeNoDuplica() {
        EleccionTipo previa = new EleccionTipo("mongo-1", FAMILIA, HIJO, "ana", List.of("rojo"), null,
                Instant.parse("2026-01-01T00:00:00Z"));
        when(repositorio.findFirstByFamilyIdAndHijoIdAndUid(FAMILIA, HIJO, "ana")).thenReturn(Optional.of(previa));

        servicio.guardar("ana", FAMILIA, HIJO, List.of("azul"), "azul");

        ArgumentCaptor<EleccionTipo> c = ArgumentCaptor.forClass(EleccionTipo.class);
        verify(repositorio).save(c.capture());
        assertThat(c.getValue().id()).isEqualTo("mongo-1");
        assertThat(c.getValue().colores()).containsExactly("azul");
        assertThat(c.getValue().elegidaEn()).isEqualTo(AHORA);
    }

    @Test
    @DisplayName("lista vacia, nula, color inexistente, repetidos o principal fuera de los marcados dan EleccionInvalida y no guardan")
    void eleccionInvalida() {
        assertInvalida(null, null);
        assertInvalida(List.of(), null);
        assertInvalida(List.of("morado"), null);
        assertInvalida(Arrays.asList("rojo", null), null);
        assertInvalida(List.of("rojo", "rojo"), null);
        assertInvalida(List.of("rojo", "azul"), "verde");
        assertInvalida(List.of("rojo"), "morado");
        assertInvalida(List.of("rojo"), "");
        verify(repositorio, never()).save(any());
    }

    private void assertInvalida(List<String> colores, String principal) {
        assertThatThrownBy(() -> servicio.guardar("ana", FAMILIA, HIJO, colores, principal))
                .isInstanceOf(EleccionInvalidaException.class);
    }

    @Test
    @DisplayName("quien no es de la familia recibe 404 al guardar y al listar, y no se toca el repositorio")
    void otraFamiliaDa404() {
        assertThatThrownBy(() -> servicio.guardar("intruso", FAMILIA, HIJO, List.of("rojo"), null))
                .isInstanceOf(FamiliaNoEncontradaException.class);
        assertThatThrownBy(() -> servicio.listar("intruso", FAMILIA, HIJO))
                .isInstanceOf(FamiliaNoEncontradaException.class);
        verifyNoInteractions(repositorio);
    }

    @Test
    @DisplayName("la pertenencia se comprueba antes que la validacion: un ajeno con cuerpo invalido ve 404, no 400")
    void ajenoConCuerpoInvalidoVe404() {
        assertThatThrownBy(() -> servicio.guardar("intruso", FAMILIA, HIJO, List.of(), null))
                .isInstanceOf(FamiliaNoEncontradaException.class);
    }

    @Test
    @DisplayName("el uid de la eleccion guardada es siempre el del token que llega, nunca otro")
    void noPuedeEscribirLaDeOtroAdulto() {
        servicio.guardar("ana", FAMILIA, HIJO, List.of("rojo"), null);
        verify(repositorio).findFirstByFamilyIdAndHijoIdAndUid(FAMILIA, HIJO, "ana");
        verify(repositorio, never()).findFirstByFamilyIdAndHijoIdAndUid(FAMILIA, HIJO, "beto");
        ArgumentCaptor<EleccionTipo> c = ArgumentCaptor.forClass(EleccionTipo.class);
        verify(repositorio).save(c.capture());
        assertThat(c.getValue().uid()).isEqualTo("ana");
    }

    @Test
    @DisplayName("listar marca esMia solo en la del uid del token")
    void marcaEsMia() {
        existen(de("ana", null, "rojo"), de("beto", null, "rojo"));
        EleccionTipoService.Listado l = servicio.listar("ana", FAMILIA, HIJO);
        assertThat(l.elecciones()).extracting(EleccionTipoService.Item::uid, EleccionTipoService.Item::esMia)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("ana", true),
                        org.assertj.core.groups.Tuple.tuple("beto", false));
    }

    @Test
    @DisplayName("coinciden es true con una sola eleccion y con ninguna")
    void coincidenConUnaOCero() {
        existen();
        assertThat(servicio.listar("ana", FAMILIA, HIJO).coinciden()).isTrue();
        existen(de("ana", "rojo", "rojo"));
        assertThat(servicio.listar("ana", FAMILIA, HIJO).coinciden()).isTrue();
    }

    @Test
    @DisplayName("coinciden es false si difiere el principal")
    void coincidenFalsoSiDifiereElPrincipal() {
        existen(de("ana", "rojo", "rojo", "azul"), de("beto", "azul", "rojo", "azul"));
        assertThat(servicio.listar("ana", FAMILIA, HIJO).coinciden()).isFalse();
        existen(de("ana", "rojo", "rojo", "azul"), de("beto", null, "rojo", "azul"));
        assertThat(servicio.listar("ana", FAMILIA, HIJO).coinciden()).isFalse();
    }

    @Test
    @DisplayName("coinciden es false si difiere el conjunto de colores")
    void coincidenFalsoSiDifiereElConjunto() {
        existen(de("ana", null, "rojo", "azul"), de("beto", null, "rojo", "verde"));
        assertThat(servicio.listar("ana", FAMILIA, HIJO).coinciden()).isFalse();
        existen(de("ana", null, "rojo"), de("beto", null, "rojo", "azul"));
        assertThat(servicio.listar("ana", FAMILIA, HIJO).coinciden()).isFalse();
    }

    @Test
    @DisplayName("coinciden es true aunque el orden del cuerpo cambie, porque se guardan ordenados")
    void coincidenVerdaderoAunqueElOrdenDelCuerpoCambie() {
        EleccionTipo a = servicio.guardar("ana", FAMILIA, HIJO, List.of("amarillo", "rojo"), "rojo");
        EleccionTipo b = servicio.guardar("beto", FAMILIA, HIJO, List.of("rojo", "amarillo"), "rojo");
        existen(a, b);
        assertThat(servicio.listar("ana", FAMILIA, HIJO).coinciden()).isTrue();
    }
}
