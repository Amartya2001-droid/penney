import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_META } from '../constants/categories';
import { radius, spacing } from '../constants/theme';
import type { Transaction } from '../types';
import { formatShortDate } from '../utils/formatDate';
import { formatCurrency } from '../utils/money';
import { makeStyles } from '../theme/useTheme';

interface TransactionRowProps {
  transaction: Transaction;
  onRemove: () => void;
  /** Tapping the row opens it for editing. */
  onPress?: () => void;
  /** Hide the date when rows are already grouped under a date heading. */
  showDate?: boolean;
}

export function TransactionRow({ transaction, onRemove, onPress, showDate = true }: TransactionRowProps) {
  const styles = useStyles();
  const label = CATEGORY_META[transaction.category].label;
  const amount = formatCurrency(transaction.amount);
  const meta = [showDate ? formatShortDate(transaction.date) : null, transaction.description || null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${label}, ${amount}${transaction.description ? `, ${transaction.description}` : ''}`}
        accessibilityHint={onPress ? 'Opens this expense for editing' : undefined}
        style={({ pressed }) => [styles.main, pressed && onPress ? styles.mainPressed : null]}
      >
        <View style={styles.text}>
          <View style={styles.titleRow}>
            <Text style={styles.category}>{label}</Text>
            <View
              style={[styles.badge, transaction.is_essential ? styles.badgeEssential : styles.badgeDiscretionary]}
            >
              <Text style={styles.badgeText}>{transaction.is_essential ? 'Essential' : 'Discretionary'}</Text>
            </View>
          </View>
          {meta ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        <Text style={styles.amount}>{amount}</Text>
      </Pressable>
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${label} expense of ${amount}`}
        style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}
      >
        <Text style={styles.removeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    main: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: radius.sm,
    },
    mainPressed: { backgroundColor: colors.surfaceMuted },
    text: { flex: 1, gap: 2 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    category: { fontSize: 15, fontWeight: '600', color: colors.text },
    badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 1 },
    badgeEssential: { backgroundColor: colors.badgeEssential },
    badgeDiscretionary: { backgroundColor: colors.badgeDiscretionary },
    badgeText: { fontSize: 11, fontWeight: '600', color: colors.text },
    meta: { fontSize: 13, color: colors.textMuted },
    amount: { fontSize: 15, fontWeight: '700', color: colors.text },
    remove: { padding: spacing.xs, borderRadius: radius.sm },
    removePressed: { backgroundColor: colors.surfaceMuted },
    removeText: { fontSize: 14, color: colors.textMuted },
  }),
);
