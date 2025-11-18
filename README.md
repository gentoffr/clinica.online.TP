# Clínica Online

## Descripción general
Clínica Online es un portal desarrollado con Angular orientado a digitalizar la gestión de turnos, pacientes y profesionales de salud. El proyecto ofrece flujos diferenciados para pacientes, especialistas y administradores, integrando:

- **Ingreso guiado** mediante una pantalla de bienvenida y un host de autenticación que concentra login y registro.
- **Paneles según rol**: cada perfil accede a su propio home (`/home-paciente`, `/home-especialista`, `/home-administrador`) con widgets y acciones personalizadas.
- **Gestión integral de turnos** con un wizard de tres pasos, filtros dinámicos, exportes a PDF/Excel y seguimiento de estados.
- **Herramientas colaborativas** como historial de pacientes, reseñas y reportes gráficos para la dirección médica.

> La app se ejecuta con `ng serve` y utiliza Firebase para persistencia y hosting (ver `firebase.json`).

## Pantallas principales
### 1. Bienvenida e ingreso (`/inicio`)
- **Hero motivacional** con mensaje "Tu salud es nuestra prioridad" y botones rápidos de Ingresar/Registrarse.
- **Transición al host de autenticación**, que despliega los formularios en un carrusel compacto.
<img width="571" height="549" alt="imagen" src="https://github.com/user-attachments/assets/00729fe5-71c2-4908-9502-171198d067cf" />

### 2. Inicio de sesión
- Galería horizontal de usuarios precargados con colores según rol y accesos rápidos mediante captcha renovable.
- Validaciones accesibles, recordatorios de errores y leyenda de perfiles para reconocer cada tipo de cuenta.
- Botones para regresar a la bienvenida o saltar directamente al registro.
<img width="634" height="573" alt="imagen" src="https://github.com/user-attachments/assets/0f9af951-2a45-43ab-adb2-05d2c1ac0d2f" />


### 3. Registro de usuarios
- Toggle superior para alternar el formulario de paciente/especialista.
- Campos validados (nombre, DNI, edad, obra social o especialidad). Los pacientes suben dos fotos, los especialistas definen una o agregan nuevas especialidades mediante chips.
- Asistente paso a paso con ayuda contextual y botones primarios/ secundarios para navegar sin perder datos.
<img width="1026" height="613" alt="imagen" src="https://github.com/user-attachments/assets/9333b8f0-fada-4a4e-981b-693493760e45" />

### 4. Dashboard paciente (`/home-paciente`)
- **Sidebar fija** con avatar, datos y menú de acciones; el perfil abre un modal editable.
- **Topbar responsiva** con buscadores y accesos rápidos al menú hamburguesa.
- **Paneles principales**:
  - *Acción rápida*: integra el componente `app-registro-turno` para sacar turnos sin salir del tablero.
  - *Mis turnos*: listado con tarjetas clicables, filtros de fecha/estado y modal detallado con reseñas, calificaciones y motivos de cancelación.
<img width="1358" height="721" alt="imagen" src="https://github.com/user-attachments/assets/1cab8c44-c274-4443-ab05-723041477706" />


### 5. Dashboard especialista (`/home-especialista`)
- Menú lateral que alterna entre "Mis turnos" y "Mis pacientes" para mostrar los módulos correspondientes.
- Panel expandible que actúa como workspace: ejecutar turnos, registrar atención en `app-turno`, cargar reseñas, detallar motivos de cancelación o revisar el historial del paciente.
- Tarjetas de pacientes con sus últimos tres turnos, permitiendo cerrar el panel o volver a la grilla sin recargar la página.
<img width="1351" height="647" alt="imagen" src="https://github.com/user-attachments/assets/39cca7ca-6096-4867-b261-621c12c927dd" />
<img width="1353" height="654" alt="imagen" src="https://github.com/user-attachments/assets/71367b97-0ee5-4119-bbd0-796601112f90" />

### 6. Dashboard administrador (`/home-administrador`)
- Vista de **Usuarios** con scroll asistido, indicadores de posición y acciones rápidas como exportar planillas o descargar historiales en PDF desde la modal.
- Vista de **Reportes** con filtros por especialidad, refresco manual y mensajes de estado (cargando, error, sin datos). Incluye además un panel de "Turnos entregados" filtrable por rango de fechas.
- Widget de **Acción rápida** (versión administrativa) que permite agendar turnos para terceros solicitando el email del paciente.
<img width="1358" height="652" alt="imagen" src="https://github.com/user-attachments/assets/bcd89184-aa1a-45e0-9a03-1ae18c221e9d" />
<img width="1360" height="658" alt="imagen" src="https://github.com/user-attachments/assets/48799625-751b-4d0c-9c98-93c0afc25968" />

## Accesos a las secciones
| Ruta | Quién la usa | Contenido principal |
| --- | --- | --- |
| `/inicio` | Público | Pantalla de bienvenida + host de autenticación con opciones de login y registro. |
| `/home-paciente` | Pacientes autenticados | Dashboard con registro rápido de turnos, listado interactivo, modal con reseñas y toasts informativos. |
| `/home-especialista` | Especialistas | Control de turnos, gestión de pacientes, ejecución y cierre de atenciones (incluye reseñas y cancelaciones con motivos). |
| `/home-administrador` | Administradores | Administración de usuarios, reportes de turnos diarios, filtros avanzados, registro asistido para terceros. |

> El router redirige `"" -> /inicio` (ver `src/app/core/core.routing.ts`). Cada home verifica el rol en su componente `*.ts` para garantizar que sólo el perfil correcto acceda al tablero correspondiente.

## Contenido de cada módulo destacado
- **`features/listado-turnos`**: tarjetas responsive con estados visuales (carga, error, vacío), controles de orden, filtros por especialidad y modal con acciones contextuales (confirmar, ejecutar, archivar, calificar, ver motivos).
- **`features/listado-usuarios`**: galería de usuarios con skeletons, exportación a Excel, modal de detalle con datos personales y botón que dispara la descarga de historial mediante `app-pdf`.
- **`features/mis-pacientes`**: tarjetas con avatar, correo y acceso al detalle. Al seleccionar uno, el dashboard especialista despliega los últimos turnos y acciones asociadas.
- **`core/home/registro-turno`**: wizard de tres pasos con modales auxiliares (especialidades, especialistas, selector de turnos de 15 días) y validaciones por paso. Acepta modo administrador (requiere email del paciente) o modo paciente (sin campo extra).
- **`features/perfil-modal`**: modal reutilizable para mostrar/editar datos de perfil desde cualquier home.

## Cómo empezar a usarla localmente
1. Instalar dependencias: `npm install`.
2. Lanzar el servidor: `ng serve`.
3. Abrir `http://localhost:4200/` y elegir "Ingresar" en la pantalla de bienvenida.
4. Según el rol del usuario, el login redirige automáticamente al home correspondiente.

Con esta guía podés ubicar cada sección, comprender qué ofrece y cómo acceder rápidamente desde la pantalla adecuada. Sustituí los marcadores *(pantalla)* por capturas reales cuando estén disponibles.
