package es.cookyourweb.points.ia;

import es.cookyourweb.points.familia.AccesoFamilia;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * La eleccion de cada adulto sobre los colores de su hijo.
 *
 * Seguridad: la pertenencia se comprueba PRIMERO (un ajeno ve 404 aunque su cuerpo sea
 * invalido) y el uid llega siempre del token. hijoId no se valida contra Firestore
 * (los hijos viven alli): la frontera es la familia.
 */
@Service
public class EleccionTipoService {

    /** Una eleccion tal como se le muestra a la familia. */
    public record Item(String uid, List<String> colores, String principal, Instant elegidaEn, boolean esMia) {}

    public record Listado(List<Item> elecciones, boolean coinciden) {}

    private final EleccionTipoRepository repositorio;
    private final AccesoFamilia acceso;
    private final TipoService tipos;
    private final Clock reloj;

    public EleccionTipoService(EleccionTipoRepository repositorio, AccesoFamilia acceso,
                               TipoService tipos, Clock reloj) {
        this.repositorio = repositorio;
        this.acceso = acceso;
        this.tipos = tipos;
        this.reloj = reloj;
    }

    /** Crea o sustituye la eleccion del propio adulto (upsert por familyId, hijoId, uid). */
    public EleccionTipo guardar(String uid, String familyId, String hijoId, List<String> colores, String principal) {
        acceso.requireMember(uid, familyId);
        List<String> ordenados = validarYOrdenar(colores, principal);
        Instant ahora = reloj.instant();
        try {
            return sustituir(uid, familyId, hijoId, ordenados, principal, ahora);
        } catch (DuplicateKeyException carrera) {
            // Dos primeros PUT a la vez: el indice unico dejo pasar uno; el otro reintenta y sustituye.
            return sustituir(uid, familyId, hijoId, ordenados, principal, ahora);
        }
    }

    public Listado listar(String uid, String familyId, String hijoId) {
        acceso.requireMember(uid, familyId);
        List<EleccionTipo> guardadas = repositorio.findByFamilyIdAndHijoId(familyId, hijoId);
        List<Item> items = guardadas.stream()
                .map(e -> new Item(e.uid(), e.colores(), e.principal(), e.elegidaEn(), uid.equals(e.uid())))
                .toList();
        return new Listado(items, coinciden(guardadas));
    }

    private EleccionTipo sustituir(String uid, String familyId, String hijoId, List<String> colores,
                                   String principal, Instant ahora) {
        String id = repositorio.findFirstByFamilyIdAndHijoIdAndUid(familyId, hijoId, uid)
                .map(EleccionTipo::id).orElse(null);
        return repositorio.save(new EleccionTipo(id, familyId, hijoId, uid, colores, principal, ahora));
    }

    /** Todos los adultos con el mismo conjunto de colores y el mismo principal (null == null). */
    private static boolean coinciden(List<EleccionTipo> elecciones) {
        if (elecciones.size() < 2) {
            return true;
        }
        EleccionTipo primera = elecciones.get(0);
        Set<String> conjunto = new HashSet<>(primera.colores());
        return elecciones.stream().allMatch(e ->
                new HashSet<>(e.colores()).equals(conjunto)
                        && java.util.Objects.equals(e.principal(), primera.principal()));
    }

    private List<String> validarYOrdenar(List<String> colores, String principal) {
        List<String> problemas = new ArrayList<>();
        if (colores == null || colores.isEmpty()) {
            problemas.add("colores");
        } else {
            Set<String> vistos = new HashSet<>();
            for (String c : colores) {
                if (!tipos.esColorValido(c) || !vistos.add(c)) {
                    problemas.add("colores");
                    break;
                }
            }
            if (principal != null && !colores.contains(principal)) {
                problemas.add("principal");
            }
        }
        if (!problemas.isEmpty()) {
            throw new EleccionInvalidaException(problemas);
        }
        // Orden de definicion de los colores: asi dos adultos con el mismo conjunto guardan la misma lista.
        List<String> orden = tipos.colores().stream().map(Color::id).toList();
        return colores.stream().sorted(java.util.Comparator.comparingInt(orden::indexOf)).toList();
    }
}
