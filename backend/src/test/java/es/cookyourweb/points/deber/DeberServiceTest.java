package es.cookyourweb.points.deber;

import es.cookyourweb.points.familia.AccesoFamilia;
import es.cookyourweb.points.familia.FamiliaNoEncontradaException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

/** Reglas de los deberes sin Mongo ni HTTP: repos y AccesoFamilia mockeados, reloj fijo. */
class DeberServiceTest {

    private static final Instant AHORA = Instant.parse("2027-03-09T10:00:00Z");
    private static final Instant T0 = Instant.parse("2027-01-15T09:00:00Z");
    private static final String E1 = "https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details";
    private static final String E2 = "https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO3/details";
    private static final String VIDEO = "https://www.youtube.com/watch?v=EJEMPLO5";
    // El mismo literal que CLAVE_MATERIAL de src/__tests__/deberesEnlaces.test.ts.
    private static final String CLAVE_MATERIAL = "MATERIAL https://www.youtube.com/watch?v=EJEMPLO5 "
            + "https://classroom.google.com/c/EJEMPLO1/a/EJEMPLO2/details";

    private DeberRepository repo;
    private ImportacionRepository importaciones;
    private AccesoFamilia acceso;
    private DeberService service;

    @BeforeEach
    void preparar() {
        repo = mock(DeberRepository.class);
        importaciones = mock(ImportacionRepository.class);
        acceso = mock(AccesoFamilia.class);
        service = new DeberService(repo, importaciones, acceso, Clock.fixed(AHORA, ZoneOffset.UTC));
        when(repo.save(any(Deber.class))).thenAnswer(i -> i.getArgument(0));
        when(importaciones.save(any(Importacion.class))).thenAnswer(i -> i.getArgument(0));
    }

    private static DeberCuerpo cuerpo(TipoDeber tipo, String enlace, String examen) {
        return new DeberCuerpo(tipo, "Lengua", LocalDate.parse("2027-03-15"), "Nuevo", enlace,
                "detalle", EstadoEntrega.PENDIENTE, false, examen, true);
    }

    private static Deber guardado(TipoDeber tipo, String enlace, String clave, String examen, boolean activo) {
        return new Deber("d1", "fA", "leo", "ana", tipo, "Lengua", LocalDate.parse("2027-03-10"), "Viejo",
                enlace, clave, null, EstadoEntrega.PENDIENTE, false, examen, activo, T0, T0);
    }

