import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';

export function LoadingScreen() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
