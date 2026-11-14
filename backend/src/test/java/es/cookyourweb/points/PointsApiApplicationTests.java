package es.cookyourweb.points;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

// Sin esta propiedad la API no arranca a proposito (ver SeguridadConfig). El valor es de prueba.
@SpringBootTest(properties = "app.firebase.project-id=proyecto-test")
class PointsApiApplicationTests {

	@Test
	void contextLoads() {
	}

}