    private Deber guardadoAlActualizar(DeberCuerpo c) {
        service.actualizar("ana", "fA", "leo", "d1", c);
        ArgumentCaptor<Deber> captor = ArgumentCaptor.forClass(Deber.class);
        verify(repo).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void crearPoneFamiliaHijoCreadorClaveYFechasDeLaRutaYElToken() {
        service.crear("ana", "fA", "leo", cuerpo(TipoDeber.ENTREGA, E1, null));

        ArgumentCaptor<Deber> captor = ArgumentCaptor.forClass(Deber.class);
        verify(acceso).requireMember("ana", "fA");
        verify(repo).save(captor.capture());
        Deber d = captor.getValue();
        assertThat(d.id()).isNull();
        assertThat(d.familyId()).isEqualTo("fA");
        assertThat(d.hijoId()).isEqualTo("leo");
        assertThat(d.createdBy()).isEqualTo("ana");
        assertThat(d.clave()).isEqualTo(E1);
        assertThat(d.createdAt()).isEqualTo(AHORA);
        assertThat(d.updatedAt()).isEqualTo(AHORA);
    }

    @Test
    void laClaveDelMaterialEsLaDelFront() {
        service.crear("ana", "fA", "leo", cuerpo(TipoDeber.MATERIAL, VIDEO, E1));

        ArgumentCaptor<Deber> captor = ArgumentCaptor.forClass(Deber.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().clave()).isEqualTo(CLAVE_MATERIAL);
    }

    @Test
    void laClaveDelMaterialSinExamenConservaElEspacioFinalComoElFront() {
        assertThat(Deber.claveDe(TipoDeber.MATERIAL, VIDEO, null)).isEqualTo("MATERIAL " + VIDEO + " ");
        assertThat(Deber.claveDe(TipoDeber.MATERIAL, VIDEO, "")).isEqualTo("MATERIAL " + VIDEO + " ");
    }

    @Test
    void laClaveCanonicaQuitaCuentaAuthuserBarraYAncla() {
        // Mismos casos que quitaLaCuentaDeLaRuta del front: la clave de Classroom no depende de la cuenta.
        assertThat(Deber.claveDe(TipoDeber.ENTREGA, "https://classroom.google.com/u/1/c/EJEMPLO1/a/EJEMPLO2/details/", null))
                .isEqualTo(E1);
        assertThat(Deber.claveDe(TipoDeber.ENTREGA, E1 + "?authuser=2#x", null)).isEqualTo(E1);
        assertThat(Deber.claveDe(TipoDeber.EXAMEN, "https://EJEMPLO.com/p#frag", null))
                .isEqualTo("https://ejemplo.com/p");
        assertThat(Deber.claveDe(TipoDeber.AVISO, "https://ejemplo.com", null)).isEqualTo("https://ejemplo.com/");
    }

    @Test
    void crearEnFamiliaAjenaNoGuarda() {
        doThrow(new FamiliaNoEncontradaException()).when(acceso).requireMember("ana", "fB");

        assertThatThrownBy(() -> service.crear("ana", "fB", "leo", cuerpo(TipoDeber.ENTREGA, E1, null)))
                .isInstanceOf(FamiliaNoEncontradaException.class);
        verify(repo, never()).save(any());
    }

    @Test
    void claveRepetidaEs409() {
        when(repo.save(any(Deber.class))).thenThrow(new DuplicateKeyException("dup"));

        assertThatThrownBy(() -> service.crear("ana", "fA", "leo", cuerpo(TipoDeber.ENTREGA, E1, null)))
                .isInstanceOf(DeberDuplicadoException.class);
    }

    @Test
    void actualizarConservaIdentidad() {
        when(repo.findById("d1")).thenReturn(Optional.of(guardado(TipoDeber.ENTREGA, E1, E1, null, true)));

        Deber d = guardadoAlActualizar(cuerpo(TipoDeber.ENTREGA, E2, null));

        assertThat(d.id()).isEqualTo("d1");
        assertThat(d.enlace()).isEqualTo(E1);
        assertThat(d.clave()).isEqualTo(E1);
        assertThat(d.createdBy()).isEqualTo("ana");
        assertThat(d.createdAt()).isEqualTo(T0);
        assertThat(d.titulo()).isEqualTo("Nuevo");
        assertThat(d.updatedAt()).isEqualTo(AHORA);
    }

    @Test
    void actualizarUnMaterialConservaTambienSuExamen() {
        when(repo.findById("d1")).thenReturn(Optional.of(
                guardado(TipoDeber.MATERIAL, VIDEO, CLAVE_MATERIAL, E1, true)));

        Deber d = guardadoAlActualizar(cuerpo(TipoDeber.MATERIAL, VIDEO, E2));

        assertThat(d.examen()).isEqualTo(E1);
        assertThat(d.clave()).isEqualTo(CLAVE_MATERIAL);
    }

    @Test
    void archivarSeConservaYEditarNoDesarchiva() {
        // Guarda de regla: un deber archivado no vuelve a activo por mandar isActive=true.
        when(repo.findById("d1")).thenReturn(Optional.of(guardado(TipoDeber.ENTREGA, E1, E1, null, false)));

        assertThat(guardadoAlActualizar(cuerpo(TipoDeber.ENTREGA, E1, null)).isActive()).isFalse();
    }

    @Test
    void actualizarConOtraFamiliaUOtroHijoEnLaRutaEs404() {
        when(repo.findById("d1")).thenReturn(Optional.of(guardado(TipoDeber.ENTREGA, E1, E1, null, true)));

        // ana es miembro de fA y fC (el mock no lanza): el 404 sale de comparar con lo GUARDADO.
        assertThatThrownBy(() -> service.actualizar("ana", "fC", "leo", "d1", cuerpo(TipoDeber.ENTREGA, E1, null)))
                .isInstanceOf(DeberNoEncontradoException.class);
        assertThatThrownBy(() -> service.actualizar("ana", "fA", "mia", "d1", cuerpo(TipoDeber.ENTREGA, E1, null)))
                .isInstanceOf(DeberNoEncontradoException.class);
        verify(repo, never()).save(any());
    }

    @Test
    void actualizarInexistenteEs404() {
        when(repo.findById("d9")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.actualizar("ana", "fA", "leo", "d9", cuerpo(TipoDeber.ENTREGA, E1, null)))
                .isInstanceOf(DeberNoEncontradoException.class);
    }

    @Test
    void deHijoCompruebaLaFamiliaYFiltraActivos() {
        Deber activo = guardado(TipoDeber.ENTREGA, E1, E1, null, true);
        when(repo.findByFamilyIdAndHijoId("fA", "leo")).thenReturn(List.of(activo, guardado(TipoDeber.AVISO, E2, E2, null, false)));
        when(repo.findByFamilyIdAndHijoIdAndIsActiveTrue("fA", "leo")).thenReturn(List.of(activo));

        assertThat(service.deHijo("ana", "fA", "leo", false)).hasSize(2);
        assertThat(service.deHijo("ana", "fA", "leo", true)).containsExactly(activo);
        verify(acceso, org.mockito.Mockito.times(2)).requireMember("ana", "fA");
    }

    @Test
    void registrarImportacionEsUnoPorHijo() {
        Importacion i = service.registrarImportacion("ana", "fA", "leo");

        verify(acceso).requireMember("ana", "fA");
        assertThat(i).isEqualTo(new Importacion("fA/leo", "fA", "leo", "ana", AHORA));
        verify(importaciones).save(new Importacion("fA/leo", "fA", "leo", "ana", AHORA));
    }

    @Test
    void ultimaImportacionLeePorIdTrasRequireMember() {
        Importacion guardada = new Importacion("fA/leo", "fA", "leo", "ana", T0);
        when(importaciones.findById("fA/leo")).thenReturn(Optional.of(guardada));

        assertThat(service.ultimaImportacion("ana", "fA", "leo")).contains(guardada);
        verify(acceso).requireMember("ana", "fA");
    }
}
