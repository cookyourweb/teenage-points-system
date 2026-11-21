package es.cookyourweb.points.familia;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** La unica regla de pertenencia del backend, sin Mongo: el repositorio va mockeado. */
class AccesoFamiliaTest {

    private MembresiaRepository repository;
    private AccesoFamilia acceso;

    @BeforeEach
    void preparar() {
        repository = mock(MembresiaRepository.class);
        acceso = new AccesoFamilia(repository);
    }

    @Test
    void miembroActivoPasa() {
        when(repository.existsByUidAndFamilyIdAndEstado("u1", "f1", EstadoMembresia.ACTIVA)).thenReturn(true);

        assertThatCode(() -> acceso.requireMember("u1", "f1")).doesNotThrowAnyException();
        assertThat(acceso.esMiembro("u1", "f1")).isTrue();
    }

    @Test
    void noMiembroLanza404() {
        when(repository.existsByUidAndFamilyIdAndEstado("u1", "f1", EstadoMembresia.ACTIVA)).thenReturn(false);

        assertThatThrownBy(() -> acceso.requireMember("u1", "f1"))
                .isInstanceOf(FamiliaNoEncontradaException.class);
        assertThat(acceso.esMiembro("u1", "f1")).isFalse();
    }

    @Test
    void familyIdEnBlancoLanzaSinConsultar() {
        assertThatThrownBy(() -> acceso.requireMember("u1", " "))
                .isInstanceOf(FamiliaNoEncontradaException.class);
        verifyNoInteractions(repository);
    }

    @Test
    void uidNuloLanzaSinConsultar() {
        assertThatThrownBy(() -> acceso.requireMember(null, "f1"))
                .isInstanceOf(FamiliaNoEncontradaException.class);
        verifyNoInteractions(repository);
    }
}
