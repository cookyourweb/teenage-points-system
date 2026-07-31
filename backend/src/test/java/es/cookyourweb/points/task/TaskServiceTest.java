package es.cookyourweb.points.task;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests de la logica de tareas, sin Mongo y sin HTTP.
 *
 * El repositorio va mockeado a proposito: aqui se prueban las REGLAS, no que
 * Mongo sepa guardar. Con el Clock fijo se puede afirmar sobre las fechas en
 * vez de mirar hacia otro lado.
 */
class TaskServiceTest {

    private static final Instant AHORA = Instant.parse("2026-07-31T10:00:00Z");
    private static final Instant ANTES = Instant.parse("2026-01-15T09:00:00Z");

    private TaskRepository repository;
    private TaskService service;

    @BeforeEach
    void preparar() {
        repository = mock(TaskRepository.class);
        service = new TaskService(repository, Clock.fixed(AHORA, ZoneOffset.UTC));
    }

    private Task tareaValida() {
        return new Task(null, "Hacer la cama", TaskType.DIARIAS, 5,
                "fam-1", "madre-1", true, null, null, null);
    }

    @Test
    @DisplayName("al crear se sellan createdAt y updatedAt con la hora actual")
    void crearSellaLasFechas() {
        when(repository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));

        Task guardada = service.crear(tareaValida());

        assertThat(guardada.createdAt()).isEqualTo(AHORA);
        assertThat(guardada.updatedAt()).isEqualTo(AHORA);
    }

    @Test
    @DisplayName("al actualizar se conserva createdAt y solo cambia updatedAt")
    void actualizarNoPisaLaFechaDeAlta() {
        Task existente = new Task("t-1", "Hacer la cama", TaskType.DIARIAS, 5,
                "fam-1", "madre-1", true, null, ANTES, ANTES);
        when(repository.findById("t-1")).thenReturn(Optional.of(existente));
        when(repository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));

        Task cambios = new Task(null, "Hacer la cama bien", TaskType.DIARIAS, 8,
                "fam-1", "madre-1", true, null, null, null);
        Task resultado = service.actualizar("t-1", cambios);

        assertThat(resultado.nombre()).isEqualTo("Hacer la cama bien");
        assertThat(resultado.puntos()).isEqualTo(8);
        assertThat(resultado.createdAt()).isEqualTo(ANTES);
        assertThat(resultado.updatedAt()).isEqualTo(AHORA);
    }

    @Test
    @DisplayName("una tarea no puede cambiar de familia ni de autor al editarla")
    void actualizarIgnoraFamiliaYAutor() {
        Task existente = new Task("t-1", "Hacer la cama", TaskType.DIARIAS, 5,
                "fam-1", "madre-1", true, null, ANTES, ANTES);
        when(repository.findById("t-1")).thenReturn(Optional.of(existente));
        when(repository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));

        Task intruso = new Task(null, "Hacer la cama", TaskType.DIARIAS, 5,
                "fam-OTRA", "otro-usuario", true, null, null, null);
        Task resultado = service.actualizar("t-1", intruso);

        assertThat(resultado.familyId()).isEqualTo("fam-1");
        assertThat(resultado.createdBy()).isEqualTo("madre-1");
    }

    @Test
    @DisplayName("pedir una tarea que no existe falla en vez de devolver null")
    void porIdInexistenteLanza() {
        when(repository.findById("no-existe")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.porId("no-existe"))
                .isInstanceOf(TaskNotFoundException.class)
                .hasMessageContaining("no-existe");
    }

    @Test
    @DisplayName("borrar algo que no existe falla en vez de fingir que fue bien")
    void borrarInexistenteLanza() {
        when(repository.existsById("no-existe")).thenReturn(false);

        assertThatThrownBy(() -> service.borrar("no-existe"))
                .isInstanceOf(TaskNotFoundException.class);
        verify(repository, never()).deleteById(anyString());
    }

    @Test
    @DisplayName("las tareas activas se piden al repositorio, no se filtran en memoria")
    void activasDelegaEnElRepositorio() {
        Task activa = new Task("t-1", "Hacer la cama", TaskType.DIARIAS, 5,
                "fam-1", "madre-1", true, null, ANTES, ANTES);
        when(repository.findByFamilyIdAndIsActiveTrue("fam-1")).thenReturn(List.of(activa));

        assertThat(service.activasDeFamilia("fam-1")).containsExactly(activa);
        verify(repository).findByFamilyIdAndIsActiveTrue("fam-1");
        verify(repository, never()).findByFamilyId(anyString());
    }
}
