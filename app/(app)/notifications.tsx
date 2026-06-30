import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type Notification,
} from '@/api/hooks/useNotifications';

const TYPE_ICON: Record<string, string> = {
  PR_ACHIEVED: '🏆',
  COACH_COMMENT: '💬',
  INVITE: '✉️',
  WEEKLY_SUMMARY: '📊',
  BILLING: '💳',
  GOAL_ACHIEVED: '🎯',
  WELCOME: '👋',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function NotificationsScreen() {
  const { colors, direction } = useTheme();
  const { data: notifications = [], isFetching, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  function renderItem({ item }: { item: Notification }) {
    return (
      <TouchableOpacity
        onPress={() => markRead.mutate(item.id)}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        }}
        activeOpacity={0.6}
      >
        <Text style={{ fontSize: 24, lineHeight: 30 }}>
          {TYPE_ICON[item.type] ?? '🔔'}
        </Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              fontFamily: 'Archivo_800ExtraBold',
              fontSize: 13.5,
              color: colors.ink,
              letterSpacing: direction === 'A' ? 0 : -0.1,
            }}
            numberOfLines={2}
          >
            {item.payload?.title ?? item.type}
          </Text>
          {!!item.payload?.body && (
            <Text
              style={{
                fontFamily: 'HankenGrotesk_400Regular',
                fontSize: 13,
                color: colors.ink2,
                lineHeight: 18,
              }}
              numberOfLines={3}
            >
              {item.payload.body}
            </Text>
          )}
        </View>
        <Text
          style={{
            fontFamily: 'HankenGrotesk_500Medium',
            fontSize: 11,
            color: colors.ink3,
            paddingTop: 2,
          }}
        >
          {timeAgo(item.createdAt)}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1.5,
          borderBottomColor: colors.line,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text
              style={{
                fontFamily: 'HankenGrotesk_600SemiBold',
                fontSize: 14,
                color: colors.ink2,
              }}
            >
              ← Voltar
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: 'Archivo_800ExtraBold',
              fontSize: 20,
              letterSpacing: direction === 'A' ? 0 : -0.3,
              color: colors.ink,
            }}
          >
            Notificações
          </Text>
        </View>

        {notifications.length > 0 && (
          <TouchableOpacity
            onPress={() => markAll.mutate()}
            disabled={markAll.isPending}
          >
            <Text
              style={{
                fontFamily: 'HankenGrotesk_600SemiBold',
                fontSize: 12,
                color: colors.ink3,
                textDecorationLine: 'underline',
              }}
            >
              Limpar tudo
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={colors.ink3}
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 32, marginBottom: 12 }}>🔔</Text>
            <Text
              style={{
                fontFamily: 'HankenGrotesk_600SemiBold',
                fontSize: 14,
                color: colors.ink3,
              }}
            >
              Sem notificações não lidas
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
