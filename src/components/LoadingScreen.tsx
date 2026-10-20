import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { makeStyles, useTheme } from '../theme/useTheme';

export function LoadingScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  }),
);
