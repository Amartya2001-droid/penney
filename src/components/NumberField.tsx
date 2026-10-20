import { StyleSheet, Text, TextInput, View } from 'react-native';
import { radius, spacing } from '../constants/theme';
import { makeStyles, useTheme } from '../theme/useTheme';

interface NumberFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  hint?: string;
  autoFocus?: boolean;
}

export function NumberField({ label, value, onChangeText, placeholder, hint, autoFocus }: NumberFieldProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Text style={styles.prefix}>$</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? '0.00'}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          inputMode="decimal"
          autoFocus={autoFocus}
          returnKeyType="done"
          accessibilityLabel={label}
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    wrap: { gap: spacing.xs },
    label: { fontSize: 14, fontWeight: '600', color: colors.text },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
    },
    prefix: { fontSize: 18, color: colors.textMuted, marginRight: spacing.xs },
    input: { flex: 1, minHeight: 48, fontSize: 18, color: colors.text },
    hint: { fontSize: 12, color: colors.textMuted },
  }),
);
