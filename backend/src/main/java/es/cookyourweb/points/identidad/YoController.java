package es.cookyourweb.points.identidad;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Devuelve lo que el servidor sabe de quien llama, leido del token ya verificado.
 * Nunca de un parametro de la peticion: el uid sale solo de la firma, porque
 * cualquier dato que mande el cliente se puede falsificar.
 */
@RestController
@RequestMapping("/api/me")
public class YoController {

    @GetMapping
    public Yo yo(@AuthenticationPrincipal Jwt jwt) {
        return new Yo(
                jwt.getSubject(),
                jwt.getClaimAsString("email"),
                jwt.getClaimAsBoolean("email_verified"),
                proveedor(jwt));
    }

    // Firebase anida el proveedor de inicio de sesion dentro del claim "firebase".
    private static String proveedor(Jwt jwt) {
        Map<String, Object> firebase = jwt.getClaimAsMap("firebase");
        return firebase == null ? null : (String) firebase.get("sign_in_provider");
    }
}
