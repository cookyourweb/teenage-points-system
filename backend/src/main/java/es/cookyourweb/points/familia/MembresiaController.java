package es.cookyourweb.points.familia;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * POST /api/membresias/yo: "hazme miembro de la familia que Firestore dice que es mia".
 * No lee el cuerpo a proposito: cualquier familyId que mande el navegador se ignora.
 */
@RestController
@RequestMapping("/api/membresias")
public class MembresiaController {

    private final MembresiaService servicio;

    public MembresiaController(MembresiaService servicio) {
        this.servicio = servicio;
    }

    @PostMapping("/yo")
    public Map<String, String> yo(@AuthenticationPrincipal Jwt jwt) {
        Membresia m = servicio.asegurarMiMembresia(jwt.getSubject(), jwt.getTokenValue());
        return Map.of("familyId", m.familyId(), "papel", m.papel().name());
    }
}
