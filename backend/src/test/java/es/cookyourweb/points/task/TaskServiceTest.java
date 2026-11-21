package es.cookyourweb.points.task;

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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
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

    private static final String UID = "madre-1";

    private TaskRepository repository;
    private MembresiaRepository membresias;
    private TaskService service;

    @BeforeEach
    void preparar() {
        repository = mock(TaskRepository.class);
        membresias = mock(MembresiaRepository.class);
        // AccesoFamilia REAL sobre un repositorio de membresias mockeado: asi la regla
        // de pertenencia que se prueba es la de verdad, no un doble que diga lo que quiero.
        service = new TaskService(repository, new AccesoFamilia(membresias),
                Clock.fixed(AHORA, ZoneOffset.UTC));
        esMiembro(UID, "fam-1");
    }

    private void esMiembro(String uid, String familyId) {
        when(membresias.existsByUidAndFamilyIdAndEstado(uid, familyId, EstadoMembresia.ACTIVA))
                .thenReturn(true);
    }

    private Task tareaValida() {
        return new Task(null, "Hacer la cama", TaskType.DIARIAS, 5,
                "fam-1", "madre-1", true, null, null, null);
    }

    @Test
    @DisplayName("al crear se sellan createdAt y updatedAt con la hora actual")
    void crearSellaLasFechas() {
        when(repository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));

        Task guardada = service.crear(UID, tareaValida());

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
        Task resultado = service.actualizar(UID, "t-1", cambios);

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
        Task resultado = service.actualizar(UID, "t-1", intruso);

        assertThat(resultado.familyId()).isEqualTo("fam-1");
        assertThat(resultado.createdBy()).isEqualTo("madre-1");
    }

    @Test
    @DisplayName("pedir una tarea que no existe falla en vez de devolver null")
    void porIdInexistenteLanza() {
        when(repository.findById("no-existe")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.porId(UID, "no-existe"))
                .isInstanceOf(TaskNotFoundException.class)
                .hasMessageContaining("no-existe");
    }

    @Test
    @DisplayName("borrar algo que no existe falla en vez de fingir que fue bien")
    void borrarInexistenteLanza() {
        // borrar ahora carga la tarea (para saber su familia) en vez de existsById.
        when(repository.findById("no-existe")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.borrar(UID, "no-existe"))
                .isInstanceOf(TaskNotFoundException.class);
        verify(repository, never()).deleteById(anyString());
    }

    @Test
    @DisplayName("las tareas activas se piden al repositorio, no se filtran en memoria")
    void activasDelegaEnElRepositorio() {
        Task activa = new Task("t-1", "Hacer la cama", TaskType.DIARIAS, 5,
                "fam-1", "madre-1", true, null, ANTES, ANTES);
        when(repository.findByFamilyIdAndIsActiveTrue("fam-1")).thenReturn(List.of(activa));

        assertThat(service.activasDeFamilia(UID, "fam-1")).containsExactly(activa);
        verify(repository).findByFamilyIdAndIsActiveTrue("fam-1");
        verify(repository, never()).findByFamilyId(anyString());
    }

    // ---- pertenencia a la familia ----

    private Task tareaEn(String id, String familyId) {
        return new Task(id, "Hacer la cama", TaskType.DIARIAS, 5,
                familyId, "otra-persona", true, null, ANTES, ANTES);
    }

    @Test
    @DisplayName("listar una familia ajena da 404 y ni se consulta el repositorio de tareas")
    void listarFamiliaAjenaDa404() {
        assertThatThrownBy(() -> service.deFamilia(UID, "f2"))
                .isInstanceOf(FamiliaNoEncontradaException.class);
        assertThatThrownBy(() -> service.activasDeFamilia(UID, "f2"))
                .isInstanceOf(FamiliaNoEncontradaException.class);
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("una tarea de otra familia se comporta como una que no existe (mismo error, mismo mensaje)")
    void tareaAjenaPorIdEsComoNoExistir() {
        when(repository.findById("t-ajena")).thenReturn(Optional.of(tareaEn("t-ajena", "f2")));
        when(repository.findById("t-fantasma")).thenReturn(Optional.empty());

        Throwable ajena = catchThrowable(() -> service.porId(UID, "t-ajena"));
        Throwable inexistente = catchThrowable(() -> service.porId(UID, "t-fantasma"));

        assertThat(ajena).isInstanceOf(TaskNotFoundException.class);
        // El mensaje solo cambia en el id pedido: no delata que la ajena existe.
        assertThat(ajena.getMessage()).isEqualTo("no existe la tarea t-ajena");
        assertThat(inexistente.getMessage()).isEqualTo("no existe la tarea t-fantasma");
    }

    @Test
    @DisplayName("crear en una familia ajena da 404 y no guarda nada")
    void crearEnFamiliaAjenaNoGuarda() {
        Task enAjena = new Task(null, "Hacer la cama", TaskType.DIARIAS, 5,
                "f2", null, true, null, null, null);

        assertThatThrownBy(() -> service.crear(UID, enAjena))
                .isInstanceOf(FamiliaNoEncontradaException.class);
        verify(repository, never()).save(any(Task.class));
    }

    @Test
    @DisplayName("al crear, el autor es el uid del token aunque el cuerpo diga otro")
    void crearUsaElUidDelToken() {
        when(repository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));
        Task conAutorFalso = new Task(null, "Hacer la cama", TaskType.DIARIAS, 5,
                "fam-1", "otro", true, null, null, null);

        Task guardada = service.crear(UID, conAutorFalso);

        assertThat(guardada.createdBy()).isEqualTo(UID);
    }

    @Test
    @DisplayName("actualizar no mueve la tarea a otra familia aunque el cuerpo lo pida")
    void actualizarNoCambiaDeFamilia() {
        esMiembro(UID, "f1");
        when(repository.findById("t-1")).thenReturn(Optional.of(tareaEn("t-1", "f1")));
        when(repository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));
        Task quiereMudarse = new Task(null, "Hacer la cama", TaskType.DIARIAS, 5,
                "f2", null, true, null, null, null);

        service.actualizar(UID, "t-1", quiereMudarse);

        ArgumentCaptor<Task> guardada = ArgumentCaptor.forClass(Task.class);
        verify(repository).save(guardada.capture());
        assertThat(guardada.getValue().familyId()).isEqualTo("f1");
    }

    @Test
    @DisplayName("actualizar una tarea ajena da 404 y no guarda")
    void actualizarAjenaDa404YNoGuarda() {
        when(repository.findById("t-ajena")).thenReturn(Optional.of(tareaEn("t-ajena", "f2")));

        assertThatThrownBy(() -> service.actualizar(UID, "t-ajena", tareaValida()))
                .isInstanceOf(TaskNotFoundException.class);
        verify(repository, never()).save(any(Task.class));
    }

    @Test
    @DisplayName("borrar una tarea ajena da 404 y no borra")
    void borrarAjenaDa404YNoBorra() {
        when(repository.findById("t-ajena")).thenReturn(Optional.of(tareaEn("t-ajena", "f2")));

        assertThatThrownBy(() -> service.borrar(UID, "t-ajena"))
                .isInstanceOf(TaskNotFoundException.class);
        verify(repository, never()).deleteById(anyString());
    }

    @Test
    @DisplayName("borrar una tarea propia la borra")
    void borrarPropiaBorra() {
        when(repository.findById("t-1")).thenReturn(Optional.of(tareaEn("t-1", "fam-1")));

        service.borrar(UID, "t-1");

        verify(repository).deleteById("t-1");
    }
}
