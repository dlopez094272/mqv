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

export default function AppNavigator() {
  const { screen, screenKey } = useNavigation();

  switch (screen.name) {
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
    case 'dashboard':
    default:
      return <DashboardScreen key={screenKey} />;
  }
}
