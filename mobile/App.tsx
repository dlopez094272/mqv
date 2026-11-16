import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NavigationProvider } from './src/navigation/Navigator';
import AppNavigator from './src/navigation/AppNavigator';
import IntroAnimada from './src/components/IntroAnimada';
import LoginScreen from './src/screens/LoginScreen';
import CambiarPasswordScreen from './src/screens/CambiarPasswordScreen';
import ActualizarScreen from './src/screens/ActualizarScreen';
import GestorNotificaciones from './src/components/GestorNotificaciones';
import { colors } from './src/theme';

function Root() {
  const { token, loading, debeCambiarPassword, actualizacion } = useAuth();
  const [introTerminada, setIntroTerminada] = useState(false);
  const terminarIntro = useCallback(() => setIntroTerminada(true), []);

  return (
    <View style={styles.flex}>
      {!loading && actualizacion ? (
        // Versión de la app ya no permitida: solo se puede actualizar
        <ActualizarScreen info={actualizacion} />
      ) : !loading &&
        (token ? (
          <NavigationProvider>
            {/* Primer ingreso: hay que cambiar la contraseña temporal antes de seguir */}
            {debeCambiarPassword ? <CambiarPasswordScreen obligatorio /> : <><AppNavigator /><GestorNotificaciones /></>}
          </NavigationProvider>
        ) : (
          <LoginScreen listo={introTerminada} />
        ))}
      {!introTerminada && <IntroAnimada listo={!loading} onFin={terminarIntro} />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AuthProvider>
          <Root />
        </AuthProvider>
        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  flex: { flex: 1, backgroundColor: colors.bg },
});
