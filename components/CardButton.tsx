import { Pressable, Text, View } from 'react-native';

export default function CardButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ marginVertical: 8 }}>
      <View style={{ padding: 20, borderRadius: 16, backgroundColor: '#f2f2f7' }}>
        <Text style={{ fontSize: 20, fontWeight: '600' }}>{title}</Text>
      </View>
    </Pressable>
  );
}