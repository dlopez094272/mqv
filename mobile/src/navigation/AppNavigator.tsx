import React from 'react';
import { useNavigation } from './Navigator';
import DashboardScreen from '../screens/DashboardScreen';
import PerfilScreen from '../screens/PerfilScreen';
import MisDatosScreen from '../screens/MisDatosScreen';
import CambiarPasswordScreen from '../screens/CambiarPasswordScreen';
import CancionesScreen from '../screens/CancionesScreen';
import CancionScreen from '../screens/CancionScreen';
import ServiciosScreen from '../screens/ServiciosScreen';
import ServicioScreen from '../screens/ServicioScreen';
import MisCursosScreen from '../screens/crecimiento/MisCursosScreen';
import CursoScreen from '../screens/crecimiento/CursoScreen';
import EvaluacionScreen from '../screens/crecimiento/EvaluacionScreen';
import ActividadesScreen from '../screens/actividades/ActividadesScreen';
import ActividadScreen from '../screens/actividades/ActividadScreen';
import ActividadFormScreen from '../screens/actividades/ActividadFormScreen';
import AsistenciaScreen from '../screens/actividades/AsistenciaScreen';
import CorreoScreen from '../screens/correo/CorreoScreen';
import CorreoLeerScreen from '../screens/correo/CorreoLeerScreen';
import CorreoRedactarScreen from '../screens/correo/CorreoRedactarScreen';
import VisorArchivoScreen from '../screens/VisorArchivoScreen';
import NotificacionesScreen from '../screens/NotificacionesScreen';
import TesoreriasScreen from '../screens/tesoreria/TesoreriasScreen';
import TesoreriaScreen from '../screens/tesoreria/TesoreriaScreen';
import MovimientoFormScreen from '../screens/tesoreria/MovimientoFormScreen';

export default function AppNavigator() {
  const { screen, screenKey } = useNavigation();

  switch (screen.name) {
    case 'notificaciones':
      return <NotificacionesScreen key={screenKey} />;
    case 'tesorerias':
      return <TesoreriasScreen key={screenKey} />;
    case 'tesoreria':
      return <TesoreriaScreen key={screenKey} id={screen.id} />;
    case 'movimientoForm':
      return <MovimientoFormScreen key={screenKey} idtesoreria={screen.idtesoreria} movimiento={screen.movimiento} />;
    case 'visor':
      return <VisorArchivoScreen key={screenKey} archivos={screen.archivos} indice={screen.indice} />;
    case 'perfil':
      return <PerfilScreen key={screenKey} />;
    case 'misDatos':
      return <MisDatosScreen key={screenKey} />;
    case 'cambiarPassword':
      return <CambiarPasswordScreen key={screenKey} />;
    case 'canciones':
      return <CancionesScreen key={screenKey} />;
    case 'cancion':
      return (
        <CancionScreen key={screenKey} id={screen.id} tono={screen.tono} titulo={screen.titulo}
                       servicio={screen.servicio} pos={screen.pos} escenarioInicial={screen.escenario} />
      );
    case 'servicios':
      return <ServiciosScreen key={screenKey} />;
    case 'servicio':
      return <ServicioScreen key={screenKey} id={screen.id} />;
    case 'misCursos':
      return <MisCursosScreen key={screenKey} />;
    case 'curso':
      return <CursoScreen key={screenKey} id={screen.id} />;
    case 'evaluacion':
      return <EvaluacionScreen key={screenKey} id={screen.id} nombre={screen.nombre} color={screen.color} logo={screen.logo} />;
    case 'actividades':
      return <ActividadesScreen key={screenKey} fecha={screen.fecha} />;
    case 'actividad':
      return <ActividadScreen key={screenKey} id={screen.id} />;
    case 'actividadForm':
      return <ActividadFormScreen key={screenKey} id={screen.id} fecha={screen.fecha} />;
    case 'asistencia':
      return <AsistenciaScreen key={screenKey} id={screen.id} nombre={screen.nombre} />;
    case 'correo':
      return <CorreoScreen key={screenKey} />;
    case 'correoLeer':
      return <CorreoLeerScreen key={screenKey} uid={screen.uid} carpeta={screen.carpeta} />;
    case 'correoRedactar':
      return <CorreoRedactarScreen key={screenKey} para={screen.para} cc={screen.cc} asunto={screen.asunto} cuerpo={screen.cuerpo} />;
    case 'dashboard':
    default:
      return <DashboardScreen key={screenKey} />;
  }
}
