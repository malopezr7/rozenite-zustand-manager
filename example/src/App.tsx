import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from './stores/useAuthStore';
import { useCartStore } from './stores/useCartStore';
import { useUiStore } from './stores/useUiStore';

export default function App() {
  const userName = useAuthStore((state) => state.user.name);
  const status = useAuthStore((state) => state.status);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const signOut = useAuthStore((state) => state.signOut);

  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const clear = useCartStore((state) => state.clear);

  const drawerOpen = useUiStore((state) => state.drawerOpen);
  const toggleDrawer = useUiStore((state) => state.toggleDrawer);
  const toast = useUiStore((state) => state.toast);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.kicker}>Rozenite plugin testbed</Text>
        <Text style={styles.title}>Zustand Manager Example</Text>
        <Text style={styles.body}>
          Open React Native DevTools and select the Zustand Manager panel. Press buttons here and inspect live store updates there.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Auth</Text>
          <Text style={styles.value}>{userName} · {status}</Text>
          <View style={styles.row}>
            <Button label="Refresh token" onPress={refreshToken} />
            <Button label="Sign out" onPress={signOut} tone="danger" />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cart</Text>
          <Text style={styles.value}>{items.length} items</Text>
          <View style={styles.row}>
            <Button label="Add item" onPress={addItem} />
            <Button label="Clear" onPress={clear} tone="danger" />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>UI</Text>
          <Text style={styles.value}>drawerOpen: {String(drawerOpen)}</Text>
          <View style={styles.row}>
            <Button label="Toggle drawer" onPress={toggleDrawer} />
            <Button label="Toast" onPress={() => toast(`Toast ${Date.now()}`)} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Button({ label, onPress, tone = 'default' }: { label: string; onPress: () => void; tone?: 'default' | 'danger' }) {
  return (
    <Pressable onPress={onPress} style={[styles.button, tone === 'danger' && styles.buttonDanger]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101114' },
  container: { flex: 1, gap: 16, padding: 20 },
  kicker: { color: '#7f8ea3', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: '#f3f5f7', fontSize: 28, fontWeight: '800' },
  body: { color: '#b8c0cc', fontSize: 15, lineHeight: 22 },
  card: { gap: 10, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#30343b', borderRadius: 14, backgroundColor: '#17191f' },
  cardTitle: { color: '#d7dce5', fontSize: 16, fontWeight: '700' },
  value: { color: '#93a4bc', fontSize: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { minHeight: 40, justifyContent: 'center', borderRadius: 10, backgroundColor: '#4ea7ff', paddingHorizontal: 14 },
  buttonDanger: { backgroundColor: '#d55f4a' },
  buttonText: { color: '#101114', fontSize: 14, fontWeight: '800' },
});
