package es.cookyourweb.points.familia;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Crear tu membresia: el familyId lo da Firestore (puerto falso), nunca el navegador. */
class MembresiaServiceTest {

    private static final Instant AHORA = Instant.parse("2026-11-14T10:00:00Z");

    private MembresiaRepository repository;
    private PerfilFirestore perfil;
    private MembresiaService servicio;

    @BeforeEach
    void preparar() {
        repository = mock(MembresiaRepository.class);
        perfil = mock(PerfilFirestore.class);
        servicio = new MembresiaService(repository, perfil, Clock.fixed(AHORA, ZoneOffset.UTC));
    }

    @Test
    void creaLaMembresiaDeLaFamiliaQueDiceFirestore() {
        when(perfil.familyIdDe("ana", "tok-ana")).thenReturn(Optional.of("f1"));
        when(repository.findFirstByUidAndFamilyId("ana", "f1")).thenReturn(Optional.empty());
        when(repository.save(any(Membresia.class))).thenAnswer(i -> i.getArgument(0));

        Membresia m = servicio.asegurarMiMembresia("ana", "tok-ana");

        assertThat(m.uid()).isEqualTo("ana");
        assertThat(m.familyId()).isEqualTo("f1");
        assertThat(m.papel()).isEqualTo(Papel.ADULTO);
        assertThat(m.estado()).isEqualTo(EstadoMembresia.ACTIVA);
        assertThat(m.creadaEn()).isEqualTo(AHORA);
    }

    @Test
    void esIdempotente() {
        Membresia existente = new Membresia("m1", "ana", "f1", Papel.ADULTO, EstadoMembresia.ACTIVA, AHORA);
        when(perfil.familyIdDe("ana", "tok-ana")).thenReturn(Optional.of("f1"));
        when(repository.findFirstByUidAndFamilyId("ana", "f1"))
                .thenReturn(Optional.empty(), Optional.of(existente));
        when(repository.save(any(Membresia.class))).thenReturn(existente);

        Membresia primera = servicio.asegurarMiMembresia("ana", "tok-ana");
        Membresia segunda = servicio.asegurarMiMembresia("ana", "tok-ana");

        assertThat(primera).isEqualTo(segunda);
        verify(repository, times(1)).save(any(Membresia.class));
    }

    @Test
    void sinFamiliaEnFirestoreDa404() {
        when(perfil.familyIdDe("ana", "tok-ana")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.asegurarMiMembresia("ana", "tok-ana"))
                .isInstanceOf(FamiliaNoEncontradaException.class);
        verify(repository, never()).save(any(Membresia.class));
    }

    @Test
    void familyIdEnBlancoDa404SinGuardar() {
        when(perfil.familyIdDe("ana", "tok-ana")).thenReturn(Optional.of("  "));

        assertThatThrownBy(() -> servicio.asegurarMiMembresia("ana", "tok-ana"))
                .isInstanceOf(FamiliaNoEncontradaException.class);
        verify(repository, never()).save(any(Membresia.class));
    }

    @Test
    void uidEnBlancoNoGuardaNada() {
        assertThatThrownBy(() -> servicio.asegurarMiMembresia(" ", "tok"))
                .isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any(Membresia.class));
    }

    @Test
    void duplicadoPorCarreraDevuelveLaExistente() {
        Membresia ganadora = new Membresia("m1", "ana", "f1", Papel.ADULTO, EstadoMembresia.ACTIVA, AHORA);
        when(perfil.familyIdDe("ana", "tok-ana")).thenReturn(Optional.of("f1"));
        when(repository.findFirstByUidAndFamilyId("ana", "f1"))
                .thenReturn(Optional.empty(), Optional.of(ganadora));
        when(repository.save(any(Membresia.class))).thenThrow(new DuplicateKeyException("dup"));

        assertThat(servicio.asegurarMiMembresia("ana", "tok-ana")).isEqualTo(ganadora);
    }

    @Test
    void conMembresiasDuplicadasPreexistentesDevuelveUnaYNoLanza() {
        Membresia a = new Membresia("m1", "ana", "f1", Papel.ADULTO, EstadoMembresia.ACTIVA, AHORA);
        when(perfil.familyIdDe("ana", "tok-ana")).thenReturn(Optional.of("f1"));
        when(repository.findFirstByUidAndFamilyId("ana", "f1")).thenReturn(Optional.of(a));

        assertThat(servicio.asegurarMiMembresia("ana", "tok-ana")).isEqualTo(a);
        verify(repository, never()).save(any(Membresia.class));
    }
}
